const { network } = require("hardhat");
const {
  developmentChains,
  BASE_FEE,
  GAS_PRICE_LINK,
  INITIAL_PRICE_FEED_VALUE,
  DECIMALS,
} = require("../helper-hardhat-config");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  if (developmentChains.includes(network.name)) {
    log("Deploying mocks...");

    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });

    await deploy("MockV3Aggregator", {
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_PRICE_FEED_VALUE],
    });

    log("Mock deployed");
  }
};

module.exports.tags = ["all", "mocks"];
