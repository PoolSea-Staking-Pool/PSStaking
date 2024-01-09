import fs from "fs/promises";
import {utils} from 'ethers'

function csvJSON(csv) {
    const lines = csv.split('\n')
    const result = []
    const headers = lines[0].split(',')

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i])
            continue
        const obj = {}
        const currentline = lines[i].split(',')

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j]
        }
        result.push(obj)
    }
    return result
}

export async function main() {
    const csv = await fs.readFile('./scripts/airdrop/airdrop-full-data.csv', 'utf-8');
    const json = csvJSON(csv)
    const result = {
        data: {},
        total: BigInt(0)
    }
    json.forEach(item => {
        const numeric = parseFloat(item['Final tokens'])
        const amount = BigInt(+utils.parseUnits(numeric.toString(), 18))
        if(amount > 0){
            const prevData = result.data[item.from.toLowerCase()]
            if(!prevData){
                result.data[item.from.toLowerCase()] = amount
            }else{
                result.data[item.from.toLowerCase()] += amount
            }
            result.total += amount
        }
    })
    const finalJson = JSON.stringify(result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,)
    await fs.writeFile("./scripts/airdrop/amount-by-address.json", finalJson, 'utf-8')
}

main().catch(e => {
    console.error(e);
    process.exit(0);
});
