# Poolsea contracts deploy from scratch

## Prerequisites

---
### Install project dependencies:
```shell
npm install
```
### Configure `.env` file:
Rename `.env.example` to `.env` and change mocks to your data.  
For example:  
``MNEMONIC=<mnemonic>``  
to  
``MNEMONIC=test test test test``  

<b>Description for each variable:</b>  
`MNEMONIC` - mnemonic phrase for wallet from which you will deploy contracts  
`NODE_WALLET_PRIVATE_KEY` - private key for node wallet which registered in protocol, it needs for execute rewards and for interact with protocol from registered node
> Before deployment, you haven't node wallet private key.  
> But if you have any wallet which you want to use in node, you can import it in the node instead of initializing a new one   

`ROCKET_STORAGE` - deployed poolsea storage contract, it needs for update contracts to 1.2 version and for scripts  

## Deployment

---
> <b>Networks:</b>  
> `pulse` is Pulsechain mainnet network  
> `pulseTest` is Pulsechain testnet network

1) #### Deploy first portion on contracts with old settings
```shell
npm hardhat run ./scripts/deploy.js --network <network>
```
2) #### Save addresses from deployment logs to file `deployed/<testnet/mainnet>/addresses.txt`
3) #### Set storage address from deployment logs to `.env` in `ROCKET_STORAGE` variable
4) #### Deploy and upgrade contracts with new settings and functionality
```shell
npm hardhat run ./scripts/deploy-upgrade-v1.2.js --network <network>
```
5) #### Save addresses from upgrade logs to same file from 2 point 
> Addresses from upgrade logs override addresses from first deployment logs with the same names
