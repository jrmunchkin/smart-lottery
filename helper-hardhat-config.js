const { ethers } = require("hardhat");

const networkConfig = {
  5: {
    name: "goerli",
    vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    usdEntranceFee: 10,
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "6142",
    callbackGasLimit: "500000",
    ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    interval: "120",
    prizeDistribution: [5, 10, 20, 65],
  },
  31337: {
    name: "localhost",
    usdEntranceFee: 10,
    gasLane:
      "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    callbackGasLimit: "500000",
    interval: "30",
    prizeDistribution: [5, 10, 20, 65],
  },
  1337: {
    name: "ganache",
    usdEntranceFee: 10,
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    callbackGasLimit: "500000",
    interval: "30",
    prizeDistribution: [5, 10, 20, 65],
  },
};

const developmentChains = ["hardhat", "localhost", "ganache"];
const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");
const INITIAL_PRICE_FEED_VALUE = "200000000000";
const DECIMALS = "8";

module.exports = {
  networkConfig,
  developmentChains,
  BASE_FEE,
  GAS_PRICE_LINK,
  VRF_SUB_FUND_AMOUNT,
  INITIAL_PRICE_FEED_VALUE,
  DECIMALS,
};
