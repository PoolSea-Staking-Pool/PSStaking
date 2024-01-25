const hre = require('hardhat');
const { utils, Contract, ethers } = require("ethers");

const AMOUNT_TO_ADD = '1000'

const addresses = {
    wpls: '0x70499adEBB11Efd915E3b69E700c331778628707',
}

const WPLS = require('./WPLS.json')

export async function main() {
    const [owner] = await hre.ethers.getSigners();

    if(!utils.isAddress(addresses.wpls)){
        console.error("Some address is incorrect")
        return
    }

    const wplsContract = new Contract(addresses.wpls, WPLS, owner)

    const tx = await wplsContract.deposit({value: ethers.utils.parseEther(AMOUNT_TO_ADD)})
    await tx.wait()
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
