// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";

import "../PoolseaBase.sol";
import "../../interface/deposit/PoolseaDepositPoolInterface.sol";
import "../../interface/minipool/PoolseaMinipoolQueueInterface.sol";
import "../../interface/network/PoolseaNetworkFeesInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNetworkInterface.sol";

/// @notice Network node demand and commission rate
contract PoolseaNetworkFees is PoolseaBase, PoolseaNetworkFeesInterface {

    // Libs
    using SafeMath for uint;
    using SafeCast for uint;

    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 2;
    }

    /// @notice Returns the current RP network node demand in ETH
    ///         Node demand is equal to deposit pool balance minus available minipool capacity
    function getNodeDemand() override public view returns (int256) {
        // Load contracts
        PoolseaDepositPoolInterface poolseaDepositPool = PoolseaDepositPoolInterface(getContractAddress("poolseaDepositPool"));
        PoolseaMinipoolQueueInterface poolseaMinipoolQueue = PoolseaMinipoolQueueInterface(getContractAddress("poolseaMinipoolQueue"));
        // Calculate & return
        int256 depositPoolBalance = poolseaDepositPool.getBalance().toInt256();
        int256 minipoolCapacity = poolseaMinipoolQueue.getEffectiveCapacity().toInt256();
        int256 demand = depositPoolBalance - minipoolCapacity;
        require(demand <= depositPoolBalance);
        return demand;
    }

    /// @notice Returns the current RP network node fee as a fraction of 1 ETH
    function getNodeFee() override external view returns (uint256) {
        return getNodeFeeByDemand(getNodeDemand());
    }

    /// @notice Returns the network node fee for a given node demand value
    /// @param _nodeDemand The node demand to calculate the fee for
    function getNodeFeeByDemand(int256 _nodeDemand) override public view returns (uint256) {
        // Calculation base values
        uint256 demandDivisor = 1000000000000;
        // Get settings
        PoolseaDAOProtocolSettingsNetworkInterface poolseaDAOProtocolSettingsNetwork = PoolseaDAOProtocolSettingsNetworkInterface(getContractAddress("poolseaDAOProtocolSettingsNetwork"));
        uint256 minFee = poolseaDAOProtocolSettingsNetwork.getMinimumNodeFee();
        uint256 targetFee = poolseaDAOProtocolSettingsNetwork.getTargetNodeFee();
        uint256 maxFee = poolseaDAOProtocolSettingsNetwork.getMaximumNodeFee();
        uint256 demandRange = poolseaDAOProtocolSettingsNetwork.getNodeFeeDemandRange();
        // Normalize node demand
        uint256 nNodeDemand;
        bool nNodeDemandSign;
        if (_nodeDemand < 0) {
            nNodeDemand = uint256(-_nodeDemand);
            nNodeDemandSign = false;
        } else {
            nNodeDemand = uint256(_nodeDemand);
            nNodeDemandSign = true;
        }
        nNodeDemand = nNodeDemand.mul(calcBase).div(demandRange);
        // Check range bounds
        if (nNodeDemand == 0) { return targetFee; }
        if (nNodeDemand >= calcBase) {
            if (nNodeDemandSign) { return maxFee; }
            return minFee;
        }
        // Get fee interpolation factor
        uint256 t = nNodeDemand.div(demandDivisor) ** 3;
        // Interpolate between min / target / max fee
        if (nNodeDemandSign) { return targetFee.add(maxFee.sub(targetFee).mul(t).div(calcBase)); }
        return minFee.add(targetFee.sub(minFee).mul(calcBase.sub(t)).div(calcBase));
    }

}
