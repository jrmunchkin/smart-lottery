const { developmentChains } = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("SmartLotteryV2", function () {
      let deployer, smartLotteryV2, lotteryTicketFee, interval;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        smartLotteryV2 = await ethers.getContract("SmartLotteryV2", deployer);
        lotteryTicketFee = await smartLotteryV2.getTicketFee();
        interval = await smartLotteryV2.getInterval();
      });

      it("Should buy a ticket, play lottery and pick a random winning ticket thanks to chainlink keeper and VRF", async function () {
        await new Promise(async (resolve, reject) => {
          smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
            try {
              const prizeDistribution =
                await smartLotteryV2.getPrizeDistribution();
              const winningTicket = await smartLotteryV2.getWinningTicket(1);
              const lotteryState = await smartLotteryV2.getLotteryState();
              const lotteryBalance = await smartLotteryV2.getLotteryBalance(1);
              const numPlayers = await smartLotteryV2.getNumberOfPlayers();

              const txReveal = await smartLotteryV2.revealWinningTickets(1);
              await txReveal.wait(1);
              const rewardsBalance = await smartLotteryV2.getUserRewardsBalance(
                deployer
              );
              expect(winningTicket[0].toNumber()).to.be.within(0, 9);
              expect(winningTicket[1].toNumber()).to.be.within(0, 9);
              expect(winningTicket[2].toNumber()).to.be.within(0, 9);
              expect(winningTicket[3].toNumber()).to.be.within(0, 9);
              assert.equal(numPlayers.toString(), "0");
              assert.equal(lotteryState.toString(), "0");
              assert.equal(
                lotteryBalance.toString(),
                lotteryTicketFee.toString()
              );
              expect(rewardsBalance.toNumber()).to.be.within(
                0,
                lotteryBalance.mul(prizeDistribution[3]).div(100)
              );
            } catch (e) {
              reject(e);
            }
            resolve();
          });
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
        });
      });
    });
