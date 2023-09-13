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
const poolseaStorage = artifacts.require('PoolseaStorage.sol');

// Network contracts
const contracts = {
    // v1.2
    poolseaNodeDeposit: artifacts.require('PoolseaNodeDeposit.sol'),
    poolseaMinipoolDelegate: artifacts.require('PoolseaMinipoolDelegate.sol'),
    poolseaDAOProtocolSettingsMinipool: artifacts.require('PoolseaDAOProtocolSettingsMinipool.sol'),
    poolseaMinipoolQueue: artifacts.require('PoolseaMinipoolQueue.sol'),
    poolseaDepositPool: artifacts.require('PoolseaDepositPool.sol'),
    poolseaDAOProtocolSettingsDeposit: artifacts.require('PoolseaDAOProtocolSettingsDeposit.sol'),
    poolseaMinipoolManager: artifacts.require('PoolseaMinipoolManager.sol'),
    poolseaNodeStaking: artifacts.require('PoolseaNodeStaking.sol'),
    poolseaNodeDistributorDelegate: artifacts.require('PoolseaNodeDistributorDelegate.sol'),
    poolseaMinipoolFactory: artifacts.require('PoolseaMinipoolFactory.sol'),
    poolseaNetworkFees: artifacts.require('PoolseaNetworkFees.sol'),
    poolseaNetworkPrices: artifacts.require('PoolseaNetworkPrices.sol'),
    poolseaMinipoolBase: artifacts.require('PoolseaMinipoolBase.sol'),
    poolseaNodeManager: artifacts.require('PoolseaNodeManager.sol'),
    poolseaDAONodeTrustedSettingsMinipool: artifacts.require('PoolseaDAONodeTrustedSettingsMinipool.sol'),
    poolseaDAOProtocolSettingsNode: artifacts.require('PoolseaDAOProtocolSettingsNode.sol'),
    poolseaNetworkBalances: artifacts.require('PoolseaNetworkBalances.sol'),
    poolseaRewardsPool: artifacts.require('PoolseaRewardsPool.sol'),
    poolseaMinipoolBondReducer: artifacts.require('PoolseaMinipoolBondReducer.sol'),
    poolseaUpgradeOneDotTwo: artifacts.require('PoolseaUpgradeOneDotTwo.sol'),
};

// Construct ABI for poolseaMinipool
const poolseaMinipoolAbi = []
    .concat(artifacts.require('PoolseaMinipoolDelegate.sol').abi)
    .concat(artifacts.require('PoolseaMinipoolBase.sol').abi)
    .filter(i => i.type !== 'fallback' && i.type !== 'receive');

poolseaMinipoolAbi.push({ stateMutability: 'payable', type: 'fallback'});
poolseaMinipoolAbi.push({ stateMutability: 'payable', type: 'receive'});

/*** Deployment **********************/

// Upgrade poolsea Pool
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

    let poolseaStorageInstance = await poolseaStorage.at(process.env.ROCKET_STORAGE);

    // Deploy other contracts - have to be inside an async loop
    const deployContracts = async function() {
        for (let contract in contracts) {
            // Only deploy if it hasn't been deployed already like a precompiled
            if (!contracts[contract].hasOwnProperty('precompiled')) {
                let instance;

                switch (contract) {
                    // Contracts with no constructor args
                    case 'poolseaMinipoolDelegate':
                    case 'poolseaNodeDistributorDelegate':
                    case 'poolseaMinipoolBase':
                        instance = await contracts[contract].new();
                        contracts[contract].setAsDeployed(instance);
                        break;

                    // Upgrade rewards
                    case 'poolseaUpgradeOneDotTwo':
                        instance = await contracts[contract].new(poolseaStorageInstance.address);
                        contracts[contract].setAsDeployed(instance);
                        const args = [
                            [
                                // compressABI(contracts.poolseaContract.abi),
                                (await contracts.poolseaNodeDeposit.deployed()).address,
                                (await contracts.poolseaMinipoolDelegate.deployed()).address,
                                (await contracts.poolseaDAOProtocolSettingsMinipool.deployed()).address,
                                (await contracts.poolseaMinipoolQueue.deployed()).address,
                                (await contracts.poolseaDepositPool.deployed()).address,
                                (await contracts.poolseaDAOProtocolSettingsDeposit.deployed()).address,
                                (await contracts.poolseaMinipoolManager.deployed()).address,
                                (await contracts.poolseaNodeStaking.deployed()).address,
                                (await contracts.poolseaNodeDistributorDelegate.deployed()).address,
                                (await contracts.poolseaMinipoolFactory.deployed()).address,
                                (await contracts.poolseaNetworkFees.deployed()).address,
                                (await contracts.poolseaNetworkPrices.deployed()).address,
                                (await contracts.poolseaDAONodeTrustedSettingsMinipool.deployed()).address,
                                (await contracts.poolseaNodeManager.deployed()).address,
                                (await contracts.poolseaDAOProtocolSettingsNode.deployed()).address,
                                (await contracts.poolseaNetworkBalances.deployed()).address,
                                (await contracts.poolseaRewardsPool.deployed()).address,
                                (await contracts.poolseaMinipoolBase.deployed()).address,
                                (await contracts.poolseaMinipoolBondReducer.deployed()).address,
                            ],
                            [
                                // compressABI(contracts.poolseaContract.abi),
                                compressABI(contracts.poolseaNodeDeposit.abi),
                                compressABI(contracts.poolseaMinipoolDelegate.abi),
                                compressABI(contracts.poolseaDAOProtocolSettingsMinipool.abi),
                                compressABI(contracts.poolseaMinipoolQueue.abi),
                                compressABI(contracts.poolseaDepositPool.abi),
                                compressABI(contracts.poolseaDAOProtocolSettingsDeposit.abi),
                                compressABI(contracts.poolseaMinipoolManager.abi),
                                compressABI(contracts.poolseaNodeStaking.abi),
                                compressABI(contracts.poolseaNodeDistributorDelegate.abi),
                                compressABI(contracts.poolseaMinipoolFactory.abi),
                                compressABI(contracts.poolseaNetworkFees.abi),
                                compressABI(contracts.poolseaNetworkPrices.abi),
                                compressABI(contracts.poolseaDAONodeTrustedSettingsMinipool.abi),
                                compressABI(contracts.poolseaNodeManager.abi),
                                compressABI(contracts.poolseaDAOProtocolSettingsNode.abi),
                                compressABI(contracts.poolseaNetworkBalances.abi),
                                compressABI(contracts.poolseaRewardsPool.abi),
                                compressABI(contracts.poolseaMinipoolBase.abi),
                                compressABI(contracts.poolseaMinipoolBondReducer.abi),
                                compressABI(poolseaMinipoolAbi),
                            ],
                        ];
                        await instance.set(...args);
                        await instance.execute();
                        break;

                    // All other contracts - pass storage address
                    default:
                        console.log(`  ABI: ${compressABI(contracts[contract].abi)}`);
                        instance = await contracts[contract].new(poolseaStorageInstance.address);
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
    const upgradeContract = (await contracts.poolseaUpgradeOneDotTwo.deployed());
    await upgradeContract.lock();

    // Store deployed block
    console.log('\n');
    console.log('\x1b[32m%s\x1b[0m', '  Deployment complete :)');
    console.log('\n');
};

upgrade().then(function() {
    process.exit(0);
})
