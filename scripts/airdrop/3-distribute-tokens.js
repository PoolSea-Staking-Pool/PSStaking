import {readFile} from "fs/promises";
import {BigNumber} from "@ethersproject/bignumber";

const hre = require('hardhat');
const Web3 = require('web3');
const { utils } = require("ethers");
const multicallABI = require('./multicallABI.json')

const MULTICALL_ADDRESS = '0x761EAED926dD198b051039713c6B4922d17fb99a'

const chunk = (arr, size) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );

export async function main() {
    const airdropDataJSON = await readFile("./scripts/airdrop/amount-by-address.json")
    const airdropData = JSON.parse(airdropDataJSON);
    const totalToApprove = BigNumber.from(airdropData.total.toString())

    const storageContractAddress = process.env.ROCKET_STORAGE;
    if(!storageContractAddress) {
        console.log("Invalid storage address.")
        return
    }
    const storage = artifacts.require('PoolseaStorage');
    const poolToken = artifacts.require('PoolseaTokenPOOL');

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
    const poolAddr = await deployedContractStorage.getAddress(encodedRPL)

    const addresses = Object.keys(airdropData.data)
    console.log("Total users: ", addresses.length)

    const multicall = new $web3.eth.Contract(multicallABI, MULTICALL_ADDRESS);
    const deployedContractPOOLToken = await poolToken.at(poolAddr);
    await deployedContractPOOLToken.approve(MULTICALL_ADDRESS, totalToApprove)

    const calls = addresses.map(addr => {
        const amountBN = airdropData.data[addr].toString()
        const encodedCall = $web3.eth.abi.encodeFunctionCall({
            name: 'transferFrom',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'sender'
            },{
                type: 'address',
                name: 'recipient'
            },{
                type: 'uint256',
                name: 'amount'
            }]
        }, [accounts[0], addr, amountBN])
        return {
            target: poolAddr,
            callData: encodedCall
        }
    })
    const chunksCall = chunk(calls, 200)

    let promiseChain = Promise.resolve()
    chunksCall.forEach((call, index) => {
        promiseChain = promiseChain.then(async () => {
            console.log('Transferring portion %s from %s. Items count: %s ...', index+1, chunksCall.length, call.length)
            const tx = await multicall.methods.aggregate(call).send({from: accounts[0]})
            console.log('Transferred portion %s! Tx hash: %s', index+1, tx.transactionHash)
        })
    })
    await promiseChain
    process.exit(1)
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
