// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.7.6;
pragma abicoder v2;

import "../PoolseaBase.sol";

import "../minipool/PoolseaMinipoolManager.sol";
import "../node/PoolseaNodeManager.sol";
import "../node/PoolseaNodeDistributorFactory.sol";
import "../node/PoolseaNodeDistributorDelegate.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNetworkInterface.sol";

/// @notice Transient contract to upgrade Poolsea Pool with the Atlas set of contract upgrades
contract PoolseaUpgradeOneDotTwo is PoolseaBase {

    struct ClaimInterval {
        uint256 interval;
        uint256 block;
    }

    // Whether the upgrade has been performed or not
    bool public executed;

    // Whether the contract is locked to further changes
    bool public locked;

    // Upgrade contracts
    address public newPoolseaNodeDeposit;
    address public newPoolseaMinipoolDelegate;
    address public newPoolseaDAOProtocolSettingsMinipool;
    address public newPoolseaMinipoolQueue;
    address public newPoolseaDepositPool;
    address public newPoolseaDAOProtocolSettingsDeposit;
    address public newPoolseaMinipoolManager;
    address public newPoolseaNodeStaking;
    address public newPoolseaNodeDistributorDelegate;
    address public newPoolseaMinipoolFactory;
    address public newPoolseaNetworkFees;
    address public newPoolseaNetworkPrices;
    address public newPoolseaDAONodeTrustedSettingsMinipool;
    address public newPoolseaNodeManager;
    address public newPoolseaDAOProtocolSettingsNode;
    address public newPoolseaNetworkBalances;
    address public newPoolseaRewardsPool;
    address public poolseaMinipoolBase;
    address public poolseaMinipoolBondReducer;

    // Upgrade ABIs
    string public newPoolseaNodeDepositAbi;
    string public newPoolseaMinipoolDelegateAbi;
    string public newPoolseaDAOProtocolSettingsMinipoolAbi;
    string public newPoolseaMinipoolQueueAbi;
    string public newPoolseaDepositPoolAbi;
    string public newPoolseaDAOProtocolSettingsDepositAbi;
    string public newPoolseaMinipoolManagerAbi;
    string public newPoolseaNodeStakingAbi;
    string public newPoolseaNodeDistributorDelegateAbi;
    string public newPoolseaMinipoolFactoryAbi;
    string public newPoolseaNetworkFeesAbi;
    string public newPoolseaNetworkPricesAbi;
    string public newPoolseaDAONodeTrustedSettingsMinipoolAbi;
    string public newPoolseaNodeManagerAbi;
    string public newPoolseaDAOProtocolSettingsNodeAbi;
    string public newPoolseaNetworkBalancesAbi;
    string public newPoolseaRewardsPoolAbi;
    string public poolseaMinipoolBaseAbi;
    string public poolseaMinipoolBondReducerAbi;
    string public poolseaNetworkBalancesAbi;

    string public newPoolseaMinipoolAbi;

    // Save deployer to limit access to set functions
    address immutable deployer;

    // Claim intervals
    ClaimInterval[] public intervals;

    // Construct
    constructor(
        PoolseaStorageInterface _poolseaStorageAddress
    ) PoolseaBase(_poolseaStorageAddress) {
        // Version
        version = 1;
        deployer = msg.sender;
    }

    /// @notice Returns the address of the PoolseaStorage contract
    function getPoolseaStorageAddress() external view returns (address) {
        return address(poolseaStorage);
    }

    function set(address[] memory _addresses, string[] memory _abis) external {
        require(msg.sender == deployer, "Only deployer");
        require(!locked, "Contract locked");

        // Set contract addresses
        newPoolseaNodeDeposit = _addresses[0];
        newPoolseaMinipoolDelegate = _addresses[1];
        newPoolseaDAOProtocolSettingsMinipool = _addresses[2];
        newPoolseaMinipoolQueue = _addresses[3];
        newPoolseaDepositPool = _addresses[4];
        newPoolseaDAOProtocolSettingsDeposit = _addresses[5];
        newPoolseaMinipoolManager = _addresses[6];
        newPoolseaNodeStaking = _addresses[7];
        newPoolseaNodeDistributorDelegate = _addresses[8];
        newPoolseaMinipoolFactory = _addresses[9];
        newPoolseaNetworkFees = _addresses[10];
        newPoolseaNetworkPrices = _addresses[11];
        newPoolseaDAONodeTrustedSettingsMinipool = _addresses[12];
        newPoolseaNodeManager = _addresses[13];
        newPoolseaDAOProtocolSettingsNode = _addresses[14];
        newPoolseaNetworkBalances = _addresses[15];
        newPoolseaRewardsPool = _addresses[16];
        poolseaMinipoolBase = _addresses[17];
        poolseaMinipoolBondReducer = _addresses[18];

        // Set ABIs
        newPoolseaNodeDepositAbi = _abis[0];
        newPoolseaMinipoolDelegateAbi = _abis[1];
        newPoolseaDAOProtocolSettingsMinipoolAbi = _abis[2];
        newPoolseaMinipoolQueueAbi = _abis[3];
        newPoolseaDepositPoolAbi = _abis[4];
        newPoolseaDAOProtocolSettingsDepositAbi = _abis[5];
        newPoolseaMinipoolManagerAbi = _abis[6];
        newPoolseaNodeStakingAbi = _abis[7];
        newPoolseaNodeDistributorDelegateAbi = _abis[8];
        newPoolseaMinipoolFactoryAbi = _abis[9];
        newPoolseaNetworkFeesAbi = _abis[10];
        newPoolseaNetworkPricesAbi = _abis[11];
        newPoolseaDAONodeTrustedSettingsMinipoolAbi = _abis[12];
        newPoolseaNodeManagerAbi = _abis[13];
        newPoolseaDAOProtocolSettingsNodeAbi = _abis[14];
        newPoolseaNetworkBalancesAbi = _abis[15];
        newPoolseaRewardsPoolAbi = _abis[16];
        poolseaMinipoolBaseAbi = _abis[17];
        poolseaMinipoolBondReducerAbi = _abis[18];

        newPoolseaMinipoolAbi = _abis[19];
    }

    function setInterval(uint256 _interval, uint256 _block) external {
        require(msg.sender == deployer, "Only deployer");
        require(!locked, "Contract locked");

        intervals.push(ClaimInterval({
            interval: _interval,
            block: _block
        }));
    }

    /// @notice Prevents further changes from being applied
    function lock() external {
        require(msg.sender == deployer, "Only deployer");
        locked = true;
    }

    /// @notice Once this contract has been voted in by oDAO, guardian can perform the upgrade
    function execute() external onlyGuardian {
        require(!executed, "Already executed");
        executed = true;

        // Upgrade contracts
        _upgradeContract("poolseaNodeDeposit", newPoolseaNodeDeposit, newPoolseaNodeDepositAbi);
        _upgradeContract("poolseaMinipoolDelegate", newPoolseaMinipoolDelegate, newPoolseaMinipoolDelegateAbi);
        _upgradeContract("poolseaDAOProtocolSettingsMinipool", newPoolseaDAOProtocolSettingsMinipool, newPoolseaDAOProtocolSettingsMinipoolAbi);
        _upgradeContract("poolseaMinipoolQueue", newPoolseaMinipoolQueue, newPoolseaMinipoolQueueAbi);
        _upgradeContract("poolseaDepositPool", newPoolseaDepositPool, newPoolseaDepositPoolAbi);
        _upgradeContract("poolseaDAOProtocolSettingsDeposit", newPoolseaDAOProtocolSettingsDeposit, newPoolseaDAOProtocolSettingsDepositAbi);
        _upgradeContract("poolseaMinipoolManager", newPoolseaMinipoolManager, newPoolseaMinipoolManagerAbi);
        _upgradeContract("poolseaNodeStaking", newPoolseaNodeStaking, newPoolseaNodeStakingAbi);
        _upgradeContract("poolseaNodeDistributorDelegate", newPoolseaNodeDistributorDelegate, newPoolseaNodeDistributorDelegateAbi);
        _upgradeContract("poolseaMinipoolFactory", newPoolseaMinipoolFactory, newPoolseaMinipoolFactoryAbi);
        _upgradeContract("poolseaNetworkFees", newPoolseaNetworkFees, newPoolseaNetworkFeesAbi);
        _upgradeContract("poolseaNetworkPrices", newPoolseaNetworkPrices, newPoolseaNetworkPricesAbi);
        _upgradeContract("poolseaDAONodeTrustedSettingsMinipool", newPoolseaDAONodeTrustedSettingsMinipool, newPoolseaDAONodeTrustedSettingsMinipoolAbi);
        _upgradeContract("poolseaNodeManager", newPoolseaNodeManager, newPoolseaNodeManagerAbi);
        _upgradeContract("poolseaDAOProtocolSettingsNode", newPoolseaDAOProtocolSettingsNode, newPoolseaDAOProtocolSettingsNodeAbi);
        _upgradeContract("poolseaNetworkBalances", newPoolseaNetworkBalances, newPoolseaNetworkBalancesAbi);
        _upgradeContract("poolseaRewardsPool", newPoolseaRewardsPool, newPoolseaRewardsPoolAbi);

        // Add new contracts
        _addContract("poolseaMinipoolBase", poolseaMinipoolBase, poolseaMinipoolBaseAbi);
        _addContract("poolseaMinipoolBondReducer", poolseaMinipoolBondReducer, poolseaMinipoolBondReducerAbi);

        // Upgrade ABIs
        _upgradeABI("poolseaMinipool", newPoolseaMinipoolAbi);

        // Migrate settings
        bytes32 settingNameSpace = keccak256(abi.encodePacked("dao.protocol.setting.", "deposit"));
        setUint(keccak256(abi.encodePacked(settingNameSpace, "deposit.assign.maximum")), 90);
        setUint(keccak256(abi.encodePacked(settingNameSpace, "deposit.assign.socialised.maximum")), 2);

        // Delete deprecated storage items
        deleteUint(keccak256("network.rpl.stake"));
        deleteUint(keccak256("network.rpl.stake.updated.block"));

        // Update node fee to 14%
        settingNameSpace = keccak256(abi.encodePacked("dao.protocol.setting.", "network"));
        setUint(keccak256(abi.encodePacked(settingNameSpace, "network.node.fee.minimum")), 0.14 ether);
        setUint(keccak256(abi.encodePacked(settingNameSpace, "network.node.fee.target")), 0.14 ether);
        setUint(keccak256(abi.encodePacked(settingNameSpace, "network.node.fee.maximum")), 0.14 ether);

        // Set new settings
        settingNameSpace = keccak256(abi.encodePacked("dao.trustednodes.setting.", "minipool"));
        setUint(keccak256(abi.encodePacked(settingNameSpace, "minipool.bond.reduction.window.start")), 12 hours);
        setUint(keccak256(abi.encodePacked(settingNameSpace, "minipool.bond.reduction.window.length")), 2 days);
        setUint(keccak256(abi.encodePacked(settingNameSpace, "minipool.cancel.bond.reduction.quorum")), 0.51 ether);
        setUint(keccak256(abi.encodePacked(settingNameSpace, "minipool.promotion.scrub.period")), 3 days);
        setBool(keccak256(abi.encodePacked(settingNameSpace, "minipool.scrub.penalty.enabled")), true);
        settingNameSpace = keccak256(abi.encodePacked("dao.protocol.setting.", "minipool"));
        setUint(keccak256(abi.encodePacked(settingNameSpace, "minipool.user.distribute.window.start")), 90 days);
        setUint(keccak256(abi.encodePacked(settingNameSpace, "minipool.user.distribute.window.length")), 2 days);
        setBool(keccak256(abi.encodePacked(settingNameSpace, "minipool.bond.reduction.enabled")), true);
        settingNameSpace = keccak256(abi.encodePacked("dao.protocol.setting.", "node"));
        setBool(keccak256(abi.encodePacked(settingNameSpace, "node.vacant.minipools.enabled")), true);
        setBool(keccak256(abi.encodePacked(settingNameSpace, "node.deposit.enabled")), true);
        setBool(keccak256(abi.encodePacked(settingNameSpace, "node.smoothing.pool.registration.enabled")), true);
        setBool(keccak256(abi.encodePacked(settingNameSpace, "node.registration.enabled")), true);

        // Claim intervals
        for (uint256 i = 0; i < intervals.length; i++) {
            ClaimInterval memory interval = intervals[i];
            setUint(keccak256(abi.encodePacked("rewards.pool.interval.execution.block", interval.interval)), interval.block);
        }
    }

    /// @dev Add a new network contract
    function _addContract(string memory _name, address _contractAddress, string memory _contractAbi) internal {
        // Check contract name
        require(bytes(_name).length > 0, "Invalid contract name");
        // Cannot add contract if it already exists (use upgradeContract instead)
        require(getAddress(keccak256(abi.encodePacked("contract.address", _name))) == address(0x0), "Contract name is already in use");
        // Cannot add contract if already in use as ABI only
        string memory existingAbi = getString(keccak256(abi.encodePacked("contract.abi", _name)));
        require(bytes(existingAbi).length == 0, "Contract name is already in use");
        // Check contract address
        require(_contractAddress != address(0x0), "Invalid contract address");
        require(!getBool(keccak256(abi.encodePacked("contract.exists", _contractAddress))), "Contract address is already in use");
        // Check ABI isn't empty
        require(bytes(_contractAbi).length > 0, "Empty ABI is invalid");
        // Register contract
        setBool(keccak256(abi.encodePacked("contract.exists", _contractAddress)), true);
        setString(keccak256(abi.encodePacked("contract.name", _contractAddress)), _name);
        setAddress(keccak256(abi.encodePacked("contract.address", _name)), _contractAddress);
        setString(keccak256(abi.encodePacked("contract.abi", _name)), _contractAbi);
    }

    /// @dev Upgrade a network contract
    function _upgradeContract(string memory _name, address _contractAddress, string memory _contractAbi) internal {
        // Get old contract address & check contract exists
        address oldContractAddress = getAddress(keccak256(abi.encodePacked("contract.address", _name)));
        require(oldContractAddress != address(0x0), "Contract does not exist");
        // Check new contract address
        require(_contractAddress != address(0x0), "Invalid contract address");
        require(_contractAddress != oldContractAddress, "The contract address cannot be set to its current address");
        require(!getBool(keccak256(abi.encodePacked("contract.exists", _contractAddress))), "Contract address is already in use");
        // Check ABI isn't empty
        require(bytes(_contractAbi).length > 0, "Empty ABI is invalid");
        // Register new contract
        setBool(keccak256(abi.encodePacked("contract.exists", _contractAddress)), true);
        setString(keccak256(abi.encodePacked("contract.name", _contractAddress)), _name);
        setAddress(keccak256(abi.encodePacked("contract.address", _name)), _contractAddress);
        setString(keccak256(abi.encodePacked("contract.abi", _name)), _contractAbi);
        // Deregister old contract
        deleteString(keccak256(abi.encodePacked("contract.name", oldContractAddress)));
        deleteBool(keccak256(abi.encodePacked("contract.exists", oldContractAddress)));
    }

    /// @dev Deletes a network contract
    function _deleteContract(string memory _name) internal {
        address contractAddress = getAddress(keccak256(abi.encodePacked("contract.address", _name)));
        deleteString(keccak256(abi.encodePacked("contract.name", contractAddress)));
        deleteBool(keccak256(abi.encodePacked("contract.exists", contractAddress)));
        deleteAddress(keccak256(abi.encodePacked("contract.address", _name)));
        deleteString(keccak256(abi.encodePacked("contract.abi", _name)));
    }

    /// @dev Upgrade a network contract ABI
    function _upgradeABI(string memory _name, string memory _contractAbi) internal {
        // Check ABI exists
        string memory existingAbi = getString(keccak256(abi.encodePacked("contract.abi", _name)));
        require(bytes(existingAbi).length > 0, "ABI does not exist");
        // Sanity checks
        require(bytes(_contractAbi).length > 0, "Empty ABI is invalid");
        require(keccak256(bytes(existingAbi)) != keccak256(bytes(_contractAbi)), "ABIs are identical");
        // Set ABI
        setString(keccak256(abi.encodePacked("contract.abi", _name)), _contractAbi);
    }
}
