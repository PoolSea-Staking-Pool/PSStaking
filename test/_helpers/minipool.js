import {
    PoolseaMinipoolDelegate,
    PoolseaMinipoolManager,
    PoolseaMinipoolFactory,
    PoolseaDAOProtocolSettingsMinipool,
    PoolseaNetworkPrices,
    PoolseaNodeDeposit,
    PoolseaDAOProtocolSettingsNode,
    PoolseaStorage,
    PoolseaNodeDepositOld,
    PoolseaMinipoolFactoryOld,
    PoolseaMinipoolManagerOld,
    PoolseaNodeStaking,
    PoolseaNodeStakingOld,
} from '../_utils/artifacts';
import { getValidatorPubkey, getValidatorSignature, getDepositDataRoot } from '../_utils/beacon';
import { upgradeExecuted } from '../_utils/upgrade';
import { assertBN } from './bn';

// Possible states that a proposal may be in
export const minipoolStates = {
    Initialised     : 0,
    Prelaunch       : 1,
    Staking         : 2,
    Withdrawable    : 3,
    Dissolved       : 4
};

// Get the number of minipools a node has
export async function getNodeMinipoolCount(nodeAddress) {
    const poolseaMinipoolManager = await PoolseaMinipoolManager.deployed();
    let count = await poolseaMinipoolManager.getNodeMinipoolCount.call(nodeAddress);
    return count;
}

// Get the number of minipools a node has in Staking status
export async function getNodeStakingMinipoolCount(nodeAddress) {
  const poolseaMinipoolManager = await PoolseaMinipoolManager.deployed();
  let count = await poolseaMinipoolManager.getNodeStakingMinipoolCount.call(nodeAddress);
  return count;
}

// Get the number of minipools a node has in that are active
export async function getNodeActiveMinipoolCount(nodeAddress) {
    const poolseaMinipoolManager = await PoolseaMinipoolManager.deployed();
    let count = await poolseaMinipoolManager.getNodeActiveMinipoolCount.call(nodeAddress);
    return count;
}

// Get the minimum required RPL stake for a minipool
export async function getMinipoolMinimumRPLStake() {

    // Load contracts
    const [
        poolseaDAOProtocolSettingsMinipool,
        poolseaNetworkPrices,
        poolseaDAOProtocolSettingsNode,
    ] = await Promise.all([
        PoolseaDAOProtocolSettingsMinipool.deployed(),
        PoolseaNetworkPrices.deployed(),
        PoolseaDAOProtocolSettingsNode.deployed(),
    ]);

    // Load data
    let [depositUserAmount, minMinipoolStake, rplPrice] = await Promise.all([
        poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount(),
        poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake(),
        poolseaNetworkPrices.getRPLPrice(),
    ]);

    // Calculate & return
    return depositUserAmount.mul(minMinipoolStake).div(rplPrice);

}

let minipoolSalt = 1

// Create a minipool
export async function createMinipool(txOptions, salt = null) {
    return createMinipoolWithBondAmount(txOptions.value, txOptions, salt);
}

export async function createMinipoolWithBondAmount(bondAmount, txOptions, salt = null) {
    const preUpdate = !(await upgradeExecuted());

    // Load contracts
    const [
        poolseaMinipoolFactory,
        poolseaNodeDeposit,
        poolseaNodeStaking,
        poolseaStorage,
    ] = await Promise.all([
        preUpdate ? PoolseaMinipoolFactoryOld.deployed() : PoolseaMinipoolFactory.deployed(),
        preUpdate ? PoolseaNodeDepositOld.deployed() : PoolseaNodeDeposit.deployed(),
        preUpdate ? PoolseaNodeStakingOld.deployed() : PoolseaNodeStaking.deployed(),
        PoolseaStorage.deployed()
    ]);

    // Get minipool contract bytecode
    let contractBytecode;

    if (salt === null){
        salt = minipoolSalt++;
    }

    let minipoolAddress;

    if (preUpdate) {
        const PoolseaMinipool = artifacts.require('PoolseaMinipoolOld');
        contractBytecode = PoolseaMinipool.bytecode;

        const depositType = await poolseaNodeDeposit.getDepositType(txOptions.value);
        const constructorArgs = web3.eth.abi.encodeParameters(['address', 'address', 'uint8'], [poolseaStorage.address, txOptions.from, depositType]);

        const deployCode = contractBytecode + constructorArgs.substr(2);

        // Calculate keccak(nodeAddress, salt)
        const nodeSalt = web3.utils.soliditySha3(
            {type: 'address', value: txOptions.from},
            {type: 'uint256', value: salt}
        )

        // Calculate hash of deploy code
        const bytecodeHash = web3.utils.soliditySha3(
            {type: 'bytes', value: deployCode}
        )

        // Construct deterministic minipool address
        const raw = web3.utils.soliditySha3(
            {type: 'bytes1', value: '0xff'},
            {type: 'address', value: poolseaMinipoolFactory.address},
            {type: 'bytes32', value: nodeSalt},
            {type: 'bytes32', value: bytecodeHash}
        )

        minipoolAddress = raw.substr(raw.length - 40);

    } else {
        minipoolAddress = (await poolseaMinipoolFactory.getExpectedAddress(txOptions.from, salt)).substr(2);
    }

    let withdrawalCredentials = '0x010000000000000000000000' + minipoolAddress;

    // Make node deposit
    if (preUpdate){
        // Get validator deposit data
        let depositData = {
            pubkey: getValidatorPubkey(),
            withdrawalCredentials: Buffer.from(withdrawalCredentials.substr(2), 'hex'),
            amount: BigInt(16000000000000000), // gwei
            signature: getValidatorSignature(),
        };

        let depositDataRoot = getDepositDataRoot(depositData);

        await poolseaNodeDeposit.deposit('0'.ether, depositData.pubkey, depositData.signature, depositDataRoot, salt, '0x' + minipoolAddress, txOptions);
    } else {
        const ethMatched1 = await poolseaNodeStaking.getNodeETHMatched(txOptions.from);

        // Get validator deposit data
        let depositData = {
            pubkey: getValidatorPubkey(),
            withdrawalCredentials: Buffer.from(withdrawalCredentials.substr(2), 'hex'),
            amount: BigInt(1000000000), // gwei
            signature: getValidatorSignature(),
        };

        let depositDataRoot = getDepositDataRoot(depositData);

        if (txOptions.value.eq(bondAmount)) {
            await poolseaNodeDeposit.deposit(bondAmount, '0'.ether, depositData.pubkey, depositData.signature, depositDataRoot, salt, '0x' + minipoolAddress, txOptions);
        } else {
            await poolseaNodeDeposit.depositWithCredit(bondAmount, '0'.ether, depositData.pubkey, depositData.signature, depositDataRoot, salt, '0x' + minipoolAddress, txOptions);
        }

        const ethMatched2 = await poolseaNodeStaking.getNodeETHMatched(txOptions.from);

        // Expect node's ETH matched to be increased by (32 - bondAmount)
        assertBN.equal(ethMatched2.sub(ethMatched1), '32000000'.ether.sub(bondAmount), 'Incorrect ETH matched');
    }

    return PoolseaMinipoolDelegate.at('0x' + minipoolAddress);
}


// Create a vacant minipool
export async function createVacantMinipool(bondAmount, txOptions, salt = null, currentBalance = '32'.ether, pubkey = null) {
    // Load contracts
    const [
        poolseaMinipoolFactory,
        poolseaNodeDeposit,
        poolseaNodeStaking,
        poolseaStorage,
    ] = await Promise.all([
        PoolseaMinipoolFactory.deployed(),
        PoolseaNodeDeposit.deployed(),
        PoolseaNodeStaking.deployed(),
        PoolseaStorage.deployed()
    ]);

    if (salt === null){
        salt = minipoolSalt++;
    }

    if (pubkey === null){
        pubkey = getValidatorPubkey();
    }

    const minipoolAddress = (await poolseaMinipoolFactory.getExpectedAddress(txOptions.from, salt)).substr(2);

    const ethMatched1 = await poolseaNodeStaking.getNodeETHMatched(txOptions.from);
    await poolseaNodeDeposit.createVacantMinipool(bondAmount, '0'.ether, pubkey, salt, '0x' + minipoolAddress, currentBalance, txOptions);
    const ethMatched2 = await poolseaNodeStaking.getNodeETHMatched(txOptions.from);

    // Expect node's ETH matched to be increased by (32 - bondAmount)
    assertBN.equal(ethMatched2.sub(ethMatched1), '32000000'.ether.sub(bondAmount), 'Incorrect ETH matched');

    return PoolseaMinipoolDelegate.at('0x' + minipoolAddress);
}


// Refund node ETH from a minipool
export async function refundMinipoolNodeETH(minipool, txOptions) {
    await minipool.refund(txOptions);
}


// Progress a minipool to staking
export async function stakeMinipool(minipool, txOptions) {

    const preUpdate = !(await upgradeExecuted());

    // Get contracts
    const poolseaMinipoolManager = preUpdate ? await PoolseaMinipoolManagerOld.deployed() : await PoolseaMinipoolManager.deployed()

    // Get minipool validator pubkey
    const validatorPubkey = await poolseaMinipoolManager.getMinipoolPubkey(minipool.address);

    // Get minipool withdrawal credentials
    let withdrawalCredentials = await poolseaMinipoolManager.getMinipoolWithdrawalCredentials.call(minipool.address);

    // Check if legacy or new minipool
    let legacy = !(await minipool.getDepositType()).eq('4'.BN);

    // Get validator deposit data
    let depositData;

    if (legacy) {
        depositData = {
            pubkey: Buffer.from(validatorPubkey.substr(2), 'hex'),
            withdrawalCredentials: Buffer.from(withdrawalCredentials.substr(2), 'hex'),
            amount: BigInt(16000000000), // gwei
            signature: getValidatorSignature(),
        };
    } else {
        depositData = {
            pubkey: Buffer.from(validatorPubkey.substr(2), 'hex'),
            withdrawalCredentials: Buffer.from(withdrawalCredentials.substr(2), 'hex'),
            amount: BigInt(31999999000000000), // gwei
            signature: getValidatorSignature(),
        };
    }
    let depositDataRoot = getDepositDataRoot(depositData);

    // Stake
    await minipool.stake(depositData.signature, depositDataRoot, txOptions);

}


// Promote a minipool to staking
export async function promoteMinipool(minipool, txOptions) {
    await minipool.promote(txOptions);
}


// Dissolve a minipool
export async function dissolveMinipool(minipool, txOptions) {
    await minipool.dissolve(txOptions);
}


// Close a dissolved minipool and destroy it
export async function closeMinipool(minipool, txOptions) {
    await minipool.close(txOptions);
}

