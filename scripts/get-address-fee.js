const hre = require('hardhat');
const Web3 = require('web3');
const { utils } = require("ethers");

export async function main() {
    const contract = artifacts.require('PoolseaStorage');
    const settingsContract = artifacts.require('PoolseaDAOProtocolSettingsNode');

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
    const deployedContract = await contract.at('0x9F5d9B88CdC90a8357b390932e9C46032D0adf01');
    const encodedSetting = utils.keccak256(utils.solidityPack(['string', 'string'], ['dao.protocol.setting.', 'rewards']));
    const encoded = utils.keccak256(utils.solidityPack(['bytes32', 'string'], [encodedSetting, 'rpl.rewards.fee.to.address']));
    const fee = await deployedContract.getUint(encoded);
    console.log('Storage - ', utils.formatUnits(fee.toString(), 18));
    
    // await deployedContract.setUint(encoded, utils.parseUnits('33', 16));

    // const newFee = await deployedContract.getUint(encoded);
    // console.log('Storage - ', utils.formatUnits(newFee.toString(), 18));
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});