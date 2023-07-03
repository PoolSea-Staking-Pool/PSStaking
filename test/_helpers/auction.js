import { PoolseaAuctionManager } from '../_utils/artifacts';


// Get lot start/end blocks
export async function getLotStartBlock(lotIndex) {
    const poolseaAuctionManager = await PoolseaAuctionManager.deployed();
    let startBlock = await poolseaAuctionManager.getLotStartBlock.call(lotIndex);
    return startBlock;
}
export async function getLotEndBlock(lotIndex) {
    const poolseaAuctionManager = await PoolseaAuctionManager.deployed();
    let endBlock = await poolseaAuctionManager.getLotEndBlock.call(lotIndex);
    return endBlock;
}


// Get lot price at a block
export async function getLotPriceAtBlock(lotIndex, block) {
    const poolseaAuctionManager = await PoolseaAuctionManager.deployed();
    let price = await poolseaAuctionManager.getLotPriceAtBlock.call(lotIndex, block);
    return price;
}


// Create a new lot for auction
export async function auctionCreateLot(txOptions) {
    const poolseaAuctionManager = await PoolseaAuctionManager.deployed();
    await poolseaAuctionManager.createLot(txOptions);
}


// Place a bid on a lot
export async function auctionPlaceBid(lotIndex, txOptions) {
    const poolseaAuctionManager = await PoolseaAuctionManager.deployed();
    await poolseaAuctionManager.placeBid(lotIndex, txOptions);
}

