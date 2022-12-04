const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
  VRF_SUB_FUND_AMOUNT,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
require("dotenv").config();

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Mock,
    vrfCoordinatorV2Address,
    subscriptionId,
    ethUsdPriceFeed;

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const txCreate = await vrfCoordinatorV2Mock.createSubscription();
    const txCreateReceipt = await txCreate.wait(1);
    subscriptionId = txCreateReceipt.events[0].args.subId;
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
    const mockV3Aggregator = await ethers.getContract("MockV3Aggregator");
    ethUsdPriceFeed = mockV3Aggregator.address;
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
    ethUsdPriceFeed = networkConfig[chainId]["ethUsdPriceFeed"];
  }

  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const usdEntranceFee = networkConfig[chainId]["usdEntranceFee"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    gasLane,
    callbackGasLimit,
    ethUsdPriceFeed,
    usdEntranceFee,
    interval,
  ];

  log("Deploying smart lottery...");
  const smartLottery = await deploy("SmartLottery", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(
      subscriptionId.toNumber(),
      smartLottery.address
    );
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(smartLottery.address, args);
  }

  log("Smart lottery deployed");
};

module.exports.tags = ["all", "smartLottery"];
