const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");

export async function main() {
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
    const deployedContractMinipoolMan = await minipoolMan.at('0xA2f8921947DC31Ab1C029bD32A3658753deD21d6');
    const deployedContractNodeStaking = await nodeStaking.at('0x0698686D09cD452439bB58821A74cB1b32eA601c');
    const deployedContractRewardsPool = await rewPool.at('0x192C7997425DE3F63B3fA56f8e972778e896B6a3');
    const deployedContractNetworkPrices = await networkPrices.at('0x894f7e968BBE9c602f1E6Abbb6dE4Bd640cF19A8');
    const deployedContractTrustedNode = await odao.at('0x8c3c2137094b44da0aFFf1429157d3181e3C58Bd');
    const deployedContractNodeMan = await nodeMan.at('0x49AC1477B884971E4D11F5F1F810A525F9105662');

    const penRew = await deployedContractRewardsPool.getPendingRPLRewards()
    const rewPercent = await deployedContractRewardsPool.getClaimingContractPerc("poolseaClaimNode")
    const calculatedTotalNodeRewards = penRew.mul(rewPercent)
    console.log("Pending rewards: ", BigInt(+(penRew)).toString())
    console.log("Rew percent: ", +(rewPercent))
    console.log("calculatedTotalNodeRewards: ", BigInt(+(calculatedTotalNodeRewards)).toString())
    const nodeRPLStake = await deployedContractNodeStaking.getNodeRPLStake('0x08FCABC7bb70673c3D447FB3d07bC584D6021E17')
    console.log("nodeRPLStake: ", BigInt(+(nodeRPLStake)).toString())
    console.log("nodeEffectiveRPLStake: ", BigInt(+(await deployedContractNodeStaking.getNodeEffectiveRPLStake('0x08FCABC7bb70673c3D447FB3d07bC584D6021E17'))).toString())
    const nodesCount = +(await deployedContractMinipoolMan.getNodeMinipoolCount("0x08FCABC7bb70673c3D447FB3d07bC584D6021E17"))
    const minipoolsAddresses = await Promise.all(Array.from(Array(nodesCount).keys()).map(i => deployedContractMinipoolMan.getNodeMinipoolAt("0x08FCABC7bb70673c3D447FB3d07bC584D6021E17", i)))
    console.log("minipoolsAddresses: ", minipoolsAddresses)
    const minipoolsContracts = await Promise.all(minipoolsAddresses.map(addr => minipoolDelegate.at(addr)))
    const usersDepositsBalance = await Promise.all(minipoolsContracts.map(contr => contr.getUserDepositBalance()))
    const nodesDepositsBalance = await Promise.all(minipoolsContracts.map(contr => contr.getNodeDepositBalance()))
    console.log("users deposit balances: ", usersDepositsBalance.map(el => BigInt(+(el))).toString())
    console.log("nodes deposit balances: ", nodesDepositsBalance.map(el => BigInt(+(el))).toString())
    const minFraction = BigInt(+utils.parseUnits('0.1'));
    const maxFraction = BigInt(+utils.parseUnits('1.5'));
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
    console.log("rewards intervals passed: ", await deployedContractRewardsPool.getClaimIntervalsPassed())
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
