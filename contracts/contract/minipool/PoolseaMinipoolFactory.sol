// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "../PoolseaBase.sol";
import "../../interface/minipool/PoolseaMinipoolBaseInterface.sol";
import "../../interface/minipool/PoolseaMinipoolFactoryInterface.sol";

/// @notice Performs CREATE2 deployment of minipool contracts
contract PoolseaMinipoolFactory is PoolseaBase, PoolseaMinipoolFactoryInterface {

    // Libs
    using SafeMath for uint;
    using Clones for address;

    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 2;
    }

    /// @notice Returns the expected minipool address for a node operator given a user-defined salt
    /// @param _salt The salt used in minipool creation
    function getExpectedAddress(address _nodeOperator, uint256 _salt) external override view returns (address) {
        // Ensure poolseaMinipoolBase is setAddress
        address poolseaMinipoolBase = poolseaStorage.getAddress(keccak256(abi.encodePacked("contract.address", "poolseaMinipoolBase")));
        // Calculate node specific salt value
        bytes32 salt = keccak256(abi.encodePacked(_nodeOperator, _salt));
        // Return expected address
        return poolseaMinipoolBase.predictDeterministicAddress(salt, address(this));
    }

    /// @notice Performs a CREATE2 deployment of a minipool contract with given salt
    /// @param _nodeAddress Owning node operator's address
    /// @param _salt A salt used in determining minipool address
    function deployContract(address _nodeAddress, uint256 _salt) override external onlyLatestContract("poolseaMinipoolFactory", address(this)) onlyLatestContract("poolseaMinipoolManager", msg.sender) returns (address) {
        // Ensure poolseaMinipoolBase is setAddress
        address poolseaMinipoolBase = poolseaStorage.getAddress(keccak256(abi.encodePacked("contract.address", "poolseaMinipoolBase")));
        require(poolseaMinipoolBase != address(0));
        // Construct final salt
        bytes32 salt = keccak256(abi.encodePacked(_nodeAddress, _salt));
        // Deploy the minipool
        address proxy = poolseaMinipoolBase.cloneDeterministic(salt);
        // Initialise the minipool storage
        PoolseaMinipoolBaseInterface(proxy).initialise(address(poolseaStorage), _nodeAddress);
        // Return address
        return proxy;
    }

}
