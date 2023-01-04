const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_FOLDER = process.env.FRONT_END_FOLDER;

const FRONT_END_ADDRESSES_FILE = FRONT_END_FOLDER + "/contractAddresses.json";
const FRONT_END_ABI_FILE = FRONT_END_FOLDER;

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END == "true") {
    await updateContractAddresses();
    await updateAbi();
  }
};

async function updateAbi() {
  const smartLottery = await ethers.getContract("SmartLottery");
  fs.writeFileSync(
    `${FRONT_END_ABI_FILE}/smartLottery.json`,
    smartLottery.interface.format(ethers.utils.FormatTypes.json)
  );

  const smartLotteryV2 = await ethers.getContract("SmartLotteryV2");
  fs.writeFileSync(
    `${FRONT_END_ABI_FILE}/smartLotteryV2.json`,
    smartLotteryV2.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddresses() {
  const smartLottery = await ethers.getContract("SmartLottery");
  const smartLotteryV2 = await ethers.getContract("SmartLotteryV2");
  const chainId = network.config.chainId.toString();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
  );
  if (chainId in currentAddresses) {
    if (
      !currentAddresses[chainId]["SmartLottery"].includes(smartLottery.address)
    ) {
      currentAddresses[chainId]["SmartLottery"].push(smartLottery.address);
    }
    if (
      !currentAddresses[chainId]["SmartLotteryV2"].includes(
        smartLotteryV2.address
      )
    ) {
      currentAddresses[chainId]["SmartLotteryV2"].push(smartLotteryV2.address);
    }
  } else {
    currentAddresses[chainId] = {
      SmartLottery: [smartLottery.address],
      SmartLotteryV2: [smartLotteryV2.address],
    };
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];
