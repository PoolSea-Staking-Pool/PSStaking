import { PoolseaAuctionManager } from '../_utils/artifacts';


// Get lot start/end blocks
export async function getLotStartBlock(lotIndex) {
    const rocketAuctionManager = await PoolseaAuctionManager.deployed();
    let startBlock = await rocketAuctionManager.getLotStartBlock.call(lotIndex);
    return startBlock;
}
export async function getLotEndBlock(lotIndex) {
    const rocketAuctionManager = await PoolseaAuctionManager.deployed();
    let endBlock = await rocketAuctionManager.getLotEndBlock.call(lotIndex);
    return endBlock;
}


// Get lot price at a block
export async function getLotPriceAtBlock(lotIndex, block) {
    const rocketAuctionManager = await PoolseaAuctionManager.deployed();
    let price = await rocketAuctionManager.getLotPriceAtBlock.call(lotIndex, block);
    return price;
}


// Create a new lot for auction
export async function auctionCreateLot(txOptions) {
    const rocketAuctionManager = await PoolseaAuctionManager.deployed();
    await rocketAuctionManager.createLot(txOptions);
}


// Place a bid on a lot
export async function auctionPlaceBid(lotIndex, txOptions) {
    const rocketAuctionManager = await PoolseaAuctionManager.deployed();
    await rocketAuctionManager.placeBid(lotIndex, txOptions);
}

