const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts, deployments } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("SmartLottery", function () {
      let deployer,
        smartLottery,
        vrfCoordinatorV2Mock,
        lotteryEntranceFee,
        interval;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        smartLottery = await ethers.getContract("SmartLottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2MockOverride",
          deployer
        );
        lotteryEntranceFee = await smartLottery.getEntranceFee();
        interval = await smartLottery.getInterval();
      });

      describe("constructor", function () {
        it("Should initializes the lottery correctly", async function () {
          const lotteryState = await smartLottery.getLotteryState();
          const interval = await smartLottery.getInterval();
          const lotteryNumber = await smartLottery.getActualLotteryNumber();
          const usdEntranceFee = await smartLottery.getUsdEntranceFee();
          assert.equal(lotteryState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
          assert.equal(lotteryNumber.toString(), "1");
          assert.equal(
            usdEntranceFee.toString(),
            networkConfig[chainId]["usdEntranceFee"] * 10 ** 18
          );
        });
      });

      describe("enterLottery", function () {
        it("Should revert if not enough funds", async function () {
          await expect(smartLottery.enterLottery()).to.be.revertedWith(
            "SmartLottery__NotEnoughFunds"
          );
        });
        it("Should revert if player already inside lottery", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await expect(
            smartLottery.enterLottery({ value: lotteryEntranceFee })
          ).to.be.revertedWith("SmartLottery__PlayerAlreadyInLottery");
        });
        it("Should revert if lottery not open", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLottery.performUpkeep([]);
          await txPerform.wait(1);
          await expect(
            smartLottery.enterLottery({ value: lotteryEntranceFee })
          ).to.be.revertedWith("SmartLottery__LotteryNotOpen");
        });
        it("Should increment number of players", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          const numPlayers = await smartLottery.getNumberOfPlayers();
          const player = await smartLottery.getPlayer(0);
          assert.equal(numPlayers, 1);
          assert.equal(player, deployer);
        });
        it("Should add sending value to lottery balance", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          const lotteryBalance = await smartLottery.getLotteryBalance(1);
          assert.equal(
            lotteryBalance.toString(),
            lotteryEntranceFee.toString()
          );
        });
        it("Should start lottery", async function () {
          const initialTimeStamp = await smartLottery.getStartTimestamp();
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          const afterStartTimeStamp = await smartLottery.getStartTimestamp();
          assert.equal(initialTimeStamp.toString(), "0");
          assert.isAbove(afterStartTimeStamp, initialTimeStamp);
        });
        it("Should emit event StartLottery when first player enter lottery", async function () {
          await expect(
            smartLottery.enterLottery({ value: lotteryEntranceFee })
          ).to.emit(smartLottery, "StartLottery");
        });
        it("Should emit event EnterLottery when enter lottery", async function () {
          await expect(
            smartLottery.enterLottery({ value: lotteryEntranceFee })
          ).to.emit(smartLottery, "EnterLottery");
        });
      });

      describe("checkUpkeep", function () {
        it("Should return false if not enough balance or no players", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await smartLottery.callStatic.checkUpkeep(
            []
          );
          assert(!upkeepNeeded);
        });
        it("Should return false if lottery not open", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLottery.performUpkeep([]);
          await txPerform.wait(1);
          const { upkeepNeeded } = await smartLottery.callStatic.checkUpkeep(
            []
          );
          assert(!upkeepNeeded);
        });
        it("Should return false if not enough time passed", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          const { upkeepNeeded } = await smartLottery.callStatic.checkUpkeep(
            []
          );
          assert(!upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("Should revert if upkeepNeeded false", async function () {
          await expect(smartLottery.performUpkeep([])).to.be.revertedWith(
            "SmartLottery__UpkeepNotNeeded"
          );
        });
        it("Should update the lottery state", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLottery.performUpkeep([]);
          await txPerform.wait(1);
          const lotteryState = await smartLottery.getLotteryState();
          assert.equal(lotteryState.toString(), "1");
        });
        it("Should call the vrf coordinator", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLottery.performUpkeep([]);
          const txReceipt = await txPerform.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          assert.isAbove(requestId, 0);
        });
        it("Should emit an event when performUpkeep", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await expect(smartLottery.performUpkeep([])).to.emit(
            smartLottery,
            "RequestLotteryWinner"
          );
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });
        it("Should only be called after performUpkeep", async function () {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, smartLottery.address)
          ).to.be.revertedWith("nonexistent request");
        });
        it("Should pick a winner", async function () {
          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const winner = await smartLottery.getWinner(1);
                assert.equal(deployer, winner);
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
        it("Should reopen lottery", async function () {
          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const lotteryState = await smartLottery.getLotteryState();
                assert.equal(lotteryState.toString(), "0");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
        it("Should reset players", async function () {
          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const numPlayers = await smartLottery.getNumberOfPlayers();
                assert.equal(numPlayers.toString(), "0");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
        it("Should increment lottery number", async function () {
          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const lotteryNumber =
                  await smartLottery.getActualLotteryNumber();
                assert.equal(lotteryNumber.toString(), "2");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
        it("Should add reward balance to winner", async function () {
          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const rewardsBalance = await smartLottery.getUserRewardsBalance(
                  deployer
                );
                assert.equal(
                  rewardsBalance.toString(),
                  lotteryEntranceFee.toString()
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
        it("Should pick a random winner with several players", async function () {
          await new Promise(async (resolve, reject) => {
            const additionalEntrants = 3;
            const startingAcountIndex = 1;
            const accounts = await ethers.getSigners();
            for (
              let i = startingAcountIndex;
              i < startingAcountIndex + additionalEntrants;
              i++
            ) {
              const accountConnectedLottery = smartLottery.connect(accounts[i]);
              await accountConnectedLottery.enterLottery({
                value: lotteryEntranceFee,
              });
            }

            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const winner = await smartLottery.getWinner(1);
                assert.equal(accounts[1].address, winner);
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
      });

      describe("claimRewards", function () {
        let gasUseToEnter;
        it("Should revert if no pending rewards", async function () {
          await expect(smartLottery.claimRewards()).to.be.revertedWith(
            "SmartLottery__NoPendingRewards"
          );
        });
        it("Should reset rewards user balance to 0", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const txClaim = await smartLottery.claimRewards();
                await txClaim.wait(1);
                const rewardsBalance = await smartLottery.getUserRewardsBalance(
                  deployer
                );
                assert.equal(rewardsBalance.toString(), "0");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
        it("Should increment winner user balance", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);

          const additionalEntrants = 3;
          const startingAcountIndex = 1;
          const accounts = await ethers.getSigners();
          for (
            let i = startingAcountIndex;
            i < startingAcountIndex + additionalEntrants;
            i++
          ) {
            const accountConnectedLottery = smartLottery.connect(accounts[i]);
            const txEnter = await accountConnectedLottery.enterLottery({
              value: lotteryEntranceFee,
            });
            const txEnterReceipt = await txEnter.wait(1);
            gasUseToEnter = txEnterReceipt.gasUsed.mul(
              txEnterReceipt.effectiveGasPrice
            );
          }

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                const accountConnectedLottery = smartLottery.connect(
                  accounts[1]
                );
                const txClaim = await accountConnectedLottery.claimRewards();
                const txClaimReceipt = await txClaim.wait(1);
                const gasUseToClaim = txClaimReceipt.gasUsed.mul(
                  txClaimReceipt.effectiveGasPrice
                );
                const userBalanceAfterClaim = await accounts[1].getBalance();
                assert.equal(
                  userBalanceAfterClaim
                    .add(gasUseToEnter)
                    .add(gasUseToClaim)
                    .toString(),
                  userBalanceBeforeClaim
                    .add(gasUseToEnter)
                    .add(lotteryEntranceFee.mul(additionalEntrants))
                    .add(lotteryEntranceFee)
                    .toString()
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            const userBalanceBeforeClaim = await accounts[1].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
        it("Should emit an event when rewards claimed", async function () {
          const txEnter = await smartLottery.enterLottery({
            value: lotteryEntranceFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLottery.once("WinnerLotteryPicked", async () => {
              try {
                await expect(smartLottery.claimRewards()).to.emit(
                  smartLottery,
                  "ClaimLotteryRewards"
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLottery.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLottery.address
            );
          });
        });
      });
    });
