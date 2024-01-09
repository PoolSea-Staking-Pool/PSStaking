import {readFile} from "fs/promises";
import {BigNumber} from "@ethersproject/bignumber";

const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");

const ADDRESS_TO_MINT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

export async function main() {
    const airdropDataJSON = await readFile("./scripts/airdrop/amount-by-address.json")
    const airdropData = JSON.parse(airdropDataJSON)
    const totalToMint = BigNumber.from(airdropData.total.toString())
    console.log("Total amount to mint: ", airdropData.total)
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

    await deployedContractDPOOLToken.mint(accounts[0], totalToMint)
    await deployedContractDPOOLToken.approve(deployedContractPOOLToken.address, totalToMint)
    console.log("DPOOL allowance: ", +(await deployedContractDPOOLToken.allowance(accounts[0], deployedContractPOOLToken.address)))
    await deployedContractPOOLToken.swapTokens(totalToMint)
    console.log("Dummy POOL Balance: ", +(await deployedContractDPOOLToken.balanceOf(accounts[0])))
    console.log("POOL Balance: ", +(await deployedContractPOOLToken.balanceOf(accounts[0])))
    await deployedContractPOOLToken.transfer(ADDRESS_TO_MINT, totalToMint)
    process.exit(1);
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
