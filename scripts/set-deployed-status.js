/*** Dependencies ********************/

const hre = require('hardhat');
const pako = require('pako');
const fs = require('fs');
const Web3 = require('web3');

// Storage
const rocketStorage = artifacts.require('PoolseaStorage.sol');

/*** Deployment **********************/

// Upgrade Rocket Pool
export async function setDeployedStatus() {
    // Set our web3 provider
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

    console.log(`Using network: ${network.name}`);
    console.log(`Call from: ${accounts[0]}`)
    console.log('\n');

    let rocketStorageInstance = await rocketStorage.at(process.env.ROCKET_STORAGE);

    await rocketStorageInstance.setDeployedStatus();

    if(await rocketStorageInstance.getDeployedStatus() !== true) throw 'Storage Access Not Locked Down!!';

    // Store deployed block
    console.log('\n');
    console.log('\x1b[32m%s\x1b[0m', '  Transaction complete :)');
    console.log('\n');
};

setDeployedStatus().then(function() {
    process.exit(0);
})
