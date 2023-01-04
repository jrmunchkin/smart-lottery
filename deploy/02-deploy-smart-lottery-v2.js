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
    vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2MockOverride"
    );
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
  const usdTicketFee = networkConfig[chainId]["usdEntranceFee"];
  const interval = networkConfig[chainId]["interval"];
  const prizeDistribution = networkConfig[chainId]["prizeDistribution"];

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    gasLane,
    callbackGasLimit,
    ethUsdPriceFeed,
    usdTicketFee,
    interval,
    prizeDistribution,
  ];

  log("Deploying smart lottery V2...");
  const smartLotteryV2 = await deploy("SmartLotteryV2", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (developmentChains.includes(network.name)) {
    await vrfCoordinatorV2Mock.addConsumer(
      subscriptionId.toNumber(),
      smartLotteryV2.address
    );
  }

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY &&
    process.env.VERIFY == "true"
  ) {
    await verify(smartLotteryV2.address, args);
  }

  log("Smart lottery V2 deployed");
};

module.exports.tags = ["all", "smartLotteryV2"];
