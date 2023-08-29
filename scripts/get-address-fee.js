const hre = require('hardhat');
const Web3 = require('web3');
const { utils } = require("ethers");

export async function main() {
    const contract = artifacts.require('PoolseaStorage');
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
    const deployedStorageContract = await contract.at('0xa39c7c87d5F1f306b978B52E393288fBf451B503');
    const deployedContractPOOLToken = await poolToken.at('0x1fa161829483531913Ef0DC386BF4cbBb6381E0a');
    const deployedContractDPOOLToken = await dpoolToken.at('0xb27558a35A548b5138ED22512B5f05964660F5ab');
   // await deployedContractDPOOLToken.mint(accounts[0], utils.parseUnits('400000000000'))
   //  await deployedContractDPOOLToken.approve(deployedContractPOOLToken.address, utils.parseUnits('400000000000'))
   //  console.log("DPOOL allowance: ", +(await deployedContractDPOOLToken.allowance(accounts[0], deployedContractPOOLToken.address)))
   //  await deployedContractPOOLToken.swapTokens(utils.parseUnits('400000000000'))
   //
   //  console.log("Dummy POOL Balance: ", +(await deployedContractDPOOLToken.balanceOf(accounts[0])))
   //  console.log("POOL Balance: ", +(await deployedContractPOOLToken.balanceOf(accounts[0])))
   //
   //  await deployedContractPOOLToken.transfer('0x08FCABC7bb70673c3D447FB3d07bC584D6021E17', utils.parseUnits('400000000000'))
    const encodedSetting = utils.keccak256(utils.solidityPack(['string', 'string'], ['dao.protocol.setting.', 'node']));
    const encoded = utils.keccak256(utils.solidityPack(['bytes32', 'string'], [encodedSetting, 'node.deposit.enabled']));
    await deployedStorageContract.setBool(encoded, true);

   //  const fee = await deployedStorageContract.getBool(encoded);
   //  console.log('Storage - ', fee);
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
