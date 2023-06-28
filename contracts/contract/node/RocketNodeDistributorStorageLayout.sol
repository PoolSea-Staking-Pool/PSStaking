pragma solidity 0.7.6;

import "../../interface/PoolseaStorageInterface.sol";

// SPDX-License-Identifier: GPL-3.0-only

abstract contract RocketNodeDistributorStorageLayout {
    PoolseaStorageInterface rocketStorage;
    address nodeAddress;
    uint256 lock;   // Reentrancy guard
}
