const { developmentChains } = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("SmartLottery", function () {
      let deployer, smartLottery, lotteryEntranceFee, interval;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        smartLottery = await ethers.getContract("SmartLottery", deployer);
        lotteryEntranceFee = await smartLottery.getEntranceFee();
        interval = await smartLottery.getInterval();
      });

      it("Should play lottery and pick a random winner thanks to chainlink keeper and VRF", async function () {
        const accounts = await ethers.getSigners();

        await new Promise(async (resolve, reject) => {
          smartLottery.once("WinnerLotteryPicked", async () => {
            try {
              const winner = await smartLottery.getWinner(1);
              const lotteryState = await smartLottery.getLotteryState();
              const numPlayers = await smartLottery.getNumberOfPlayers();
              const rewardsBalance = await smartLottery.getUserRewardsBalance(
                deployer
              );
              const txClaim = await smartLottery.claimRewards();
              const txClaimReceipt = await txClaim.wait(1);
              const gasUseToClaim = txClaimReceipt.gasUsed.mul(
                txClaimReceipt.effectiveGasPrice
              );
              const userBalanceAfterLottery = await accounts[0].getBalance();
              assert.equal(deployer, winner);
              assert.equal(numPlayers.toString(), "0");
              assert.equal(lotteryState.toString(), "0");
              assert.equal(
                rewardsBalance.toString(),
                lotteryEntranceFee.toString()
              );
              assert.equal(
                userBalanceAfterLottery
                  .add(gasUseToEnter)
                  .add(gasUseToClaim)
                  .toString(),
                userBalanceBeforeLottery
                  .add(gasUseToEnter)
                  .add(lotteryEntranceFee)
                  .toString()
              );
            } catch (e) {
              reject(e);
            }
            resolve();
          });

          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          const txEnterReceipt = await txEnter.wait(1);
          const gasUseToEnter = txEnterReceipt.gasUsed.mul(
            txEnterReceipt.effectiveGasPrice
          );
          const userBalanceBeforeLottery = await accounts[0].getBalance();
        });
      });
    });
