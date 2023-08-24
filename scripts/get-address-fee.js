const hre = require('hardhat');
const Web3 = require('web3');
const { utils } = require("ethers");

export async function main() {
    const contract = artifacts.require('PoolseaStorage');
    const rewardsPool = artifacts.require('PoolseaRewardsPool');

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
    const deployedContract = await contract.at('0xa39c7c87d5F1f306b978B52E393288fBf451B503');
    const deployedContractRewards = await rewardsPool.at('0x192C7997425DE3F63B3fA56f8e972778e896B6a3');

    console.log("Rewards index: ", +(await deployedContractRewards.getRewardIndex()))

    // const encodedSetting = utils.keccak256(utils.solidityPack(['string', 'string'], ['dao.protocol.setting.', 'rewards']));
    // const encoded = utils.keccak256(utils.solidityPack(['bytes32', 'string', 'string', 'string'], [encodedSetting, 'rewards.claims', 'group.amount.updated.time', 'poolseaClaimDAO']));
    // const fee = await deployedContract.getUint(encoded);
    // console.log('Storage - ', new Date(+fee * 1000));

    // await deployedContract.setBool(encoded, true)
    // console.log('Storage 1 - ', await deployedContract.getBool(encoded));

    // await deployedContract.setUint(encoded, utils.parseUnits('33', 16));

    // const newFee = await deployedContract.getUint(encoded);
    // console.log('Storage - ', utils.formatUnits(newFee.toString(), 18));
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
