const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");

export async function main() {
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
    const deployedContractPOOLToken = await poolToken.at('0xe53851D6963949113D8a290C6DDd4917a10F05Ef');
    const deployedContractDPOOLToken = await dpoolToken.at('0xBdAC6a3475b970a34CbF62009471ac16EC083cE6');

    await deployedContractDPOOLToken.mint(accounts[0], utils.parseUnits('400000000000'))
    await deployedContractDPOOLToken.approve(deployedContractPOOLToken.address, utils.parseUnits('400000000000'))
    console.log("DPOOL allowance: ", +(await deployedContractDPOOLToken.allowance(accounts[0], deployedContractPOOLToken.address)))
    await deployedContractPOOLToken.swapTokens(utils.parseUnits('400000000000'))
    console.log("Dummy POOL Balance: ", +(await deployedContractDPOOLToken.balanceOf(accounts[0])))
    console.log("POOL Balance: ", +(await deployedContractPOOLToken.balanceOf(accounts[0])))
    await deployedContractPOOLToken.transfer('0x08FCABC7bb70673c3D447FB3d07bC584D6021E17', utils.parseUnits('400000000000'))
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
