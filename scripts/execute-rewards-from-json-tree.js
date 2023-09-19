const hre = require('hardhat');
const Web3 = require('web3');
const { utils } = require("ethers");

const defaultRepoUrl = 'https://github.com/PoolSea-Staking-Pool/rewards-trees/raw/main/'

const getNetworkNameByChainId = async (id) => {
    switch (id) {
        case 943 :
            return "pulsechain-testnet-v4"
        case 369 :
            return "pulsechain"
        default :
            throw new Error("Unsupported network")
    }
}

const fetchRewardsTree = async (url) => {
    console.log("Fetch url: ", url)
    const response = await fetch(url, {method: 'GET'})
    if(!response.ok){
        throw new Error("Response not ok")
    }
    console.log("Fetching successfully completed")
    return await response.json()
}

export async function main() {
    const storageContractAddress = process.env.ROCKET_STORAGE;
    if(!storageContractAddress) {
        console.error("Invalid storage address.")
        return
    }
    const rewardsRepoURL = process.env.REWARDS_REPO_URL ?? defaultRepoUrl

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
    const smoothingPoolEncode = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaSmoothingPool']));
    const smoothingPoolAddr = await deployedContractStorage.getAddress(smoothingPoolEncode)
    const rewardsPoolAddr = await deployedContractStorage.getAddress(encoded)
    console.log("Address smoothing pool: ", smoothingPoolAddr)
    console.log("Address rew pool: ", rewardsPoolAddr)
    console.log("Sender: ", accounts[0])

    const deployedContractRewardsPool = await rewPool.at(rewardsPoolAddr);

    console.log("-----------------------------------------")
    const chainId = await $web3.eth.getChainId()
    console.log("Chain id: ", chainId)
    const networkName = await getNetworkNameByChainId(chainId)
    console.log("Network name: ", networkName)
    const intervalId = await deployedContractRewardsPool.getRewardIndex()
    console.log("Rewards interval id: ", +intervalId)
    console.log("-----------------------------------------")

    console.log("Fetching tree data ...")
    const rewardsTree = await fetchRewardsTree(`${rewardsRepoURL}${networkName}/rp-rewards-${networkName}-${intervalId}.json`)

    console.log("-----------------------------------------")

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
    console.log("Submission \\/")
    console.log(submission)
    await deployedContractRewardsPool.submitRewardSnapshot(submission);
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
