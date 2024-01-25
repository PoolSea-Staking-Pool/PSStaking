import {Contract} from "ethers";

const hre = require('hardhat');
const Web3 = require('web3');
const { ContractFactory, ethers } = require("ethers");
const { encodeSqrtRatioX96 } = require('@uniswap/v3-sdk')
const bn = require('bignumber.js')
bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })
const WPLS = require('./WPLS.json')

const addresses = {
    poolToken: '0xe53851D6963949113D8a290C6DDd4917a10F05Ef',
    wpls: '0x70499adEBB11Efd915E3b69E700c331778628707',
    factory: '0xBf9271F872b518F6f80EdF56f67d504A6ECeF66E',
    poolWplsPool: '0xa4C6e3Bd1382c09B3695D75F0E6Dc8a30c9dc8ad',
    swapRouter: '0x8D8a67CF4A848c14DC2Cf16ceA4228619479DbF0',
    nftDescriptor: '0x08b3CF886665CAe52896AB3B94ac81e5Ed35E026',
    posManager: '0x62cE47D9Cd50Fe45b3eED6FFe325933d592BE418'
}

const artifacts = {
    UniswapV3Factory: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"),
    SwapRouter: require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
    NFTDescriptor: require("@uniswap/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json"),
    NonfungibleTokenPositionDescriptor: require("@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json"),
    NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
    WPLS,
    UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
};

const linkLibraries = ({ bytecode, linkReferences }, libraries) => {
    Object.keys(linkReferences).forEach((fileName) => {
        Object.keys(linkReferences[fileName]).forEach((contractName) => {
            if (!libraries.hasOwnProperty(contractName)) {
                throw new Error(`Missing link library name ${contractName}`)
            }
            const address = ethers.utils
                .getAddress(libraries[contractName])
                .toLowerCase()
                .slice(2)
            linkReferences[fileName][contractName].forEach(
                ({ start, length }) => {
                    const start2 = 2 + start * 2
                    const length2 = length * 2
                    bytecode = bytecode
                        .slice(0, start2)
                        .concat(address)
                        .concat(bytecode.slice(start2 + length2, bytecode.length))
                }
            )
        })
    })
    return bytecode
}

export async function main() {
    const network = hre.network;
    let $web3 = new Web3(network.provider);
    const [owner] = await hre.ethers.getSigners();

    // Accounts
    let accounts = await $web3.eth.getAccounts(function(error, result) {
        if(error != null) {
            console.log(error);
            console.log("Error retrieving accounts.'");
        }
        return result;
    });

    if(!$web3.utils.isAddress(addresses.wpls) || !$web3.utils.isAddress(addresses.poolToken)){
        console.error("Invalid WPLS address")
        return
    }

    let factory;
    if($web3.utils.isAddress(addresses.factory)){
        factory = new $web3.eth.Contract(artifacts.UniswapV3Factory.abi, addresses.factory)
    }else{
        const Factory = new $web3.eth.Contract(artifacts.UniswapV3Factory.abi)
        factory = await Factory.deploy({data: artifacts.UniswapV3Factory.bytecode})
            .send({
                from: accounts[0]
            });
    }

    let swapRouter;
    if($web3.utils.isAddress(addresses.swapRouter)){
        swapRouter = new $web3.eth.Contract(artifacts.SwapRouter.abi, addresses.swapRouter)
    }else{
        const SwapRouter = new $web3.eth.Contract(artifacts.SwapRouter.abi)
        swapRouter = await SwapRouter.deploy({
            data: artifacts.SwapRouter.bytecode,
            arguments: [factory._address, addresses.wpls]
        })
            .send({
                from: accounts[0]
            });
    }

    let nftDescriptor;
    if($web3.utils.isAddress(addresses.nftDescriptor)){
        nftDescriptor = new $web3.eth.Contract(artifacts.NFTDescriptor.abi, addresses.nftDescriptor)
    }else{
        const NFTDescriptor = new $web3.eth.Contract(artifacts.NFTDescriptor.abi)
        nftDescriptor = await NFTDescriptor.deploy({
            data: artifacts.NFTDescriptor.bytecode,
        })
            .send({
                from: accounts[0]
            });
    }

    const linkedBytecode = linkLibraries(
        {
            bytecode: artifacts.NonfungibleTokenPositionDescriptor.bytecode,
            linkReferences: {
                "NFTDescriptor.sol": {
                    NFTDescriptor: [
                        {
                            length: 20,
                            start: 1681,
                        },
                    ],
                },
            },
        },
        {
            NFTDescriptor: nftDescriptor._address,
        }
    );

    let nonfungiblePositionManager;
    if($web3.utils.isAddress(addresses.posManager)){
        nonfungiblePositionManager = new $web3.eth.Contract(artifacts.NonfungiblePositionManager.abi, addresses.posManager)
    }else{
        const NonfungibleTokenPositionDescriptor = new ContractFactory(artifacts.NonfungibleTokenPositionDescriptor.abi, linkedBytecode, owner);
        const nonfungibleTokenPositionDescriptor = await NonfungibleTokenPositionDescriptor.deploy(addresses.wpls, ethers.utils.formatBytes32String('WPLS'));

        const NonfungiblePositionManager = new $web3.eth.Contract(artifacts.NonfungiblePositionManager.abi)
        nonfungiblePositionManager = await NonfungiblePositionManager.deploy({
            data: artifacts.NonfungiblePositionManager.bytecode,
            arguments: [factory._address, addresses.wpls, nonfungibleTokenPositionDescriptor.address]
        }).send({
            from: accounts[0]
        });
    }

    console.log('WPLS_ADDRESS=', `'${addresses.wpls}'`)
    console.log('FACTORY_ADDRESS=', `'${factory._address}'`)
    console.log('SWAP_ROUTER_ADDRESS=', `'${swapRouter._address}'`)
    console.log('NFT_DESCRIPTOR_ADDRESS=', `'${nftDescriptor._address}'`)
    console.log('POSITION_MANAGER_ADDRESS=', `'${nonfungiblePositionManager._address}'`)

    await nonfungiblePositionManager.methods.createAndInitializePoolIfNecessary(
        addresses.wpls,
        addresses.poolToken,
        3000,
        encodeSqrtRatioX96(1, 1),
    ).send({from: accounts[0]})
    const poolAddress = await factory.methods.getPool(
        addresses.wpls,
        addresses.poolToken,
        3000
    ).call()

    const poolContract = new Contract(poolAddress, artifacts.UniswapV3Pool.abi, owner)
    const price = await poolContract.slot0()
    console.log("Price: ", +price[0])

    console.log('Pool WPLS-POOL address: ', poolAddress)
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
