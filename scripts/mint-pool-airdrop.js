const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");


const TOTAL_AIRDROP_AMOUNT = 10185316829
const ADDRESS_TO_MINT = ''

export async function main() {
    const storageContractAddress = process.env.ROCKET_STORAGE;
    if(!storageContractAddress) {
        console.log("Invalid storage address.")
        return
    }
    const storage = artifacts.require('PoolseaStorage');
    const poolToken = artifacts.require('PoolseaTokenPOOL');
    const dpoolToken = artifacts.require('PoolseaTokenDummyPOOL');

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
    const encodedRPL = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaTokenRPL']));
    const encodedRPLS = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaTokenRPLFixedSupply']));
    const poolAddr = await deployedContractStorage.getAddress(encodedRPL)
    const dpoolAddr = await deployedContractStorage.getAddress(encodedRPLS)

    const deployedContractPOOLToken = await poolToken.at(poolAddr);
    const deployedContractDPOOLToken = await dpoolToken.at(dpoolAddr);

    await deployedContractDPOOLToken.mint(accounts[0], utils.parseUnits(TOTAL_AIRDROP_AMOUNT.toString()))
    await deployedContractDPOOLToken.approve(deployedContractPOOLToken.address, utils.parseUnits(TOTAL_AIRDROP_AMOUNT.toString()))
    console.log("DPOOL allowance: ", +(await deployedContractDPOOLToken.allowance(accounts[0], deployedContractPOOLToken.address)))
    await deployedContractPOOLToken.swapTokens(utils.parseUnits(TOTAL_AIRDROP_AMOUNT.toString()))
    console.log("Dummy POOL Balance: ", +(await deployedContractDPOOLToken.balanceOf(accounts[0])))
    console.log("POOL Balance: ", +(await deployedContractPOOLToken.balanceOf(accounts[0])))
    await deployedContractPOOLToken.transfer(ADDRESS_TO_MINT, utils.parseUnits(TOTAL_AIRDROP_AMOUNT.toString()))
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
