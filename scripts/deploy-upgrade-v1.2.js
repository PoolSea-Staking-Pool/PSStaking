/*** Dependencies ********************/

const hre = require('hardhat');
const pako = require('pako');
const fs = require('fs');
const Web3 = require('web3');

/*** Utility Methods *****************/

// Compress / decompress ABIs
function compressABI(abi) {
    return Buffer.from(pako.deflate(JSON.stringify(abi))).toString('base64');
}

/*** Contracts ***********************/

// Storage
const rocketStorage = artifacts.require('PoolseaStorage.sol');

// Network contracts
const contracts = {
    // v1.2
    rocketNodeDeposit: artifacts.require('PoolseaNodeDeposit.sol'),
    rocketMinipoolDelegate: artifacts.require('PoolseaMinipoolDelegate.sol'),
    rocketDAOProtocolSettingsMinipool: artifacts.require('PoolseaDAOProtocolSettingsMinipool.sol'),
    rocketMinipoolQueue: artifacts.require('PoolseaMinipoolQueue.sol'),
    rocketDepositPool: artifacts.require('PoolseaDepositPool.sol'),
    rocketDAOProtocolSettingsDeposit: artifacts.require('PoolseaDAOProtocolSettingsDeposit.sol'),
    rocketMinipoolManager: artifacts.require('PoolseaMinipoolManager.sol'),
    rocketNodeStaking: artifacts.require('PoolseaNodeStaking.sol'),
    rocketNodeDistributorDelegate: artifacts.require('PoolseaNodeDistributorDelegate.sol'),
    rocketMinipoolFactory: artifacts.require('PoolseaMinipoolFactory.sol'),
    rocketNetworkFees: artifacts.require('PoolseaNetworkFees.sol'),
    rocketNetworkPrices: artifacts.require('PoolseaNetworkPrices.sol'),
    rocketMinipoolBase: artifacts.require('PoolseaMinipoolBase.sol'),
    rocketNodeManager: artifacts.require('PoolseaNodeManager.sol'),
    rocketDAONodeTrustedSettingsMinipool: artifacts.require('PoolseaDAONodeTrustedSettingsMinipool.sol'),
    rocketDAOProtocolSettingsNode: artifacts.require('PoolseaDAOProtocolSettingsNode.sol'),
    rocketNetworkBalances: artifacts.require('PoolseaNetworkBalances.sol'),
    rocketRewardsPool: artifacts.require('PoolseaRewardsPool.sol'),
    rocketMinipoolBondReducer: artifacts.require('PoolseaMinipoolBondReducer.sol'),
    rocketUpgradeOneDotTwo: artifacts.require('PoolseaUpgradeOneDotTwo.sol'),
};

// Construct ABI for rocketMinipool
const rocketMinipoolAbi = []
    .concat(artifacts.require('PoolseaMinipoolDelegate.sol').abi)
    .concat(artifacts.require('PoolseaMinipoolBase.sol').abi)
    .filter(i => i.type !== 'fallback' && i.type !== 'receive');

rocketMinipoolAbi.push({ stateMutability: 'payable', type: 'fallback'});
rocketMinipoolAbi.push({ stateMutability: 'payable', type: 'receive'});

/*** Deployment **********************/

// Upgrade Rocket Pool
export async function upgrade() {
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
    console.log(`Deploying from: ${accounts[0]}`)
    console.log('\n');

    let rocketStorageInstance = await rocketStorage.at(process.env.ROCKET_STORAGE);

    // Deploy other contracts - have to be inside an async loop
    const deployContracts = async function() {
        for (let contract in contracts) {
            // Only deploy if it hasn't been deployed already like a precompiled
            if (!contracts[contract].hasOwnProperty('precompiled')) {
                let instance;

                switch (contract) {
                    // Contracts with no constructor args
                    case 'rocketMinipoolDelegate':
                    case 'rocketNodeDistributorDelegate':
                    case 'rocketMinipoolBase':
                        instance = await contracts[contract].new();
                        contracts[contract].setAsDeployed(instance);
                        break;

                    // Upgrade rewards
                    case 'rocketUpgradeOneDotTwo':
                        instance = await contracts[contract].new(rocketStorageInstance.address);
                        contracts[contract].setAsDeployed(instance);
                        const args = [
                            [
                                // compressABI(contracts.rocketContract.abi),
                                (await contracts.rocketNodeDeposit.deployed()).address,
                                (await contracts.rocketMinipoolDelegate.deployed()).address,
                                (await contracts.rocketDAOProtocolSettingsMinipool.deployed()).address,
                                (await contracts.rocketMinipoolQueue.deployed()).address,
                                (await contracts.rocketDepositPool.deployed()).address,
                                (await contracts.rocketDAOProtocolSettingsDeposit.deployed()).address,
                                (await contracts.rocketMinipoolManager.deployed()).address,
                                (await contracts.rocketNodeStaking.deployed()).address,
                                (await contracts.rocketNodeDistributorDelegate.deployed()).address,
                                (await contracts.rocketMinipoolFactory.deployed()).address,
                                (await contracts.rocketNetworkFees.deployed()).address,
                                (await contracts.rocketNetworkPrices.deployed()).address,
                                (await contracts.rocketDAONodeTrustedSettingsMinipool.deployed()).address,
                                (await contracts.rocketNodeManager.deployed()).address,
                                (await contracts.rocketDAOProtocolSettingsNode.deployed()).address,
                                (await contracts.rocketNetworkBalances.deployed()).address,
                                (await contracts.rocketRewardsPool.deployed()).address,
                                (await contracts.rocketMinipoolBase.deployed()).address,
                                (await contracts.rocketMinipoolBondReducer.deployed()).address,
                            ],
                            [
                                // compressABI(contracts.rocketContract.abi),
                                compressABI(contracts.rocketNodeDeposit.abi),
                                compressABI(contracts.rocketMinipoolDelegate.abi),
                                compressABI(contracts.rocketDAOProtocolSettingsMinipool.abi),
                                compressABI(contracts.rocketMinipoolQueue.abi),
                                compressABI(contracts.rocketDepositPool.abi),
                                compressABI(contracts.rocketDAOProtocolSettingsDeposit.abi),
                                compressABI(contracts.rocketMinipoolManager.abi),
                                compressABI(contracts.rocketNodeStaking.abi),
                                compressABI(contracts.rocketNodeDistributorDelegate.abi),
                                compressABI(contracts.rocketMinipoolFactory.abi),
                                compressABI(contracts.rocketNetworkFees.abi),
                                compressABI(contracts.rocketNetworkPrices.abi),
                                compressABI(contracts.rocketDAONodeTrustedSettingsMinipool.abi),
                                compressABI(contracts.rocketNodeManager.abi),
                                compressABI(contracts.rocketDAOProtocolSettingsNode.abi),
                                compressABI(contracts.rocketNetworkBalances.abi),
                                compressABI(contracts.rocketRewardsPool.abi),
                                compressABI(contracts.rocketMinipoolBase.abi),
                                compressABI(contracts.rocketMinipoolBondReducer.abi),
                                compressABI(rocketMinipoolAbi),
                            ],
                        ];
                        await instance.set(...args);
                        break;

                    // All other contracts - pass storage address
                    default:
                        console.log(`  ABI: ${compressABI(contracts[contract].abi)}`);
                        instance = await contracts[contract].new(rocketStorageInstance.address);
                        contracts[contract].setAsDeployed(instance);

                        break;
                }

                console.log(`  Deployed ${contract} to:`);
                console.log(`    ${instance.address}`);
            }
        }
    };

    console.log('\x1b[34m%s\x1b[0m', '  Deploying contracts');
    console.log('\x1b[34m%s\x1b[0m', '  ******************************************');

    // Run it
    await deployContracts();

    // Lock it
    console.log('\n');
    console.log('\x1b[34m%s\x1b[0m', '  Locking upgrade contract');
    const upgradeContract = (await contracts.rocketUpgradeOneDotTwo.deployed());
    await upgradeContract.lock();

    // Store deployed block
    console.log('\n');
    console.log('\x1b[32m%s\x1b[0m', '  Deployment complete :)');
    console.log('\n');
};

upgrade().then(function() {
    process.exit(0);
})
