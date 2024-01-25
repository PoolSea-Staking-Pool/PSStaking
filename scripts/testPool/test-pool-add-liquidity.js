const hre = require('hardhat');
const {utils, Contract, ethers} = require("ethers");
const {Token} = require('@uniswap/sdk-core')
const {Pool, Position, nearestUsableTick, TickMath} = require('@uniswap/v3-sdk')

const addresses = {
    poolToken: '0xe53851D6963949113D8a290C6DDd4917a10F05Ef',
    wpls: '0x70499adEBB11Efd915E3b69E700c331778628707',
    poolWplsPool: '0xa4C6e3Bd1382c09B3695D75F0E6Dc8a30c9dc8ad',
    posManager: '0x62cE47D9Cd50Fe45b3eED6FFe325933d592BE418'
}

const WPLS = require('./WPLS.json')
const POOL = require('../../artifacts/contracts/contract/token/PoolseaTokenPOOL.sol/PoolseaTokenPOOL.json')

const artifacts = {
    NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
    WPLS,
    POOL,
    UniswapV3Pool: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json"),
};

async function getPoolData(poolContract) {
    const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
        poolContract.tickSpacing(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0(),
    ])

    return {
        tickSpacing: tickSpacing,
        fee: fee,
        liquidity: liquidity,
        sqrtPriceX96: slot0[0],
        tick: slot0[1],
    }
}


export async function main() {
    const [owner] = await hre.ethers.getSigners();


    if (!utils.isAddress(addresses.wpls) || !utils.isAddress(addresses.poolToken) || !utils.isAddress(addresses.posManager) || !utils.isAddress(addresses.poolWplsPool)) {
        console.error("Some address is incorrect")
        return
    }

    const wplsContract = new Contract(addresses.wpls, artifacts.WPLS, owner)
    const poolTokenContract = new Contract(addresses.poolToken, artifacts.POOL.abi, owner)

    // await wplsContract.approve(addresses.posManager, ethers.utils.parseEther(AMOUNT_TO_ADD))
    // await poolTokenContract.approve(addresses.posManager, ethers.utils.parseEther(AMOUNT_TO_ADD))

    const poolContract = new Contract(addresses.poolWplsPool, artifacts.UniswapV3Pool.abi, owner)

    const poolData = await getPoolData(poolContract)
    console.log('poolData: ', poolData)

    const WplsToken = new Token(hre.ethers.provider.network.chainId, addresses.wpls, 18, 'WPLS', 'Wrapped Pulse')
    const PoolToken = new Token(hre.ethers.provider.network.chainId, addresses.poolToken, 18, 'POOL', 'POOL')

    const pool = new Pool(
        WplsToken,
        PoolToken,
        poolData.fee,
        poolData.sqrtPriceX96.toString(),
        poolData.liquidity.toString(),
        poolData.tick
    )

    const position = new Position({
        pool: pool,
        liquidity: ethers.utils.parseEther('10'),
        tickLower: nearestUsableTick(poolData.tick, poolData.tickSpacing) - poolData.tickSpacing * 2,
        tickUpper: nearestUsableTick(poolData.tick, poolData.tickSpacing) + poolData.tickSpacing * 2,
    })

    const {amount0: amount0Desired, amount1: amount1Desired} = position.mintAmounts

    const params = {
        token0: addresses.wpls,
        token1: addresses.poolToken,
        fee: pool.fee,
        tickLower: nearestUsableTick(poolData.tick, poolData.tickSpacing) - poolData.tickSpacing * 2,
        tickUpper: nearestUsableTick(poolData.tick, poolData.tickSpacing) + poolData.tickSpacing * 2,
        amount0Desired: amount0Desired.toString(),
        amount1Desired: amount1Desired.toString(),
        amount0Min: 0,
        amount1Min: 0,
        recipient: owner.address,
        deadline: Math.floor(Date.now() / 1000) + (60 * 10)
    }
    console.log('params: ', params)

    const nonfungiblePositionManager = new Contract(
        addresses.posManager,
        artifacts.NonfungiblePositionManager.abi,
        owner
    )
    const tx = await nonfungiblePositionManager.connect(owner).mint(params)
    await tx.wait()
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
