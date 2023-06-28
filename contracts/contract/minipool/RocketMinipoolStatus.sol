pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../RocketBase.sol";
import "../../interface/old/PoolseaMinipoolInterfaceOld.sol";
import "../../interface/minipool/PoolseaMinipoolManagerInterface.sol";
import "../../interface/minipool/PoolseaMinipoolStatusInterface.sol";
import "../../interface/dao/node/PoolseaDAONodeTrustedInterface.sol";
import "../../interface/node/PoolseaNodeStakingInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsMinipoolInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNetworkInterface.sol";
import "../../types/MinipoolStatus.sol";

// Handles updates to minipool status by trusted (oracle) nodes

contract RocketMinipoolStatus is RocketBase, PoolseaMinipoolStatusInterface {

    // Libs
    using SafeMath for uint;

    // Events
    event MinipoolWithdrawableSubmitted(address indexed from, address indexed minipool, uint256 time);
    event MinipoolSetWithdrawable(address indexed minipool, uint256 time);

    // Construct
    constructor(PoolseaStorageInterface _rocketStorageAddress) RocketBase(_rocketStorageAddress) {
        version = 1;
    }

    // Submit a minipool withdrawable event
    // Only accepts calls from trusted (oracle) nodes
    function submitMinipoolWithdrawable(address _minipoolAddress) override external
    onlyLatestContract("rocketMinipoolStatus", address(this)) onlyTrustedNode(msg.sender) onlyRegisteredMinipool(_minipoolAddress) {
        // Load contracts
        PoolseaDAOProtocolSettingsMinipoolInterface rocketDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("rocketDAOProtocolSettingsMinipool"));
        PoolseaDAOProtocolSettingsNetworkInterface rocketDAOProtocolSettingsNetwork = PoolseaDAOProtocolSettingsNetworkInterface(getContractAddress("rocketDAOProtocolSettingsNetwork"));
        // Check settings
        require(rocketDAOProtocolSettingsMinipool.getSubmitWithdrawableEnabled(), "Submitting withdrawable status is currently disabled");
        // Check minipool status
        PoolseaMinipoolInterfaceOld minipool = PoolseaMinipoolInterfaceOld(_minipoolAddress);
        require(minipool.getStatus() == MinipoolStatus.Staking, "Minipool can only be set as withdrawable while staking");
        // Get submission keys
        bytes32 nodeSubmissionKey = keccak256(abi.encodePacked("minipool.withdrawable.submitted.node", msg.sender, _minipoolAddress));
        bytes32 submissionCountKey = keccak256(abi.encodePacked("minipool.withdrawable.submitted.count", _minipoolAddress));
        // Check & update node submission status
        require(!getBool(nodeSubmissionKey), "Duplicate submission from node");
        setBool(nodeSubmissionKey, true);
        setBool(keccak256(abi.encodePacked("minipool.withdrawable.submitted.node", msg.sender, _minipoolAddress)), true);
        // Increment submission count
        uint256 submissionCount = getUint(submissionCountKey).add(1);
        setUint(submissionCountKey, submissionCount);
        // Emit minipool withdrawable status submitted event
        emit MinipoolWithdrawableSubmitted(msg.sender, _minipoolAddress, block.timestamp);
        // Check submission count & set minipool withdrawable
        PoolseaDAONodeTrustedInterface rocketDAONodeTrusted = PoolseaDAONodeTrustedInterface(getContractAddress("rocketDAONodeTrusted"));
        if (calcBase.mul(submissionCount).div(rocketDAONodeTrusted.getMemberCount()) >= rocketDAOProtocolSettingsNetwork.getNodeConsensusThreshold()) {
            setMinipoolWithdrawable(_minipoolAddress);
        }
    }

    // Executes updateBalances if consensus threshold is reached
    function executeMinipoolWithdrawable(address _minipoolAddress) override external
    onlyLatestContract("rocketMinipoolStatus", address(this)) {
        // Load contracts
        PoolseaDAOProtocolSettingsMinipoolInterface rocketDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("rocketDAOProtocolSettingsMinipool"));
        PoolseaDAOProtocolSettingsNetworkInterface rocketDAOProtocolSettingsNetwork = PoolseaDAOProtocolSettingsNetworkInterface(getContractAddress("rocketDAOProtocolSettingsNetwork"));
        // Check settings
        require(rocketDAOProtocolSettingsMinipool.getSubmitWithdrawableEnabled(), "Submitting withdrawable status is currently disabled");
        // Check minipool status
        PoolseaMinipoolInterfaceOld minipool = PoolseaMinipoolInterfaceOld(_minipoolAddress);
        require(minipool.getStatus() == MinipoolStatus.Staking, "Minipool can only be set as withdrawable while staking");
        // Get submission keys
        bytes32 submissionCountKey = keccak256(abi.encodePacked("minipool.withdrawable.submitted.count", _minipoolAddress));
        // Get submission count
        uint256 submissionCount = getUint(submissionCountKey);
        // Check submission count & set minipool withdrawable
        PoolseaDAONodeTrustedInterface rocketDAONodeTrusted = PoolseaDAONodeTrustedInterface(getContractAddress("rocketDAONodeTrusted"));
        require(calcBase.mul(submissionCount).div(rocketDAONodeTrusted.getMemberCount()) >= rocketDAOProtocolSettingsNetwork.getNodeConsensusThreshold(), "Consensus has not been reached");
        setMinipoolWithdrawable(_minipoolAddress);
    }

    // Mark a minipool as withdrawable, record its final balance, and mint node operator rewards
    function setMinipoolWithdrawable(address _minipoolAddress) private {
        // Initialize minipool
        PoolseaMinipoolInterfaceOld minipool = PoolseaMinipoolInterfaceOld(_minipoolAddress);
        // Mark minipool as withdrawable
        minipool.setWithdrawable();
        // Emit set withdrawable event
        emit MinipoolSetWithdrawable(_minipoolAddress, block.timestamp);
    }

}
