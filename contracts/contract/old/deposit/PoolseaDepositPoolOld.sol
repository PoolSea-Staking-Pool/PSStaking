pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../../PoolseaBase.sol";
import "../../../interface/PoolseaVaultInterface.sol";
import "../../../interface/PoolseaVaultWithdrawerInterface.sol";
import "../../../interface/old/PoolseaDepositPoolInterfaceOld.sol";
import "../../../interface/minipool/PoolseaMinipoolInterface.sol";
import "../../../interface/old/PoolseaMinipoolQueueInterfaceOld.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsDepositInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsMinipoolInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNetworkInterface.sol";
import "../../../interface/token/PoolseaTokenRETHInterface.sol";
import "../../../types/MinipoolDeposit.sol";

// The main entry point for deposits into the RP network
// Accepts user deposits and mints rETH; handles assignment of deposited ETH to minipools

contract PoolseaDepositPoolOld is PoolseaBase, PoolseaDepositPoolInterfaceOld, PoolseaVaultWithdrawerInterface {

    // Libs
    using SafeMath for uint;

    // Events
    event DepositReceived(address indexed from, uint256 amount, uint256 time);
    event DepositRecycled(address indexed from, uint256 amount, uint256 time);
    event DepositAssigned(address indexed minipool, uint256 amount, uint256 time);
    event ExcessWithdrawn(address indexed to, uint256 amount, uint256 time);


    // Structs
    struct MinipoolAssignment {
        address minipoolAddress;
        uint256 etherAssigned;
    }

    // Modifiers
    modifier onlyThisLatestContract() {
        // Compiler can optimise out this keccak at compile time
        require(address(this) == getAddress(keccak256("contract.addresspoolseaDepositPool")), "Invalid or outdated contract");
        _;
    }

    // Construct
    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 2;
    }

    // Current deposit pool balance
    function getBalance() override public view returns (uint256) {
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        return poolseaVault.balanceOf("poolseaDepositPool");
    }

    // Excess deposit pool balance (in excess of minipool queue capacity)
    function getExcessBalance() override public view returns (uint256) {
        // Get minipool queue capacity
        PoolseaMinipoolQueueInterfaceOld poolseaMinipoolQueue = PoolseaMinipoolQueueInterfaceOld(getContractAddress("poolseaMinipoolQueue"));
        uint256 minipoolCapacity = poolseaMinipoolQueue.getEffectiveCapacity();
        // Calculate and return
        uint256 balance = getBalance();
        if (minipoolCapacity >= balance) { return 0; }
        else { return balance.sub(minipoolCapacity); }
    }

    // Receive a vault withdrawal
    // Only accepts calls from the PoolseaVault contract
    function receiveVaultWithdrawalETH() override external payable onlyThisLatestContract onlyLatestContract("poolseaVault", msg.sender) {}

    // Accept a deposit from a user
    function deposit() override external payable onlyThisLatestContract {
        // Check deposit settings
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        require(poolseaDAOProtocolSettingsDeposit.getDepositEnabled(), "Deposits into Poolsea Pool are currently disabled");
        require(msg.value >= poolseaDAOProtocolSettingsDeposit.getMinimumDeposit(), "The deposited amount is less than the minimum deposit size");
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        require(poolseaVault.balanceOf("poolseaDepositPool").add(msg.value) <= poolseaDAOProtocolSettingsDeposit.getMaximumDepositPoolSize(), "The deposit pool size after depositing exceeds the maximum size");
        // Calculate deposit fee
        uint256 depositFee = msg.value.mul(poolseaDAOProtocolSettingsDeposit.getDepositFee()).div(calcBase);
        uint256 depositNet = msg.value.sub(depositFee);
        // Mint rETH to user account
        PoolseaTokenRETHInterface poolseaTokenRETH = PoolseaTokenRETHInterface(getContractAddress("poolseaTokenRETH"));
        poolseaTokenRETH.mint(depositNet, msg.sender);
        // Emit deposit received event
        emit DepositReceived(msg.sender, msg.value, block.timestamp);
        // Process deposit
        processDeposit(poolseaVault, poolseaDAOProtocolSettingsDeposit);
    }

    // Recycle a deposit from a dissolved minipool
    // Only accepts calls from registered minipools
    function recycleDissolvedDeposit() override external payable onlyThisLatestContract onlyRegisteredMinipool(msg.sender) {
        // Load contracts
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Recycle ETH
        emit DepositRecycled(msg.sender, msg.value, block.timestamp);
        processDeposit(poolseaVault, poolseaDAOProtocolSettingsDeposit);
    }

    // Recycle excess ETH from the rETH token contract
    function recycleExcessCollateral() override external payable onlyThisLatestContract onlyLatestContract("poolseaTokenRETH", msg.sender) {
        // Load contracts
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Recycle ETH
        emit DepositRecycled(msg.sender, msg.value, block.timestamp);
        processDeposit(poolseaVault, poolseaDAOProtocolSettingsDeposit);
    }

    // Recycle a liquidated RPL stake from a slashed minipool
    // Only accepts calls from the PoolseaAuctionManager contract
    function recycleLiquidatedStake() override external payable onlyThisLatestContract onlyLatestContract("poolseaAuctionManager", msg.sender) {
        // Load contracts
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Recycle ETH
        emit DepositRecycled(msg.sender, msg.value, block.timestamp);
        processDeposit(poolseaVault, poolseaDAOProtocolSettingsDeposit);
    }

    // Process a deposit
    function processDeposit(PoolseaVaultInterface _poolseaVault, PoolseaDAOProtocolSettingsDepositInterface _poolseaDAOProtocolSettingsDeposit) private {
        // Transfer ETH to vault
        _poolseaVault.depositEther{value: msg.value}();
        // Assign deposits if enabled
        _assignDeposits(_poolseaVault, _poolseaDAOProtocolSettingsDeposit);
    }

    // Assign deposits to available minipools
    function assignDeposits() override external onlyThisLatestContract {
        // Load contracts
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Revert if assigning is disabled
        require(_assignDeposits(poolseaVault, poolseaDAOProtocolSettingsDeposit), "Deposit assignments are currently disabled");
    }

    // Assigns deposits to available minipools, returns false if assignment is currently disabled
    function _assignDeposits(PoolseaVaultInterface _poolseaVault, PoolseaDAOProtocolSettingsDepositInterface _poolseaDAOProtocolSettingsDeposit) private returns (bool) {
        // Check if assigning deposits is enabled
        if (!_poolseaDAOProtocolSettingsDeposit.getAssignDepositsEnabled()) {
            return false;
        }
        // Load contracts
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        PoolseaMinipoolQueueInterfaceOld poolseaMinipoolQueue = PoolseaMinipoolQueueInterfaceOld(getContractAddress("poolseaMinipoolQueue"));
        // Setup initial variable values
        uint256 balance = _poolseaVault.balanceOf("poolseaDepositPool");
        uint256 totalEther = 0;
        // Calculate minipool assignments
        uint256 maxAssignments = _poolseaDAOProtocolSettingsDeposit.getMaximumDepositAssignments();
        MinipoolAssignment[] memory assignments = new MinipoolAssignment[](maxAssignments);
        MinipoolDeposit depositType = MinipoolDeposit.None;
        uint256 count = 0;
        uint256 minipoolCapacity = 0;
        for (uint256 i = 0; i < maxAssignments; ++i) {
            // Optimised for multiple of the same deposit type
            if (count == 0) {
                (depositType, count) = poolseaMinipoolQueue.getNextDeposit();
                if (depositType == MinipoolDeposit.None) { break; }
                minipoolCapacity = poolseaDAOProtocolSettingsMinipool.getDepositUserAmount(depositType);
            }
            count--;
            if (minipoolCapacity == 0 || balance.sub(totalEther) < minipoolCapacity) { break; }
            // Dequeue the minipool
            address minipoolAddress = poolseaMinipoolQueue.dequeueMinipoolByDeposit(depositType);
            // Update running total
            totalEther = totalEther.add(minipoolCapacity);
            // Add assignment
            assignments[i].etherAssigned = minipoolCapacity;
            assignments[i].minipoolAddress = minipoolAddress;
        }
        if (totalEther > 0) {
            // Withdraw ETH from vault
            _poolseaVault.withdrawEther(totalEther);
            // Perform assignments
            for (uint256 i = 0; i < maxAssignments; ++i) {
                if (assignments[i].etherAssigned == 0) { break; }
                PoolseaMinipoolInterface minipool = PoolseaMinipoolInterface(assignments[i].minipoolAddress);
                // Assign deposit to minipool
                minipool.userDeposit{value: assignments[i].etherAssigned}();
                // Emit deposit assigned event
                emit DepositAssigned(assignments[i].minipoolAddress, assignments[i].etherAssigned, block.timestamp);
            }
        }
        return true;
    }

    // Withdraw excess deposit pool balance for rETH collateral
    function withdrawExcessBalance(uint256 _amount) override external onlyThisLatestContract onlyLatestContract("poolseaTokenRETH", msg.sender) {
        // Load contracts
        PoolseaTokenRETHInterface poolseaTokenRETH = PoolseaTokenRETHInterface(getContractAddress("poolseaTokenRETH"));
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        // Check amount
        require(_amount <= getExcessBalance(), "Insufficient excess balance for withdrawal");
        // Withdraw ETH from vault
        poolseaVault.withdrawEther(_amount);
        // Transfer to rETH contract
        poolseaTokenRETH.depositExcess{value: _amount}();
        // Emit excess withdrawn event
        emit ExcessWithdrawn(msg.sender, _amount, block.timestamp);
    }
}
