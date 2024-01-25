const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");

const NEW_MEMBER_ADDRESS = '0xBa2654747c9392c8c47e4223cb22aD3205aDcE33'
const NEW_MEMBER_ID = '369'
const NEW_MEMBER_URL = 'https://scan.v4.testnet.pulsechain.com/address/0xBa2654747c9392c8c47e4223cb22aD3205aDcE33'

export async function main() {
    const message = `invite ${NEW_MEMBER_ID} (${NEW_MEMBER_URL})`
    console.log("Invitation massage: ", message)

    const storageContractAddress = process.env.ROCKET_STORAGE;
    if(!storageContractAddress) {
        console.log("Invalid storage address.")
        return
    }
    const storage = artifacts.require('PoolseaStorage');
    const daoNodeTrusted = artifacts.require('PoolseaDAONodeTrusted');

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
    const encodedODAO = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaDAONodeTrusted']));
    const odaoAddr = await deployedContractStorage.getAddress(encodedODAO)

    const deployedODAO = await daoNodeTrusted.at(odaoAddr);

    await deployedODAO.bootstrapMember(NEW_MEMBER_ID, NEW_MEMBER_URL, NEW_MEMBER_ADDRESS)
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
