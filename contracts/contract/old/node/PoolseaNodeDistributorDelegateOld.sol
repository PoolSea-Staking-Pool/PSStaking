pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../../node/PoolseaNodeDistributorStorageLayout.sol";
import "../../../interface/PoolseaStorageInterface.sol";
import "../../../interface/node/PoolseaNodeManagerInterface.sol";
import "../../../interface/old/PoolseaNodeDistributorInterfaceOld.sol";
import "../../../interface/node/PoolseaNodeStakingInterface.sol";

contract PoolseaNodeDistributorDelegateOld is PoolseaNodeDistributorStorageLayout, PoolseaNodeDistributorInterfaceOld {
    // Import libraries
    using SafeMath for uint256;

    // Events
    event FeesDistributed(address _nodeAddress, uint256 _userAmount, uint256 _nodeAmount, uint256 _time);

    // Constants
    uint8 public constant version = 1;
    uint256 constant calcBase = 1 ether;

    // Precomputed constants
    bytes32 immutable poolseaNodeManagerKey;
    bytes32 immutable poolseaTokenRETHKey;

    constructor() {
        // Precompute storage keys
        poolseaNodeManagerKey = keccak256(abi.encodePacked("contract.address", "poolseaNodeManager"));
        poolseaTokenRETHKey = keccak256(abi.encodePacked("contract.address", "poolseaTokenRETH"));
        // These values must be set by proxy contract as this contract should only be delegatecalled
        poolseaStorage = PoolseaStorageInterface(address(0));
        nodeAddress = address(0);
    }

    function distribute() override external {
        // Get contracts
        PoolseaNodeManagerInterface poolseaNodeManager = PoolseaNodeManagerInterface(poolseaStorage.getAddress(poolseaNodeManagerKey));
        address poolseaTokenRETH = poolseaStorage.getAddress(poolseaTokenRETHKey);
        // Get withdrawal address and the node's average node fee
        address withdrawalAddress = poolseaStorage.getNodeWithdrawalAddress(nodeAddress);
        uint256 averageNodeFee = poolseaNodeManager.getAverageNodeFee(nodeAddress);
        // Calculate what portion of the balance is the node's
        uint256 halfBalance = address(this).balance.div(2);
        uint256 nodeShare = halfBalance.add(halfBalance.mul(averageNodeFee).div(calcBase));
        uint256 userShare = address(this).balance.sub(nodeShare);
        // Transfer user share
        payable(poolseaTokenRETH).transfer(userShare);
        // Transfer node share
        (bool success,) = withdrawalAddress.call{value : address(this).balance}("");
        require(success);
        // Emit event
        emit FeesDistributed(nodeAddress, userShare, nodeShare, block.timestamp);
    }
}
