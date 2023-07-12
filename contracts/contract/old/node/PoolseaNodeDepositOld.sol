pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../../PoolseaBase.sol";
import "../../../interface/deposit/PoolseaDepositPoolInterface.sol";
import "../../../interface/minipool/PoolseaMinipoolInterface.sol";
import "../../../interface/old/PoolseaMinipoolManagerInterfaceOld.sol";
import "../../../interface/network/PoolseaNetworkFeesInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsDepositInterface.sol";
import "../../../interface/old/PoolseaDAOProtocolSettingsMinipoolInterfaceOld.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNodeInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNetworkInterface.sol";
import "../../../interface/dao/node/PoolseaDAONodeTrustedInterface.sol";
import "../../../interface/dao/node/settings/PoolseaDAONodeTrustedSettingsMembersInterface.sol";
import "../../../types/MinipoolDeposit.sol";
import "../../../interface/node/PoolseaNodeManagerInterface.sol";
import "../../../interface/old/PoolseaNodeDepositInterfaceOld.sol";
import "../../../interface/old/PoolseaMinipoolInterfaceOld.sol";

// Handles node deposits and minipool creation

contract PoolseaNodeDepositOld is PoolseaBase, PoolseaNodeDepositInterfaceOld {

    // Libs
    using SafeMath for uint;

    // Events
    event DepositReceived(address indexed from, uint256 amount, uint256 time);

    // Construct
    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 2;
    }

    // Accept a node deposit and create a new minipool under the node
    // Only accepts calls from registered nodes
    function deposit(uint256 _minimumNodeFee, bytes calldata _validatorPubkey, bytes calldata _validatorSignature, bytes32 _depositDataRoot, uint256 _salt, address _expectedMinipoolAddress) override external payable onlyLatestContract("poolseaNodeDeposit", address(this)) onlyRegisteredNode(msg.sender) {
        // Load contracts
        PoolseaMinipoolManagerInterfaceOld poolseaMinipoolManager = PoolseaMinipoolManagerInterfaceOld(getContractAddress("poolseaMinipoolManager"));
        // Check deposits are enabled
        checkDepositsEnabled();
        // Check minipool doesn't exist or previously exist
        require(!poolseaMinipoolManager.getMinipoolExists(_expectedMinipoolAddress) && !poolseaMinipoolManager.getMinipoolDestroyed(_expectedMinipoolAddress), "Minipool already exists or was previously destroyed");
        {
            // Check node has initialised their fee distributor
            PoolseaNodeManagerInterface poolseaNodeManager = PoolseaNodeManagerInterface(getContractAddress("poolseaNodeManager"));
            require(poolseaNodeManager.getFeeDistributorInitialised(msg.sender), "Fee distributor not initialised");
        }
        // Check node fee
        checkNodeFee(_minimumNodeFee);
        // Get Deposit type
        MinipoolDeposit depositType = getDepositType(msg.value);
        // Check it's a valid deposit size
        require(depositType != MinipoolDeposit.None, "Invalid node deposit amount");
        // Emit deposit received event
        emit DepositReceived(msg.sender, msg.value, block.timestamp);
        // Create minipool
        PoolseaMinipoolInterfaceOld minipool = PoolseaMinipoolInterfaceOld(address(poolseaMinipoolManager.createMinipool(msg.sender, depositType, _salt)));
        // Ensure minipool address matches expected
        require(address(minipool) == _expectedMinipoolAddress, "Unexpected minipool address");
        // Transfer deposit to minipool
        minipool.nodeDeposit{value: msg.value}(_validatorPubkey, _validatorSignature, _depositDataRoot);
        // Assign deposits if enabled
        assignDeposits();
    }

    // Returns the minipool deposit enum value correseponding to the supplied deposit amount
    function getDepositType(uint256 _amount) public override view returns (MinipoolDeposit) {
        // Get contract
        PoolseaDAOProtocolSettingsMinipoolInterfaceOld poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterfaceOld(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        // Get deposit type by node deposit amount
        if (_amount == poolseaDAOProtocolSettingsMinipool.getFullDepositNodeAmount()) { return MinipoolDeposit.Full; }
        else if (_amount == poolseaDAOProtocolSettingsMinipool.getHalfDepositNodeAmount()) { return MinipoolDeposit.Half; }
        // Invalid deposit amount
        return MinipoolDeposit.None;
    }

    function checkNodeFee(uint256 _minimumNodeFee) private view {
        // Load contracts
        PoolseaNetworkFeesInterface poolseaNetworkFees = PoolseaNetworkFeesInterface(getContractAddress("poolseaNetworkFees"));
        // Check current node fee
        uint256 nodeFee = poolseaNetworkFees.getNodeFee();
        require(nodeFee >= _minimumNodeFee, "Minimum node fee exceeds current network node fee");
    }

    function checkDepositsEnabled() private view {
        // Get contracts
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Check node settings
        require(poolseaDAOProtocolSettingsNode.getDepositEnabled(), "Node deposits are currently disabled");
    }

    function assignDeposits() private {
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        if (poolseaDAOProtocolSettingsDeposit.getAssignDepositsEnabled()) {
            PoolseaDepositPoolInterface poolseaDepositPool = PoolseaDepositPoolInterface(getContractAddress("poolseaDepositPool"));
            poolseaDepositPool.assignDeposits();
        }
    }
}
