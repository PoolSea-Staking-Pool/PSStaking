/*** Dependencies ********************/
import { PoolseaStorage } from '../_utils/artifacts';

const hre = require('hardhat');
const pako = require('pako');
const fs = require('fs');
const Web3 = require('web3');


/*** Utility Methods *****************/


// Compress / decompress ABIs
function compressABI(abi) {
    return Buffer.from(pako.deflate(JSON.stringify(abi))).toString('base64');
}
function decompressABI(abi) {
    return JSON.parse(pako.inflate(Buffer.from(abi, 'base64'), {to: 'string'}));
}

// Load ABI files and parse
function loadABI(abiFilePath) {
    return JSON.parse(fs.readFileSync(abiFilePath));
}


/*** Contracts ***********************/


// Storage
const poolseaStorage =                       artifacts.require('PoolseaStorage.sol');

// Network contracts
const contracts = {
    // Vault
    poolseaVault:                              artifacts.require('PoolseaVault.sol'),
    // Tokens
    poolseaTokenRPLFixedSupply:                artifacts.require('PoolseaTokenDummyRPL.sol'),
    poolseaTokenRETH:                          artifacts.require('PoolseaTokenRETH.sol'),
    poolseaTokenRPL:                           artifacts.require('PoolseaTokenRPL.sol'),
    // Auction
    poolseaAuctionManager:                     artifacts.require('PoolseaAuctionManager.sol'),
    // Deposit
    poolseaDepositPool:                        artifacts.require('PoolseaDepositPoolOld.sol'),
    // Minipool
    poolseaMinipoolDelegate:                   artifacts.require('PoolseaMinipoolDelegateOld.sol'),
    poolseaMinipoolManager:                    artifacts.require('PoolseaMinipoolManagerOld.sol'),
    poolseaMinipoolQueue:                      artifacts.require('PoolseaMinipoolQueueOld.sol'),
    poolseaMinipoolStatus:                     artifacts.require('PoolseaMinipoolStatus.sol'),
    poolseaMinipoolPenalty:                    artifacts.require('PoolseaMinipoolPenalty.sol'),
    // Network
    poolseaNetworkBalances:                    artifacts.require('PoolseaNetworkBalancesOld.sol'),
    poolseaNetworkFees:                        artifacts.require('PoolseaNetworkFeesOld.sol'),
    poolseaNetworkPrices:                      artifacts.require('PoolseaNetworkPricesOld.sol'),
    poolseaNetworkPenalties:                   artifacts.require('PoolseaNetworkPenalties.sol'),
    // Rewards
    poolseaRewardsPool:                        artifacts.require('PoolseaRewardsPoolOld.sol'),
    poolseaClaimDAO:                           artifacts.require('PoolseaClaimDAO.sol'),
    // Node
    poolseaNodeDeposit:                        artifacts.require('PoolseaNodeDepositOld.sol'),
    poolseaNodeManager:                        artifacts.require('PoolseaNodeManagerOld.sol'),
    poolseaNodeStaking:                        artifacts.require('PoolseaNodeStakingOld.sol'),
    // DAOs
    poolseaDAOProposal:                        artifacts.require('PoolseaDAOProposal.sol'),
    poolseaDAONodeTrusted:                     artifacts.require('PoolseaDAONodeTrusted.sol'),
    poolseaDAONodeTrustedProposals:            artifacts.require('PoolseaDAONodeTrustedProposals.sol'),
    poolseaDAONodeTrustedActions:              artifacts.require('PoolseaDAONodeTrustedActions.sol'),
    poolseaDAONodeTrustedUpgrade:              artifacts.require('PoolseaDAONodeTrustedUpgrade.sol'),
    poolseaDAONodeTrustedSettingsMembers:      artifacts.require('PoolseaDAONodeTrustedSettingsMembers.sol'),
    poolseaDAONodeTrustedSettingsProposals:    artifacts.require('PoolseaDAONodeTrustedSettingsProposals.sol'),
    poolseaDAONodeTrustedSettingsMinipool:     artifacts.require('PoolseaDAONodeTrustedSettingsMinipoolOld.sol'),
    poolseaDAOProtocol:                        artifacts.require('PoolseaDAOProtocol.sol'),
    poolseaDAOProtocolProposals:               artifacts.require('PoolseaDAOProtocolProposals.sol'),
    poolseaDAOProtocolActions:                 artifacts.require('PoolseaDAOProtocolActions.sol'),
    poolseaDAOProtocolSettingsInflation:       artifacts.require('PoolseaDAOProtocolSettingsInflation.sol'),
    poolseaDAOProtocolSettingsRewards:         artifacts.require('PoolseaDAOProtocolSettingsRewards.sol'),
    poolseaDAOProtocolSettingsAuction:         artifacts.require('PoolseaDAOProtocolSettingsAuction.sol'),
    poolseaDAOProtocolSettingsNode:            artifacts.require('PoolseaDAOProtocolSettingsNodeOld.sol'),
    poolseaDAOProtocolSettingsNetwork:         artifacts.require('PoolseaDAOProtocolSettingsNetwork.sol'),
    poolseaDAOProtocolSettingsDeposit:         artifacts.require('PoolseaDAOProtocolSettingsDepositOld.sol'),
    poolseaDAOProtocolSettingsMinipool:        artifacts.require('PoolseaDAOProtocolSettingsMinipoolOld.sol'),
    // v1.1
    poolseaMerkleDistributorMainnet:           artifacts.require('PoolseaMerkleDistributorMainnet.sol'),
    poolseaDAONodeTrustedSettingsRewards:      artifacts.require('PoolseaDAONodeTrustedSettingsRewards.sol'),
    poolseaSmoothingPool:                      artifacts.require('PoolseaSmoothingPool.sol'),
    poolseaNodeDistributorFactory:             artifacts.require('PoolseaNodeDistributorFactory.sol'),
    poolseaNodeDistributorDelegate:            artifacts.require('PoolseaNodeDistributorDelegateOld.sol'),
    poolseaMinipoolFactory:                    artifacts.require('PoolseaMinipoolFactoryOld.sol'),
    // v1.2
    poolseaNodeDepositNew:                     artifacts.require('PoolseaNodeDeposit.sol'),
    poolseaMinipoolDelegateNew:                artifacts.require('PoolseaMinipoolDelegate.sol'),
    poolseaDAOProtocolSettingsMinipoolNew:     artifacts.require('PoolseaDAOProtocolSettingsMinipool.sol'),
    poolseaMinipoolQueueNew:                   artifacts.require('PoolseaMinipoolQueue.sol'),
    poolseaDepositPoolNew:                     artifacts.require('PoolseaDepositPool.sol'),
    poolseaDAOProtocolSettingsDepositNew:      artifacts.require('PoolseaDAOProtocolSettingsDeposit.sol'),
    poolseaMinipoolManagerNew:                 artifacts.require('PoolseaMinipoolManager.sol'),
    poolseaNodeStakingNew:                     artifacts.require('PoolseaNodeStaking.sol'),
    poolseaNodeDistributorDelegateNew:         artifacts.require('PoolseaNodeDistributorDelegate.sol'),
    poolseaMinipoolFactoryNew:                 artifacts.require('PoolseaMinipoolFactory.sol'),
    poolseaNetworkFeesNew:                     artifacts.require('PoolseaNetworkFees.sol'),
    poolseaNetworkPricesNew:                   artifacts.require('PoolseaNetworkPrices.sol'),
    poolseaMinipoolBase:                       artifacts.require('PoolseaMinipoolBase.sol'),
    poolseaDAONodeTrustedSettingsMinipoolNew:  artifacts.require('PoolseaDAONodeTrustedSettingsMinipool.sol'),
    poolseaNodeManagerNew:                     artifacts.require('PoolseaNodeManager.sol'),
    poolseaDAOProtocolSettingsNodeNew:         artifacts.require('PoolseaDAOProtocolSettingsNode.sol'),
    poolseaRewardsPoolNew:                     artifacts.require('PoolseaRewardsPool.sol'),
    poolseaMinipoolBondReducer:                artifacts.require('PoolseaMinipoolBondReducer.sol'),
    poolseaNetworkBalancesNew:                 artifacts.require('PoolseaNetworkBalances.sol'),
    poolseaUpgradeOneDotTwo:                   artifacts.require('PoolseaUpgradeOneDotTwo.sol'),
    // Utils
    addressQueueStorage:                      artifacts.require('AddressQueueStorage.sol'),
    addressSetStorage:                        artifacts.require('AddressSetStorage.sol'),
    casperDeposit: artifacts.require('DepositContract.sol')
};

// Development helper contracts
const revertOnTransfer = artifacts.require('RevertOnTransfer.sol');
const poolseaNodeDepositLEB4 = artifacts.require('PoolseaNodeDepositLEB4.sol');

// Instance contract ABIs
const abis = {
    // Minipool
    poolseaMinipool:                           [artifacts.require('PoolseaMinipoolDelegateOld.sol'), artifacts.require('PoolseaMinipoolOld.sol')],
};

// Construct ABI for poolseaMinipool
const poolseaMinipoolAbi = []
    .concat(artifacts.require('PoolseaMinipoolDelegate.sol').abi)
    .concat(artifacts.require('PoolseaMinipoolBase.sol').abi)
    .filter(i => i.type !== 'fallback' && i.type !== 'receive');

poolseaMinipoolAbi.push({ stateMutability: 'payable', type: 'fallback'});
poolseaMinipoolAbi.push({ stateMutability: 'payable', type: 'receive'});

/*** Deployment **********************/


// Deploy poolsea Pool
export async function deployPoolseaPool() {
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
    if(hre.network.name === 'hardhat'){
        const impAddress = '0xA592ED65885bcbCeb30442F4902a0D1Cf3AcB8fC'
        await hre.network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [impAddress],
        });
        const balance = await $web3.eth.getBalance(impAddress);
        console.log('Impersonated account balance:', $web3.utils.fromWei(balance));
        await Promise.all([accounts[0], accounts[1], accounts[3], accounts[2], accounts[4], accounts[5], accounts[6]].map(addr => (
            $web3.eth.sendTransaction({
                from: impAddress,
                to: addr,
                value: '640000000'.ether
            })
        )))
    }

    console.log(`Using network: ${network.name}`);
    console.log(`Deploying from: ${accounts[0]}`)
    console.log('\n');

    const casperDepositABI = loadABI('./contracts/contract/casper/compiled/Deposit.abi');

    // Live deployment
    if ( network.name === 'live' ) {
        // Casper live contract address
        let casperDepositAddress = '0x00000000219ab540356cBB839Cbe05303d7705Fa';
        contracts.casperDeposit = {
            address: casperDepositAddress,
            abi: casperDepositABI,
            precompiled: true
        };
        // Add our live RPL token address in place
        contracts.poolseaTokenRPLFixedSupply.address = '0xb4efd85c19999d84251304bda99e90b92300bd93';
    }

    // Goerli test network
    else if (network.name === 'goerli') {
        // Casper deposit contract details
        const casperDepositAddress = '0xff50ed3d0ec03ac01d4c79aad74928bff48a7b2b';       // Prater
        contracts.casperDeposit = {
            address: casperDepositAddress,
            abi: casperDepositABI,
            precompiled: true
        };
    }

    // Test network deployment
    else {
        // // Precompiled - Casper Deposit Contract
        // const casperDeposit = new $web3.eth.Contract(casperDepositABI, null, {
        //     from: accounts[0],
        //     gasPrice: '20000000000' // 20 gwei
        // });
        //
        // // Create the contract now
        // const casperDepositContract = await casperDeposit.deploy(
        //     // Casper deployment
        //     {
        //         data: fs.readFileSync('./contracts/contract/casper/compiled/Deposit.bin').toString()
        //     }).send({
        //     from: accounts[0],
        //     gas: 8000000,
        //     gasPrice: '20000000000'
        // });
        //
        // // Set the Casper deposit address
        // let casperDepositAddress = casperDepositContract._address;
        //
        // // Store it in storage
        // contracts.casperDeposit = {
        //     address: casperDepositAddress,
        //     abi: casperDepositABI,
        //     precompiled: true
        // };

        // const instance = await artifacts.require('DepositContract.sol').new();
        // contracts.casperDeposit = {
        //     address: artifacts.require('DepositContract.sol').setAsDeployed(instance),
        //     abi: casperDepositABI,
        //     precompiled: true,
        // };
    }

    // Deploy poolseaStorage first - has to be done in this order so that the following contracts already know the storage address
    const rs = await poolseaStorage.new();
    poolseaStorage.setAsDeployed(rs);
    const rsTx = await $web3.eth.getTransactionReceipt(rs.transactionHash);
    const deployBlock = rsTx.blockNumber;
    // Update the storage with the new addresses
    let poolseaStorageInstance = await poolseaStorage.deployed();

    // Deploy other contracts - have to be inside an async loop
    const deployContracts = async function() {
        for (let contract in contracts) {
            // Only deploy if it hasn't been deployed already like a precompiled
            let instance
            if(!contracts[contract].hasOwnProperty('precompiled')) {
                switch (contract) {

                    // New RPL contract - pass storage address & existing RPL contract address
                    case 'poolseaTokenRPL':
                        instance = await contracts[contract].new(poolseaStorageInstance.address, (await contracts.poolseaTokenRPLFixedSupply.deployed()).address);
                        contracts[contract].setAsDeployed(instance);
                        break;

                    // Contracts with no constructor args
                    case 'poolseaMinipoolDelegate':
                    case 'poolseaNodeDistributorDelegate':
                    case 'poolseaNodeDistributorDelegateNew':
                    case 'poolseaMinipoolBase':
                    case 'casperDeposit':
                        instance = await contracts[contract].new();
                        contracts[contract].setAsDeployed(instance);
                        break;

                    // Upgrade rewards
                    case 'poolseaUpgradeOneDotTwo':
                        const upgrader = await contracts[contract].new(poolseaStorageInstance.address);
                        contracts[contract].setAsDeployed(upgrader);
                        const args = [
                            [
                                // compressABI(contracts.poolseaContract.abi),
                                (await contracts.poolseaNodeDepositNew.deployed()).address,
                                (await contracts.poolseaMinipoolDelegateNew.deployed()).address,
                                (await contracts.poolseaDAOProtocolSettingsMinipoolNew.deployed()).address,
                                (await contracts.poolseaMinipoolQueueNew.deployed()).address,
                                (await contracts.poolseaDepositPoolNew.deployed()).address,
                                (await contracts.poolseaDAOProtocolSettingsDepositNew.deployed()).address,
                                (await contracts.poolseaMinipoolManagerNew.deployed()).address,
                                (await contracts.poolseaNodeStakingNew.deployed()).address,
                                (await contracts.poolseaNodeDistributorDelegateNew.deployed()).address,
                                (await contracts.poolseaMinipoolFactoryNew.deployed()).address,
                                (await contracts.poolseaNetworkFeesNew.deployed()).address,
                                (await contracts.poolseaNetworkPricesNew.deployed()).address,
                                (await contracts.poolseaDAONodeTrustedSettingsMinipoolNew.deployed()).address,
                                (await contracts.poolseaNodeManagerNew.deployed()).address,
                                (await contracts.poolseaDAOProtocolSettingsNodeNew.deployed()).address,
                                (await contracts.poolseaNetworkBalancesNew.deployed()).address,
                                (await contracts.poolseaRewardsPoolNew.deployed()).address,
                                (await contracts.poolseaMinipoolBase.deployed()).address,
                                (await contracts.poolseaMinipoolBondReducer.deployed()).address,
                            ],
                            [
                                // compressABI(contracts.poolseaContract.abi),
                                compressABI(contracts.poolseaNodeDepositNew.abi),
                                compressABI(contracts.poolseaMinipoolDelegateNew.abi),
                                compressABI(contracts.poolseaDAOProtocolSettingsMinipoolNew.abi),
                                compressABI(contracts.poolseaMinipoolQueueNew.abi),
                                compressABI(contracts.poolseaDepositPoolNew.abi),
                                compressABI(contracts.poolseaDAOProtocolSettingsDepositNew.abi),
                                compressABI(contracts.poolseaMinipoolManagerNew.abi),
                                compressABI(contracts.poolseaNodeStakingNew.abi),
                                compressABI(contracts.poolseaNodeDistributorDelegateNew.abi),
                                compressABI(contracts.poolseaMinipoolFactoryNew.abi),
                                compressABI(contracts.poolseaNetworkFeesNew.abi),
                                compressABI(contracts.poolseaNetworkPricesNew.abi),
                                compressABI(contracts.poolseaDAONodeTrustedSettingsMinipoolNew.abi),
                                compressABI(contracts.poolseaNodeManagerNew.abi),
                                compressABI(contracts.poolseaDAOProtocolSettingsNodeNew.abi),
                                compressABI(contracts.poolseaNetworkBalancesNew.abi),
                                compressABI(contracts.poolseaRewardsPoolNew.abi),
                                compressABI(contracts.poolseaMinipoolBase.abi),
                                compressABI(contracts.poolseaMinipoolBondReducer.abi),
                                compressABI(poolseaMinipoolAbi),
                            ],
                        ]
                        await upgrader.set(...args)
                        break;

                    // All other contracts - pass storage address
                    default:
                        instance = await contracts[contract].new(poolseaStorageInstance.address);
                        contracts[contract].setAsDeployed(instance);
                        // Slight hack to allow gas optimisation using immutable addresses for non-upgradable contracts
                        if (contract === 'poolseaVault' || contract === 'poolseaTokenRETH') {
                            await poolseaStorageInstance.setAddress(
                                $web3.utils.soliditySha3('contract.address', contract),
                                (await contracts[contract].deployed()).address
                            );
                        }
                        break;

                }
            }
        }
    };
    // Run it
    await deployContracts();

    // Register all other contracts with storage and store their abi
    const addContracts = async function() {
        // Log poolseaStorage
        console.log('\x1b[31m%s\x1b[0m:', '   Set Storage Address');
        console.log('     ' + (await poolseaStorage.deployed()).address);
        // Add poolsea Storage to deployed contracts
        contracts.poolseaStorage = artifacts.require('PoolseaStorage.sol');
        // Now process the rest
        for (let contract in contracts) {
            if(contracts.hasOwnProperty(contract)) {
                switch (contract) {
                    // Ignore contracts that will be upgraded later
                    case 'poolseaNodeDepositNew':
                    case 'poolseaMinipoolDelegateNew':
                    case 'poolseaDAOProtocolSettingsMinipoolNew':
                    case 'poolseaMinipoolQueueNew':
                    case 'poolseaDepositPoolNew':
                    case 'poolseaDAOProtocolSettingsDepositNew':
                    case 'poolseaMinipoolManagerNew':
                    case 'poolseaNodeStakingNew':
                    case 'poolseaNodeDistributorDelegateNew':
                    case 'poolseaMinipoolFactoryNew':
                    case 'poolseaNetworkFeesNew':
                    case 'poolseaNetworkPricesNew':
                    case 'poolseaDAONodeTrustedSettingsMinipoolNew':
                    case 'poolseaNodeManagerNew':
                    case 'poolseaDAOProtocolSettingsNodeNew':
                    case 'poolseaNetworkBalancesNew':
                    case 'poolseaRewardsPoolNew':
                    case 'poolseaMinipoolBase':
                    case 'poolseaMinipoolBondReducer':
                        break;

                    default:
                        const address = contract === 'casperDeposit' && hre.network.name !== 'hardhat' ? contracts[contract].address : (await contracts[contract].deployed()).address;

                        // Log it
                        console.log('\x1b[31m%s\x1b[0m:', '   Set Storage ' + contract + ' Address');
                        console.log('     ' + address);
                        // Register the contract address as part of the network
                        await poolseaStorageInstance.setBool(
                            $web3.utils.soliditySha3('contract.exists', address),
                            true
                        );
                        // Register the contract's name by address
                        await poolseaStorageInstance.setString(
                            $web3.utils.soliditySha3('contract.name', address),
                            contract
                        );
                        // Register the contract's address by name (poolseaVault and poolseaTokenRETH addresses already stored)
                        if (!(contract === 'poolseaVault' || contract === 'poolseaTokenRETH')) {
                            await poolseaStorageInstance.setAddress(
                                $web3.utils.soliditySha3('contract.address', contract),
                                address
                            );
                        }
                        // Compress and store the ABI by name
                        await poolseaStorageInstance.setString(
                            $web3.utils.soliditySha3('contract.abi', contract),
                            compressABI(contracts[contract].abi)
                        );
                        break;
                }
            }
        }
    };

    // Register ABI-only contracts
    const addABIs = async function() {
        for (let contract in abis) {
            if(abis.hasOwnProperty(contract)) {
                console.log('\x1b[31m%s\x1b[0m:', '   Set Storage ABI');
                console.log('     '+contract);
                if(Array.isArray(abis[contract])) {
                    // Merge ABIs from multiple artifacts
                    let combinedAbi = [];
                    for (const artifact of abis[contract]) {
                        combinedAbi = combinedAbi.concat(artifact.abi);
                    }
                    // Compress and store the ABI
                    await poolseaStorageInstance.setString(
                        $web3.utils.soliditySha3('contract.abi', contract),
                        compressABI(combinedAbi)
                    );
                } else {
                    // Compress and store the ABI
                    await poolseaStorageInstance.setString(
                        $web3.utils.soliditySha3('contract.abi', contract),
                        compressABI(abis[contract].abi)
                    );
                }
            }
        }
    };

    // Run it
    console.log('\x1b[34m%s\x1b[0m', '  Deploy Contracts');
    console.log('\x1b[34m%s\x1b[0m', '  ******************************************');
    await addContracts();
    console.log('\n');
    console.log('\x1b[34m%s\x1b[0m', '  Set ABI Only Storage');
    console.log('\x1b[34m%s\x1b[0m', '  ******************************************');
    await addABIs();

    // Store deployed block
    console.log('\n');
    console.log('Setting deploy.block to ' + deployBlock);
    await poolseaStorageInstance.setUint(
        $web3.utils.soliditySha3('deploy.block'),
        deployBlock
    );

    // Disable direct access to storage now
    await poolseaStorageInstance.setDeployedStatus();
    if(await poolseaStorageInstance.getDeployedStatus() !== true) throw 'Storage Access Not Locked Down!!';

    // Log it
    console.log('\n');
    console.log('\x1b[32m%s\x1b[0m', '  Storage Direct Access For Owner Removed... Lets begin! :)');
    console.log('\n');

    // Deploy development help contracts
    if (network.name !== 'live' && network.name !== 'goerli') {
        let instance = await revertOnTransfer.new();
        revertOnTransfer.setAsDeployed(instance);

        instance = await poolseaNodeDepositLEB4.new(poolseaStorageInstance.address);
        poolseaNodeDepositLEB4.setAsDeployed(instance);
    }

    // Perform upgrade if we are not running in test environment
    if (network.name !== 'hardhat') {
        console.log('Executing upgrade to v1.2')
        const PoolseaUpgradeOneDotTwo = artifacts.require('PoolseaUpgradeOneDotTwo')
        const poolseaUpgradeOneDotTwo = await PoolseaUpgradeOneDotTwo.deployed();
        await poolseaUpgradeOneDotTwo.execute({ from: accounts[0] });
    }
};
