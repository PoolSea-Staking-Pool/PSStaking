pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./RocketMinipoolOld.sol";
import "../../PoolseaBase.sol";
import "../../../types/MinipoolStatus.sol";
import "../../../types/MinipoolDeposit.sol";
import "../../../interface/dao/node/PoolseaDAONodeTrustedInterface.sol";
import "../../../interface/minipool/PoolseaMinipoolInterface.sol";
import "../../../interface/minipool/PoolseaMinipoolManagerInterface.sol";
import "../../../interface/minipool/PoolseaMinipoolQueueInterface.sol";
import "../../../interface/node/PoolseaNodeStakingInterface.sol";
import "../../../interface/util/AddressSetStorageInterface.sol";
import "../../../interface/node/PoolseaNodeManagerInterface.sol";
import "../../../interface/network/PoolseaNetworkPricesInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsMinipoolInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNodeInterface.sol";
import "../../../interface/old/PoolseaMinipoolFactoryInterfaceOld.sol";

// Minipool creation, removal and management

contract RocketMinipoolFactoryOld is PoolseaBase, PoolseaMinipoolFactoryInterfaceOld {

    // Libs
    using SafeMath for uint;

    // Construct
    constructor(PoolseaStorageInterface _rocketStorageAddress) PoolseaBase(_rocketStorageAddress) {
        version = 1;
    }

    // Returns the bytecode for RocketMinipool
    function getMinipoolBytecode() override public pure returns (bytes memory) {
        return type(RocketMinipoolOld).creationCode;
    }

    // Performs a CREATE2 deployment of a minipool contract with given salt
    function deployContract(address _nodeAddress, MinipoolDeposit _depositType, uint256 _salt) override external onlyLatestContract("rocketMinipoolFactory", address(this)) onlyLatestContract("rocketMinipoolManager", msg.sender) returns (address) {
        // Construct deployment bytecode
        bytes memory creationCode = getMinipoolBytecode();
        bytes memory bytecode = abi.encodePacked(creationCode, abi.encode(poolseaStorage, _nodeAddress, _depositType));
        // Construct final salt
        uint256 salt = uint256(keccak256(abi.encodePacked(_nodeAddress, _salt)));
        // CREATE2 deployment
        address contractAddress;
        uint256 codeSize;
        assembly {
            contractAddress := create2(
            0,
            add(bytecode, 0x20),
            mload(bytecode),
            salt
            )

            codeSize := extcodesize(contractAddress)
        }
        // Ensure deployment was successful
        require(codeSize > 0, "Contract creation failed");
        // Return address
        return contractAddress;
    }

}
