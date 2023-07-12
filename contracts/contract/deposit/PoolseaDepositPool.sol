// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/utils/SafeCast.sol";

import "../PoolseaBase.sol";
import "../../interface/PoolseaVaultInterface.sol";
import "../../interface/PoolseaVaultWithdrawerInterface.sol";
import "../../interface/deposit/PoolseaDepositPoolInterface.sol";
import "../../interface/minipool/PoolseaMinipoolInterface.sol";
import "../../interface/minipool/PoolseaMinipoolQueueInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsDepositInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsMinipoolInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNetworkInterface.sol";
import "../../interface/token/PoolseaTokenRPLSInterface.sol";
import "../../types/MinipoolDeposit.sol";

/// @notice Accepts user deposits and mints rETH; handles assignment of deposited ETH to minipools
contract PoolseaDepositPool is PoolseaBase, PoolseaDepositPoolInterface, PoolseaVaultWithdrawerInterface {

    // Libs
    using SafeMath for uint256;
    using SignedSafeMath for int256;
    using SafeCast for uint256;

    // Immutables
    PoolseaVaultInterface immutable poolseaVault;
    PoolseaTokenRPLSInterface immutable poolseaTokenRETH;

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

    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 3;

        // Pre-retrieve non-upgradable contract addresses to save gas
        poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        poolseaTokenRETH = PoolseaTokenRPLSInterface(getContractAddress("poolseaTokenRETH"));
    }

    /// @notice Returns the current deposit pool balance
    function getBalance() override public view returns (uint256) {
        return poolseaVault.balanceOf("poolseaDepositPool");
    }

    /// @notice Returns the amount of ETH contributed to the deposit pool by node operators waiting in the queue
    function getNodeBalance() override public view returns (uint256) {
        return getUint("deposit.pool.node.balance");
    }

    /// @notice Returns the user owned portion of the deposit pool (negative indicates more ETH has been "lent" to the
    ///         deposit pool by node operators in the queue than is available from user deposits)
    function getUserBalance() override public view returns (int256) {
        return getBalance().toInt256().sub(getNodeBalance().toInt256());
    }

    /// @notice Excess deposit pool balance (in excess of minipool queue capacity)
    function getExcessBalance() override public view returns (uint256) {
        // Get minipool queue capacity
        PoolseaMinipoolQueueInterface poolseaMinipoolQueue = PoolseaMinipoolQueueInterface(getContractAddress("poolseaMinipoolQueue"));
        uint256 minipoolCapacity = poolseaMinipoolQueue.getEffectiveCapacity();
        uint256 balance = getBalance();
        // Calculate and return
        if (minipoolCapacity >= balance) { return 0; }
        else { return balance.sub(minipoolCapacity); }
    }

    /// @dev Callback required to receive ETH withdrawal from the vault
    function receiveVaultWithdrawalETH() override external payable onlyThisLatestContract onlyLatestContract("poolseaVault", msg.sender) {}

    /// @notice Deposits ETH into Poolsea Pool and mints the corresponding amount of rETH to the caller
    function deposit() override external payable onlyThisLatestContract {
        // Check deposit settings
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        require(poolseaDAOProtocolSettingsDeposit.getDepositEnabled(), "Deposits into Poolsea Pool are currently disabled");
        require(msg.value >= poolseaDAOProtocolSettingsDeposit.getMinimumDeposit(), "The deposited amount is less than the minimum deposit size");
        /*
            Check if deposit exceeds limit based on current deposit size and minipool queue capacity.

            The deposit pool can, at most, accept a deposit that, after assignments, matches ETH to every minipool in
            the queue and leaves the deposit pool with maximumDepositPoolSize ETH.

            capacityNeeded = depositPoolBalance + msg.value
            maxCapacity = maximumDepositPoolSize + queueEffectiveCapacity
            assert(capacityNeeded <= maxCapacity)
        */
        uint256 capacityNeeded = getBalance().add(msg.value);
        uint256 maxDepositPoolSize = poolseaDAOProtocolSettingsDeposit.getMaximumDepositPoolSize();
        if (capacityNeeded > maxDepositPoolSize) {
            // Doing a conditional require() instead of a single one optimises for the common
            // case where capacityNeeded fits in the deposit pool without looking at the queue
            if (poolseaDAOProtocolSettingsDeposit.getAssignDepositsEnabled()) {
                PoolseaMinipoolQueueInterface poolseaMinipoolQueue = PoolseaMinipoolQueueInterface(getContractAddress("poolseaMinipoolQueue"));
                require(capacityNeeded <= maxDepositPoolSize.add(poolseaMinipoolQueue.getEffectiveCapacity()),
                    "The deposit pool size after depositing (and matching with minipools) exceeds the maximum size");
            } else {
                revert("The deposit pool size after depositing exceeds the maximum size");
            }
        }
        // Calculate deposit fee
        uint256 depositFee = msg.value.mul(poolseaDAOProtocolSettingsDeposit.getDepositFee()).div(calcBase);
        uint256 depositNet = msg.value.sub(depositFee);
        // Mint rETH to user account
        poolseaTokenRETH.mint(depositNet, msg.sender);
        // Emit deposit received event
        emit DepositReceived(msg.sender, msg.value, block.timestamp);
        // Process deposit
        processDeposit(poolseaDAOProtocolSettingsDeposit);
    }

    /// @notice Returns the maximum amount that can be accepted into the deposit pool at this time in wei
    function getMaximumDepositAmount() override external view returns (uint256) {
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // If deposits are enabled max deposit is 0
        if (!poolseaDAOProtocolSettingsDeposit.getDepositEnabled()) {
            return 0;
        }
        uint256 depositPoolBalance = getBalance();
        uint256 maxCapacity = poolseaDAOProtocolSettingsDeposit.getMaximumDepositPoolSize();
        // When assignments are enabled, we can accept the max amount plus whatever space is available in the minipool queue
        if (poolseaDAOProtocolSettingsDeposit.getAssignDepositsEnabled()) {
            PoolseaMinipoolQueueInterface poolseaMinipoolQueue = PoolseaMinipoolQueueInterface(getContractAddress("poolseaMinipoolQueue"));
            maxCapacity = maxCapacity.add(poolseaMinipoolQueue.getEffectiveCapacity());
        }
        // Check we aren't already over
        if (depositPoolBalance >= maxCapacity) {
            return 0;
        }
        return maxCapacity.sub(depositPoolBalance);
    }

    /// @dev Accepts ETH deposit from the node deposit contract (does not mint rETH)
    /// @param _totalAmount The total node deposit amount including any credit balance used
    function nodeDeposit(uint256 _totalAmount) override external payable onlyThisLatestContract onlyLatestContract("poolseaNodeDeposit", msg.sender) {
        // Deposit ETH into the vault
        if (msg.value > 0) {
            poolseaVault.depositEther{value: msg.value}();
        }
        // Increase recorded node balance
        addUint("deposit.pool.node.balance", _totalAmount);
    }

    /// @dev Withdraws ETH from the deposit pool to PoolseaNodeDeposit contract to be used for a new minipool
    /// @param _amount The amount of ETH to withdraw
    function nodeCreditWithdrawal(uint256 _amount) override external onlyThisLatestContract onlyLatestContract("poolseaNodeDeposit", msg.sender) {
        // Withdraw ETH from the vault
        poolseaVault.withdrawEther(_amount);
        // Send it to msg.sender (function modifier verifies msg.sender is PoolseaNodeDeposit)
        (bool success, ) = address(msg.sender).call{value: _amount}("");
        require(success, "Failed to send ETH");
    }

    /// @dev Recycle a deposit from a dissolved minipool
    function recycleDissolvedDeposit() override external payable onlyThisLatestContract onlyRegisteredMinipool(msg.sender) {
        // Load contracts
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Recycle ETH
        emit DepositRecycled(msg.sender, msg.value, block.timestamp);
        processDeposit(poolseaDAOProtocolSettingsDeposit);
    }

    /// @dev Recycle excess ETH from the rETH token contract
    function recycleExcessCollateral() override external payable onlyThisLatestContract onlyLatestContract("poolseaTokenRETH", msg.sender) {
        // Load contracts
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Recycle ETH
        emit DepositRecycled(msg.sender, msg.value, block.timestamp);
        processDeposit(poolseaDAOProtocolSettingsDeposit);
    }

    /// @dev Recycle a liquidated RPL stake from a slashed minipool
    function recycleLiquidatedStake() override external payable onlyThisLatestContract onlyLatestContract("poolseaAuctionManager", msg.sender) {
        // Load contracts
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Recycle ETH
        emit DepositRecycled(msg.sender, msg.value, block.timestamp);
        processDeposit(poolseaDAOProtocolSettingsDeposit);
    }

    /// @dev Process a deposit
    function processDeposit(PoolseaDAOProtocolSettingsDepositInterface _poolseaDAOProtocolSettingsDeposit) private {
        // Transfer ETH to vault
        poolseaVault.depositEther{value: msg.value}();
        // Assign deposits if enabled
        _assignDeposits(_poolseaDAOProtocolSettingsDeposit);
    }

    /// @notice Assign deposits to available minipools. Reverts if assigning deposits is disabled.
    function assignDeposits() override external onlyThisLatestContract {
        // Load contracts
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Revert if assigning is disabled
        require(_assignDeposits(poolseaDAOProtocolSettingsDeposit), "Deposit assignments are currently disabled");
    }

    /// @dev Assign deposits to available minipools. Does nothing if assigning deposits is disabled.
    function maybeAssignDeposits() override external onlyThisLatestContract returns (bool) {
        // Load contracts
        PoolseaDAOProtocolSettingsDepositInterface poolseaDAOProtocolSettingsDeposit = PoolseaDAOProtocolSettingsDepositInterface(getContractAddress("poolseaDAOProtocolSettingsDeposit"));
        // Revert if assigning is disabled
        return _assignDeposits(poolseaDAOProtocolSettingsDeposit);
    }

    /// @dev Assigns deposits to available minipools, returns false if assignment is currently disabled
    function _assignDeposits(PoolseaDAOProtocolSettingsDepositInterface _poolseaDAOProtocolSettingsDeposit) private returns (bool) {
        // Check if assigning deposits is enabled
        if (!_poolseaDAOProtocolSettingsDeposit.getAssignDepositsEnabled()) {
            return false;
        }
        // Load contracts
        PoolseaMinipoolQueueInterface poolseaMinipoolQueue = PoolseaMinipoolQueueInterface(getContractAddress("poolseaMinipoolQueue"));
        // Decide which queue processing implementation to use based on queue contents
        if (poolseaMinipoolQueue.getContainsLegacy()) {
            return _assignDepositsLegacy(poolseaMinipoolQueue, _poolseaDAOProtocolSettingsDeposit);
        } else {
            return _assignDepositsNew(poolseaMinipoolQueue, _poolseaDAOProtocolSettingsDeposit);
        }
    }

    /// @dev Assigns deposits using the new minipool queue
    function _assignDepositsNew(PoolseaMinipoolQueueInterface _poolseaMinipoolQueue, PoolseaDAOProtocolSettingsDepositInterface _poolseaDAOProtocolSettingsDeposit) private returns (bool) {
        // Load contracts
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        // Calculate the number of minipools to assign
        uint256 maxAssignments = _poolseaDAOProtocolSettingsDeposit.getMaximumDepositAssignments();
        uint256 variableDepositAmount = poolseaDAOProtocolSettingsMinipool.getVariableDepositAmount();
        uint256 scalingCount = msg.value.div(variableDepositAmount);
        uint256 totalEthCount = getBalance().div(variableDepositAmount);
        uint256 assignments = _poolseaDAOProtocolSettingsDeposit.getMaximumDepositSocialisedAssignments().add(scalingCount);
        if (assignments > totalEthCount) {
            assignments = totalEthCount;
        }
        if (assignments > maxAssignments) {
            assignments = maxAssignments;
        }
        address[] memory minipools = _poolseaMinipoolQueue.dequeueMinipools(assignments);
        if (minipools.length > 0){
            // Withdraw ETH from vault
            uint256 totalEther = minipools.length.mul(variableDepositAmount);
            poolseaVault.withdrawEther(totalEther);
            uint256 nodeBalanceUsed = 0;
            // Loop over minipools and deposit the amount required to reach launch balance
            for (uint256 i = 0; i < minipools.length; i++) {
                PoolseaMinipoolInterface minipool = PoolseaMinipoolInterface(minipools[i]);
                // Assign deposit to minipool
                minipool.deposit{value: variableDepositAmount}();
                nodeBalanceUsed = nodeBalanceUsed.add(minipool.getNodeTopUpValue());
                // Emit deposit assigned event
                emit DepositAssigned(minipools[i], variableDepositAmount, block.timestamp);
            }
            // Decrease node balance
            subUint("deposit.pool.node.balance", nodeBalanceUsed);
        }
        return true;
    }

    /// @dev Assigns deposits using the legacy minipool queue
    function _assignDepositsLegacy(PoolseaMinipoolQueueInterface _poolseaMinipoolQueue, PoolseaDAOProtocolSettingsDepositInterface _poolseaDAOProtocolSettingsDeposit) private returns (bool) {
        // Load contracts
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        // Setup initial variable values
        uint256 balance = getBalance();
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
                (depositType, count) = _poolseaMinipoolQueue.getNextDepositLegacy();
                if (depositType == MinipoolDeposit.None) { break; }
                minipoolCapacity = poolseaDAOProtocolSettingsMinipool.getDepositUserAmount(depositType);
            }
            count--;
            if (minipoolCapacity == 0 || balance.sub(totalEther) < minipoolCapacity) { break; }
            // Dequeue the minipool
            address minipoolAddress = _poolseaMinipoolQueue.dequeueMinipoolByDepositLegacy(depositType);
            // Update running total
            totalEther = totalEther.add(minipoolCapacity);
            // Add assignment
            assignments[i].etherAssigned = minipoolCapacity;
            assignments[i].minipoolAddress = minipoolAddress;
        }
        if (totalEther > 0) {
            // Withdraw ETH from vault
            poolseaVault.withdrawEther(totalEther);
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

    /// @dev Withdraw excess deposit pool balance for rETH collateral
    /// @param _amount The amount of excess ETH to withdraw
    function withdrawExcessBalance(uint256 _amount) override external onlyThisLatestContract onlyLatestContract("poolseaTokenRETH", msg.sender) {
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
