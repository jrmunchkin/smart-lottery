# Smart Lottery contract (SOLIDITY)

**This is the SOLIDITY version of the repository, VYPER version is coming soon...**

This is a repository to work with and create a lottery game name Smart Lottery in a javascript environment using hardhat.
This is a backend repository, it also work with a [frontend repository](https://github.com/jrchain/smart-lottery-front-end). However you absolutly can use this repository without the frontend part.

## Summary

The Smart Lottery contract creates a simple lottery which will picked a random winner once the lottery end.
The constructor takes an interval (time of duration of the lottery) and and usd entrance fee (entrance fee in dollars).

This contract implements :

- Chainlink Keeper to trigger when the lottery must end.
- Chainlink VRF to pick a random winner when the lottery ends.
- Chainlink price feed to know the entrance fee value in ETH.

The Smart Lottery allow you to :

- `enterLottery`: Enter the lottery by paying entrance fees (USD convert to ETH).
- `claimRewards`: Get rewards of the previous lotteries you won.
- `getWinner`: Get any winner of a previous lottery thanks to the lottery number.
- `getLotteryBalance`: Get any pot size of a previous lottery thanks to the lottery number.

- [Smart Lottery](#smart-lottery-contract)
  - [Summary](#summary)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Testnet Development](#testnet-development)
- [Usage](#useage)
  - [Deployment](#deployment)
  - [Testing](#testing)

## Prerequisites

Please install or have installed the following:

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [nodejs and npm](https://nodejs.org/en/download/)

## Installation

1. Clone this repository

```
git clone https://github.com/jrchain/smart-lottery
cd smart-lottery
```

2. Install dependencies

```
yarn
```

## Testnet Development

If you want to be able to deploy to testnets, do the following. I suggest to use goerli network.

```bash
cp .env.example .env
```

Set your `GOERLI_RPC_URL`, and `PRIVATE_KEY`

You can get a `GOERLI_RPC_URL` by opening an account at [Alchemy](https://www.alchemy.com/). Follow the steps to create a new application.

You also can work with [Infura](https://infura.io/).

You can find your `PRIVATE_KEY` from your ethereum wallet like [metamask](https://metamask.io/).

You'll also want an [Etherscan API Key](https://etherscan.io/apis) to verify your smart contracts. Set it here `ETHERSCAN_API_KEY`.

If you want to use it with the [frontend repository](https://github.com/jrchain/smart-lottery-front-end), You also can clone it and set your frontend path `FRONT_END_FOLDER`

the `UPDATE_FRONT_END` set to true will update your frontend with the last deployed contract.

Finally you can add a `COINMARKETCAP_API_KEY` if you want to use hardhat gas reporter. You can find one by registring to [CoinMarketCap Developers](https://pro.coinmarketcap.com/).

You can add your environment variables to the `.env` file:

```bash
PRIVATE_KEY=<PRIVATE_KEY>
GOERLI_RPC_URL=<RPC_URL>
ETHERSCAN_API_KEY=<YOUR_API_KEY>
COINMARKETCAP_API_KEY=<YOUR_API_KEY>
FRONT_END_FOLDER=<YOUR_PATH_TO_FRONTEND>
UPDATE_FRONT_END=<TRUE_OR_FALSE>
```

You'll also need testnet goerli ETH if you want to deploy on goerli tesnet. You can get ETH into your wallet by using the [alchemy goerli faucet](https://goerlifaucet.com/) or [chainlink faucet](https://faucets.chain.link/).

# Usage

## Deployment

Feel free to change the interval variable in the helper-hardhat-config.js if you want your lottery interval to be more than 60 seconds.

You also can change the value of usdEntranceFee for setting your lottery entrance fee.

To deploy the contract locally

```bash
yarn hardhat deploy
```

To deploy on goerli tesnet you need to create first a subscription on [Chainlink VRF](https://vrf.chain.link/goerli).
Add the newly created subscriptionId to your helper-hardhat-config.js.

To deploy the contract on goerli tesnet

```bash
yarn hardhat deploy --network goerli
```

Once the contract is deployed on goerli, you need to add it as a consumer to your subscription.
You also need to register your contract to the [Chainlink keeper](https://automation.chain.link/goerli) (Don't forget to claim some LINK by using the [chainlink faucet](https://faucets.chain.link/)).

To update the front end repository with the newly deployed contracts (You need to pull the [frontend](https://github.com/jrchain/smart-lottery-front-end) and set your `FRONT_END_FOLDER` first)

```bash
yarn hardhat deploy --tags frontend
```

## Testing

For unit testing

```
yarn hardhat test
```

For integration testing

```
yarn hardhat test --network goerli
```
