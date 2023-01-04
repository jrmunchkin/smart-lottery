const { ethers } = require("hardhat");

async function buyTickets() {
  const smartLotteryV2 = await ethers.getContract("SmartLotteryV2");
  const ticketFee = await smartLotteryV2.getTicketFee();
  console.log("Buying...");
  const tx = await smartLotteryV2.buyTickets(10, {
    value: (ticketFee * 10).toString(),
    gasLimit: "10000000",
  });
  await tx.wait(1);
}

buyTickets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
