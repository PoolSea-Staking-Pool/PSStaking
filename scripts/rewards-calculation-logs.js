import {keccak256} from "ethereumjs-util";

const hre = require('hardhat');
const Web3 = require('web3');
const { ethers } = require("ethers");

export async function main() {
    const nodeAddressForSimulate = '0x08FCABC7bb70673c3D447FB3d07bC584D6021E17'
    const storageContractAddress = process.env.ROCKET_STORAGE;
    if(!storageContractAddress) {
        console.log("Invalid storage address.")
        return
    }
    const storage = artifacts.require('PoolseaStorage');
    const minipoolMan = artifacts.require('PoolseaMinipoolManager');
    const nodeStaking = artifacts.require('PoolseaNodeStaking');
    const rewPool = artifacts.require('PoolseaRewardsPool');
    const minipoolDelegate = artifacts.require('PoolseaMinipoolDelegate');
    const networkPrices = artifacts.require('PoolseaNetworkPrices');
    const odao = artifacts.require('PoolseaDAONodeTrusted');
    const nodeMan = artifacts.require('PoolseaNodeManager');

    const network = hre.network;
    let $web3 = new Web3(network.provider);

    // Accounts
    let accounts = await $web3.eth.getAccounts(function(error, result) {
        if(error != null) {
            console.log(error);
            console.log("Error retrieving accounts.'");
        }
        return result;
    });

    const deployedContractStorage = await storage.at(storageContractAddress);
    const encodedMinipoolMan = ethers.keccak256(ethers.solidityPacked(['string', 'string'], ["contract.address", 'poolseaMinipoolManager']));
    const encodedNodeStaking = ethers.keccak256(ethers.solidityPacked(['string', 'string'], ["contract.address", 'poolseaNodeStaking']));
    const encodedRewardsPool = ethers.keccak256(ethers.solidityPacked(['string', 'string'], ["contract.address", 'poolseaRewardsPool']));
    const encodedNetworkPrices = ethers.keccak256(ethers.solidityPacked(['string', 'string'], ["contract.address", 'poolseaNetworkPrices']));
    const encodedTrustedNode = ethers.keccak256(ethers.solidityPacked(['string', 'string'], ["contract.address", 'poolseaDAONodeTrusted']));
    const encodedNodeManager = ethers.keccak256(ethers.solidityPacked(['string', 'string'], ["contract.address", 'poolseaNodeManager']));

    const [addressMinipoolMan, addressNodeStaking, addressRewardsPool, addressNetworkPrices, addressTrustedNode, addressNodeManager] = await Promise.all([
    deployedContractStorage.getAddress(encodedMinipoolMan),
    deployedContractStorage.getAddress(encodedNodeStaking),
    deployedContractStorage.getAddress(encodedRewardsPool),
    deployedContractStorage.getAddress(encodedNetworkPrices),
    deployedContractStorage.getAddress(encodedTrustedNode),
    deployedContractStorage.getAddress(encodedNodeManager)
    ])

    console.log('reth: ', await deployedContractStorage.getAddress(keccak256('contract.addresspoolseaTokenRETH')),)

    const deployedContractMinipoolMan = await minipoolMan.at(addressMinipoolMan);
    const deployedContractNodeStaking = await nodeStaking.at(addressNodeStaking);
    const deployedContractRewardsPool = await rewPool.at(addressRewardsPool);
    const deployedContractNetworkPrices = await networkPrices.at(addressNetworkPrices);
    const deployedContractTrustedNode = await odao.at(addressTrustedNode);
    const deployedContractNodeMan = await nodeMan.at(addressNodeManager);

    const penRew = await deployedContractRewardsPool.getPendingRPLRewards()
    const rewPercent = await deployedContractRewardsPool.getClaimingContractPerc("poolseaClaimNode")
    const calculatedTotalNodeRewards = penRew.mul(rewPercent)
    console.log("Pending rewards: ", BigInt(+(penRew)).toString())
    console.log("Rew percent: ", +(rewPercent))
    console.log("calculatedTotalNodeRewards: ", BigInt(+(calculatedTotalNodeRewards)).toString())
    const nodeRPLStake = await deployedContractNodeStaking.getNodeRPLStake(nodeAddressForSimulate)
    console.log("nodeRPLStake: ", BigInt(+(nodeRPLStake)).toString())
    console.log("nodeEffectiveRPLStake: ", BigInt(+(await deployedContractNodeStaking.getNodeEffectiveRPLStake(nodeAddressForSimulate))).toString())
    const nodesCount = +(await deployedContractMinipoolMan.getNodeMinipoolCount(nodeAddressForSimulate))
    const minipoolsAddresses = await Promise.all(Array.from(Array(nodesCount).keys()).map(i => deployedContractMinipoolMan.getNodeMinipoolAt(nodeAddressForSimulate, i)))
    console.log("minipoolsAddresses: ", minipoolsAddresses)
    const minipoolsContracts = await Promise.all(minipoolsAddresses.map(addr => minipoolDelegate.at(addr)))
    const usersDepositsBalance = await Promise.all(minipoolsContracts.map(contr => contr.getUserDepositBalance()))
    const nodesDepositsBalance = await Promise.all(minipoolsContracts.map(contr => contr.getNodeDepositBalance()))
    console.log("users deposit balances: ", usersDepositsBalance.map(el => BigInt(+(el))).toString())
    console.log("nodes deposit balances: ", nodesDepositsBalance.map(el => BigInt(+(el))).toString())
    const minFraction = ethers.parseUnits('0.1');
    const maxFraction = ethers.parseUnits('1.5');
    const rplPrice = await deployedContractNetworkPrices.getRPLPrice()
    const eligibleBorrowedEth = usersDepositsBalance.reduce((previousValue, currentValue) => previousValue + BigInt(+(currentValue)), BigInt(0))
    const eligibleBondedEth = nodesDepositsBalance.reduce((previousValue, currentValue) => previousValue + BigInt(+(currentValue)), BigInt(0))
    const minCollateral = eligibleBorrowedEth * minFraction / BigInt(+rplPrice);
    console.log("minCollateral: ", minCollateral)
    const maxCollateral = eligibleBondedEth * maxFraction / BigInt(+rplPrice);
    console.log("maxCollateral: ", maxCollateral)
    console.log("Comparison min > stake: ", minCollateral > BigInt(+nodeRPLStake))
    console.log("Comparison max < stake: ", maxCollateral < BigInt(+nodeRPLStake))
    const odaoMembersCount = await deployedContractTrustedNode.getMemberCount();
    const membersAddresses = await Promise.all(Array.from(Array(odaoMembersCount).keys()).map(i => deployedContractTrustedNode.getMemberAt(i)))
    console.log("oDao members: ", membersAddresses)
    const membersDetails = await Promise.all(membersAddresses.map(addr => deployedContractNodeMan.getNodeDetails(addr)))
    console.log("oDao members data: ", membersDetails)
    console.log("rewards intervals passed: ", +(await deployedContractRewardsPool.getClaimIntervalsPassed()))

}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
