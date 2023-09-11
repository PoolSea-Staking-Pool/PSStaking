const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");
const rewardsTree = require('./first-rewards-gen-file.json')

export async function main() {
    const rewPool = artifacts.require('PoolseaRewardsPool');
    const storage = artifacts.require('PoolseaStorage');

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
    const deployedContractRewardsPool = await rewPool.at('0x7558D20C18Da91374A0832a5116a094c5c0DC602');
    const deployedContractStorage = await storage.at('0x49F30583D50bE3C82b40c46E2b413e67Df1BcABd');
    const encoded = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaRewardsPool']));
    const encodedRPL = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaTokenRPL']));
    const encodedRPLS = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaTokenRETH']));
    const encodedAddrRPLS = utils.keccak256(utils.solidityPack(['string'], ["contract.addresspoolseaTokenRETH"]));
    const encodedExist = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.exists", '0x7558D20C18Da91374A0832a5116a094c5c0DC602']));
    console.log("Address rew pool: ", await deployedContractStorage.getAddress(encoded))
    console.log("Address pool: ", await deployedContractStorage.getAddress(encodedRPL))
    console.log("Address rpls: ", await deployedContractStorage.getAddress(encodedRPLS))
    console.log("Address verify rpls: ", await deployedContractStorage.getAddress(encodedAddrRPLS))
    console.log("Contract exist: ", await deployedContractStorage.getBool(encodedExist))
    console.log("Sender: ", accounts[0])

    const rewardIndex = 0;
    const merkleTreeCID = 0;
    const trustedNodeRPL = Object.values(rewardsTree.nodeRewards).map(details => details.oracleDaoRpl)
    const nodeRPL = Object.values(rewardsTree.nodeRewards).map(details => details.collateralRpl)
    const nodeETH = Object.values(rewardsTree.nodeRewards).map(details => details.smoothingPoolEth)

    const submission = {
        rewardIndex,
        executionBlock: rewardsTree.executionEndBlock,
        consensusBlock: rewardsTree.consensusEndBlock,
        merkleRoot: rewardsTree.merkleRoot,
        merkleTreeCID,
        intervalsPassed: rewardsTree.intervalsPassed,
        treasuryRPL: rewardsTree.totalRewards.protocolDaoRpl,
        trustedNodeRPL,
        nodeRPL,
        nodeETH,
        userETH: rewardsTree.totalRewards.poolStakerSmoothingPoolEth,
        feeToAddress: rewardsTree.amountToFeeAddress || '0'
    }
    await deployedContractRewardsPool.submitRewardSnapshot(submission);
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
