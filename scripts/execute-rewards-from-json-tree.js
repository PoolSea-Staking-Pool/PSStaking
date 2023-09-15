const hre = require('hardhat');
const Web3 = require('web3');
const { utils } = require("ethers");
const rewardsTree = require('./rewards-gen-file.json')

export async function main() {
    const storageContractAddress = process.env.ROCKET_STORAGE;
    if(!storageContractAddress) {
        console.log("Invalid storage address.")
        return
    }
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

    const deployedContractStorage = await storage.at(storageContractAddress);
    const encoded = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaRewardsPool']));
    const encodedRPL = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaTokenRPL']));
    const encodedRPLS = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaTokenRETH']));
    const smoothingPoolEncode = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaSmoothingPool']));
    const smoothingPoolAddr = await deployedContractStorage.getAddress(smoothingPoolEncode)
    const rewardsPoolAddr = await deployedContractStorage.getAddress(encoded)
    console.log("Address smoothing pool: ", smoothingPoolAddr)
    console.log("Address rew pool: ", rewardsPoolAddr)
    console.log("Address pool: ", await deployedContractStorage.getAddress(encodedRPL))
    console.log("Address rpls: ", await deployedContractStorage.getAddress(encodedRPLS))
    console.log("Sender: ", accounts[0])

    const deployedContractRewardsPool = await rewPool.at(rewardsPoolAddr);
    const totalETH = BigInt(+rewardsTree.totalRewards.totalSmoothingPoolEth)
    const totalETHToAddress = BigInt(+(rewardsTree.amountToFeeAddress || '0'))
    const feePercToAddress = +totalETHToAddress.toString() * 100 / +totalETH.toString()
    console.log('feePercToAddress: ', feePercToAddress)

    const rewardIndex = rewardsTree.index;
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
        feeToAddress: rewardsTree.amountToFeeAddress?.toString() || '0'
    }
    await deployedContractRewardsPool.submitRewardSnapshot(submission);
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
