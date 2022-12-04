const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_FOLDER = process.env.FRONT_END_FOLDER;

const FRONT_END_ADDRESSES_FILE = FRONT_END_FOLDER + "/contractAddresses.json";
const FRONT_END_ABI_FILE = FRONT_END_FOLDER + "/smartLottery.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    await updateContractAddresses();
    await updateAbi();
  }
};

async function updateAbi() {
  const smartLottery = await ethers.getContract("SmartLottery");
  fs.writeFileSync(
    FRONT_END_ABI_FILE,
    smartLottery.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddresses() {
  const smartLottery = await ethers.getContract("SmartLottery");
  const chainId = network.config.chainId.toString();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
  );
  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(smartLottery.address)) {
      currentAddresses[chainId].push(smartLottery.address);
    }
  } else {
    currentAddresses[chainId] = [smartLottery.address];
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];
