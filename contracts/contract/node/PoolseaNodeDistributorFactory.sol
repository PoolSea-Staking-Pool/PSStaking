pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "../PoolseaBase.sol";
import "./PoolseaNodeDistributor.sol";
import "./PoolseaNodeDistributorStorageLayout.sol";
import "../../interface/node/PoolseaNodeDistributorFactoryInterface.sol";

contract PoolseaNodeDistributorFactory is PoolseaBase, PoolseaNodeDistributorFactoryInterface {
    // Events
    event ProxyCreated(address _address);

    // Construct
    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 1;
    }

    function getProxyBytecode() override public pure returns (bytes memory) {
        return type(PoolseaNodeDistributor).creationCode;
    }

    // Calculates the predetermined distributor contract address from given node address
    function getProxyAddress(address _nodeAddress) override external view returns(address) {
        bytes memory contractCode = getProxyBytecode();
        bytes memory initCode = abi.encodePacked(contractCode, abi.encode(_nodeAddress, poolseaStorage));

        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), uint256(0), keccak256(initCode)));

        return address(uint160(uint(hash)));
    }

    // Uses CREATE2 to deploy a PoolseaNodeDistributor at predetermined address
    function createProxy(address _nodeAddress) override external onlyLatestContract("poolseaNodeManager", msg.sender) {
        // Salt is not required as the initCode is already unique per node address (node address is constructor argument)
        PoolseaNodeDistributor dist = new PoolseaNodeDistributor{salt: ''}(_nodeAddress, address(poolseaStorage));
        emit ProxyCreated(address(dist));
    }
}
