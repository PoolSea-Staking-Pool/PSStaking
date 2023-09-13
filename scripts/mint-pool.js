const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");

export async function main() {
    const transferAddress = '0x08FCABC7bb70673c3D447FB3d07bC584D6021E17'
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
    const encodedRPLS = utils.keccak256(utils.solidityPack(['string', 'string'], ["contract.address", 'poolseaTokenRETH']));
    const poolAddr = await deployedContractStorage.getAddress(encodedRPL)
    const rplsAddr = await deployedContractStorage.getAddress(encodedRPLS)

    const deployedContractPOOLToken = await poolToken.at(poolAddr);
    const deployedContractDPOOLToken = await dpoolToken.at(rplsAddr);

    await deployedContractDPOOLToken.mint(accounts[0], utils.parseUnits('400000000000'))
    await deployedContractDPOOLToken.approve(deployedContractPOOLToken.address, utils.parseUnits('400000000000'))
    console.log("DPOOL allowance: ", +(await deployedContractDPOOLToken.allowance(accounts[0], deployedContractPOOLToken.address)))
    await deployedContractPOOLToken.swapTokens(utils.parseUnits('400000000000'))
    console.log("Dummy POOL Balance: ", +(await deployedContractDPOOLToken.balanceOf(accounts[0])))
    console.log("POOL Balance: ", +(await deployedContractPOOLToken.balanceOf(accounts[0])))
    await deployedContractPOOLToken.transfer(transferAddress, utils.parseUnits('400000000000'))
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
