const hre = require('hardhat');
const Web3 = require('web3');
const { utils, constants, ethers } = require("ethers");

export async function main() {
    const contract = artifacts.require('PoolseaStorage');
    const poolToken = artifacts.require('PoolseaTokenPOOL');
    const dpoolToken = artifacts.require('PoolseaTokenDummyPOOL');
    const nodeMan = artifacts.require('PoolseaNodeManager');
    const minipoolMan = artifacts.require('PoolseaMinipoolManager');
    const nodeStaking = artifacts.require('PoolseaNodeStaking');
    const rewPool = artifacts.require('PoolseaRewardsPool');
    const minipoolDelegate = artifacts.require('PoolseaMinipoolDelegate');
    const networkPrices = artifacts.require('PoolseaNetworkPrices');
    const odao = artifacts.require('PoolseaDAONodeTrusted');

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
    const deployedContractNodeMan = await nodeMan.at('0x49AC1477B884971E4D11F5F1F810A525F9105662');
    const deployedContractMinipoolMan = await minipoolMan.at('0xA2f8921947DC31Ab1C029bD32A3658753deD21d6');
    const deployedContractNodeStaking = await nodeStaking.at('0x0698686D09cD452439bB58821A74cB1b32eA601c');
    const deployedContractRewardsPool = await rewPool.at('0x192C7997425DE3F63B3fA56f8e972778e896B6a3');
    const deployedContractNetworkPrices = await networkPrices.at('0x894f7e968BBE9c602f1E6Abbb6dE4Bd640cF19A8');
    const deployedContractTrustedNode = await odao.at('0xa30cc5342f452136CecFD557E9b1De97F51385A3');

   await deployedContractTrustedNode.bootstrapMember('123', 'https://scan.v4.testnet.pulsechain.com/address/0x08FCABC7bb70673c3D447FB3d07bC584D6021E17', '0x08FCABC7bb70673c3D447FB3d07bC584D6021E17')

   //  const fee = await deployedStorageContract.getBool(encoded);
   //  console.log('Storage - ', fee);

    // console.log('Is Node exist: ', await deployedContractNodeMan.getNodeExists('0x08FCABC7bb70673c3D447FB3d07bC584D6021E17'))
    // console.log('Is Node exist: ', await deployedContractNodeMan.getNodeWithdrawalAddress('0x08FCABC7bb70673c3D447FB3d07bC584D6021E17'))
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
