pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "../PoolseaBase.sol";
import "./PoolseaNodeDistributorStorageLayout.sol";

contract PoolseaNodeDistributor is PoolseaNodeDistributorStorageLayout {
    bytes32 immutable distributorStorageKey;

    constructor(address _nodeAddress, address _poolseaStorage) {
        poolseaStorage = PoolseaStorageInterface(_poolseaStorage);
        nodeAddress = _nodeAddress;

        // Precompute storage key for poolseaNodeDistributorDelegate
        distributorStorageKey = keccak256(abi.encodePacked("contract.address", "poolseaNodeDistributorDelegate"));
    }

    // Allow contract to receive ETH without making a delegated call
    receive() external payable {}

    // Delegates all transactions to the target supplied during creation
    fallback() external payable {
        address _target = poolseaStorage.getAddress(distributorStorageKey);
        assembly {
            calldatacopy(0x0, 0x0, calldatasize())
            let result := delegatecall(gas(), _target, 0x0, calldatasize(), 0x0, 0)
            returndatacopy(0x0, 0x0, returndatasize())
            switch result case 0 {revert(0, returndatasize())} default {return (0, returndatasize())}
        }
    }
}
