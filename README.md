# Poolsea - Proof of stake (PoS) infrastructure service and pool

<p align="center">
  <img src="https://www.gitbook.com/cdn-cgi/image/width=256,dpr=2,height=40,fit=contain,format=auto/https%3A%2F%2F406267852-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F7YLyjaM5Wxa1uBHDuGPS%252Flogo%252FhyPZShxiDyQ4dByFKvcr%252FFull%2520Logo%2520White%2520Text.png%3Falt%3Dmedia%26token%3Df8632f6a-da81-4702-a2a6-c07db719be2a" alt="Poolsea icon" width="300" />
</p>

---

Staking with the Poolsea network is very flexible and unlike any other staking infrastructure for Ethereum 2.0 to date. When depositing PLS into the Poolsea smart contracts, you will be instantly issued a token called rPLS which represents a tokenised staking deposit in the network. Its value and the rewards it gains over time will be reflected by the work each individual decentralised node operator gives the Poolsea network. Poolsea’s unique decentralised staking infrastructure is economically bonded to both be secure and scalable.

# Test Poolsea

To see Poolsea in action, clone the repo and run the test suite with the following commands:
```bash
$ npm install
$ npm test
```

---

# A Step-by-Step Beginners Guide

The following worked example uses macOS Sierra 10.12.6 and VMware Fusion 8.5.8 - all versions correct as of 15/09/2017.

Download and install Ubuntu onto a new VM -> https://www.ubuntu.com/download/desktop - tested with v16.04

Open a terminal window and install some pre-requisites:

install git:
```bash
$ sudo apt -y install git
```
install curl:  
```bash
$ sudo apt -y install curl
```
install npm:
```bash
$ sudo apt -y install npm
```
install node.js:
```bash
$ curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
$ sudo apt-get -y install nodejs
```
get poolsea:
```bash
$ git clone https://github.com/Seb369888/PSStaking.git
```
open the poolsea directory:
```bash
$ cd PSStaking
```
install npm packages and run tests:
```bash
$ npm install && npm test
```
