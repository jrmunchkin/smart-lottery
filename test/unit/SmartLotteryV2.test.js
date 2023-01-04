const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");
const { network, ethers, getNamedAccounts, deployments } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("SmartLotteryV2", function () {
      let deployer,
        smartLotteryV2,
        vrfCoordinatorV2Mock,
        lotteryTicketFee,
        interval;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        smartLotteryV2 = await ethers.getContract("SmartLotteryV2", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2MockOverride",
          deployer
        );
        lotteryTicketFee = await smartLotteryV2.getTicketFee();
        interval = await smartLotteryV2.getInterval();
      });

      describe("constructor", function () {
        it("Should revert if distribution total not equal 100", async function () {
          const { deploy } = deployments;
          const chainId = network.config.chainId;
          let subscriptionId, ethUsdPriceFeed, vrfCoordinatorV2Address;
          vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
          subscriptionId = 1;
          const mockV3Aggregator = await ethers.getContract("MockV3Aggregator");
          ethUsdPriceFeed = mockV3Aggregator.address;
          const gasLane = networkConfig[chainId]["gasLane"];
          const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
          const usdTicketFee = networkConfig[chainId]["usdEntranceFee"];
          const interval = networkConfig[chainId]["interval"];
          const prizeDistribution = [5, 10, 20, 60];

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
          await expect(
            deploy("SmartLotteryV2", {
              from: deployer,
              log: true,
              args: args,
              waitConfirmations: network.config.blockConfirmations || 1,
            })
          ).to.be.revertedWith(
            "SmartLotteryV2__PrizeDistributionNotOneHundredPercent"
          );
        });
        it("Should initializes the lottery correctly", async function () {
          const lotteryState = await smartLotteryV2.getLotteryState();
          const interval = await smartLotteryV2.getInterval();
          const lotteryNumber = await smartLotteryV2.getActualLotteryNumber();
          const usdTicketFee = await smartLotteryV2.getUsdTicketFee();
          const prizeDistribution = await smartLotteryV2.getPrizeDistribution();
          assert.equal(lotteryState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
          assert.equal(lotteryNumber.toString(), "1");
          assert.equal(
            usdTicketFee.toString(),
            networkConfig[chainId]["usdEntranceFee"] * 10 ** 18
          );
          assert.equal(
            prizeDistribution.length,
            networkConfig[chainId]["prizeDistribution"].length
          );
          assert.equal(
            prizeDistribution[0].toString(),
            networkConfig[chainId]["prizeDistribution"][0]
          );
          assert.equal(
            prizeDistribution[1].toString(),
            networkConfig[chainId]["prizeDistribution"][1]
          );
          assert.equal(
            prizeDistribution[2].toString(),
            networkConfig[chainId]["prizeDistribution"][2]
          );
          assert.equal(
            prizeDistribution[3].toString(),
            networkConfig[chainId]["prizeDistribution"][3]
          );
        });
      });

      describe("buyTickets", function () {
        it("Should revert if not enough funds", async function () {
          await expect(smartLotteryV2.buyTickets(1)).to.be.revertedWith(
            "SmartLotteryV2__NotEnoughFunds"
          );
        });
        it("Should revert if player buy too many tickets", async function () {
          await expect(
            smartLotteryV2.buyTickets(11, {
              value: (lotteryTicketFee * 11).toString(),
            })
          ).to.be.revertedWith("SmartLotteryV2__TooManyTickets");
        });
        it("Should revert if lottery not open", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLotteryV2.performUpkeep([]);
          await txPerform.wait(1);
          await expect(
            smartLotteryV2.buyTickets(1, { value: lotteryTicketFee })
          ).to.be.revertedWith("SmartLotteryV2__LotteryNotOpen");
        });
        it("Should increment number of players", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const numPlayers = await smartLotteryV2.getNumberOfPlayers();
          const player = await smartLotteryV2.getPlayer(0);
          assert.equal(numPlayers, 1);
          assert.equal(player, deployer);
        });
        it("Should not increment number of players if player already in lottery", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const txEnter2 = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter2.wait(1);
          const numPlayers = await smartLotteryV2.getNumberOfPlayers();
          const player = await smartLotteryV2.getPlayer(0);
          assert.equal(numPlayers, 1);
          assert.equal(player, deployer);
        });
        it("Should buy and create a ticket", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const playerTicket = await smartLotteryV2.getPlayerTicket(
            deployer,
            0
          );
          expect(playerTicket[0].toNumber()).to.be.within(0, 9);
          expect(playerTicket[1].toNumber()).to.be.within(0, 9);
          expect(playerTicket[2].toNumber()).to.be.within(0, 9);
          expect(playerTicket[3].toNumber()).to.be.within(0, 9);
        });
        it("Should buy the right numbers of tickets", async function () {
          const txEnter = await smartLotteryV2.buyTickets(3, {
            value: (lotteryTicketFee * 3).toString(),
          });
          await txEnter.wait(1);
          const numPlayerTickets =
            await smartLotteryV2.getNumberOfTicketsByPlayer(deployer);
          assert.equal(numPlayerTickets, 3);
        });
        it("Should set the good combinations", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const playerTicket = await smartLotteryV2.getPlayerTicket(
            deployer,
            0
          );
          const combination1 = await smartLotteryV2.getNumberOfCombination(
            playerTicket[0].toString()
          );
          const combination2 = await smartLotteryV2.getNumberOfCombination(
            playerTicket[0].toString() + playerTicket[1].toString()
          );
          const combination3 = await smartLotteryV2.getNumberOfCombination(
            playerTicket[0].toString() +
              playerTicket[1].toString() +
              playerTicket[2].toString()
          );
          const combination4 = await smartLotteryV2.getNumberOfCombination(
            playerTicket[0].toString() +
              playerTicket[1].toString() +
              playerTicket[2].toString() +
              playerTicket[3].toString()
          );
          assert.equal(combination1.toString(), "1");
          assert.equal(combination2.toString(), "1");
          assert.equal(combination3.toString(), "1");
          assert.equal(combination4.toString(), "1");
        });
        it("Should add sending value to lottery balance", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const lotteryBalance = await smartLotteryV2.getLotteryBalance(1);
          assert.equal(lotteryBalance.toString(), lotteryTicketFee.toString());
        });
        it("Should start lottery", async function () {
          const initialTimeStamp = await smartLotteryV2.getStartTimestamp();
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const afterStartTimeStamp = await smartLotteryV2.getStartTimestamp();
          assert.equal(initialTimeStamp.toString(), "0");
          assert.isAbove(afterStartTimeStamp, initialTimeStamp);
        });
        it("Should emit event StartLottery when first player enter lottery", async function () {
          await expect(
            smartLotteryV2.buyTickets(1, { value: lotteryTicketFee })
          ).to.emit(smartLotteryV2, "StartLottery");
        });
        it("Should emit event EmitTicket when player buy a ticket", async function () {
          await expect(
            smartLotteryV2.buyTickets(1, { value: lotteryTicketFee })
          ).to.emit(smartLotteryV2, "EmitTicket");
        });
        it("Should emit event EnterLottery when enter lottery", async function () {
          await expect(
            smartLotteryV2.buyTickets(1, { value: lotteryTicketFee })
          ).to.emit(smartLotteryV2, "EnterLottery");
        });
      });

      describe("checkUpkeep", function () {
        it("Should return false if not enough balance or no players", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await smartLotteryV2.callStatic.checkUpkeep(
            []
          );
          assert(!upkeepNeeded);
        });
        it("Should return false if lottery not open", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLotteryV2.performUpkeep([]);
          await txPerform.wait(1);
          const { upkeepNeeded } = await smartLotteryV2.callStatic.checkUpkeep(
            []
          );
          assert(!upkeepNeeded);
        });
        it("Should return false if not enough time passed", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const { upkeepNeeded } = await smartLotteryV2.callStatic.checkUpkeep(
            []
          );
          assert(!upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("Should revert if upkeepNeeded false", async function () {
          await expect(smartLotteryV2.performUpkeep([])).to.be.revertedWith(
            "SmartLotteryV2__UpkeepNotNeeded"
          );
        });
        it("Should update the lottery state", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLotteryV2.performUpkeep([]);
          await txPerform.wait(1);
          const lotteryState = await smartLotteryV2.getLotteryState();
          assert.equal(lotteryState.toString(), "1");
        });
        it("Should call the vrf coordinator", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txPerform = await smartLotteryV2.performUpkeep([]);
          const txReceipt = await txPerform.wait(1);
          const requestId = txReceipt.events[1].args.requestId;
          assert.isAbove(requestId, 0);
        });
        it("Should emit an event when performUpkeep", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await expect(smartLotteryV2.performUpkeep([])).to.emit(
            smartLotteryV2,
            "RequestLotteryWinningTicket"
          );
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });
        it("Should only be called after performUpkeep", async function () {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, smartLotteryV2.address)
          ).to.be.revertedWith("nonexistent request");
        });
        it("Should pick a winning ticket", async function () {
          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const winningTicket = await smartLotteryV2.getWinningTicket(1);
                expect(winningTicket[0].toNumber()).to.be.within(0, 9);
                expect(winningTicket[1].toNumber()).to.be.within(0, 9);
                expect(winningTicket[2].toNumber()).to.be.within(0, 9);
                expect(winningTicket[3].toNumber()).to.be.within(0, 9);
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address
            );
          });
        });
        it("Should reopen lottery", async function () {
          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const lotteryState = await smartLotteryV2.getLotteryState();
                assert.equal(lotteryState.toString(), "0");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address
            );
          });
        });
        it("Should reset players", async function () {
          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const numPlayers = await smartLotteryV2.getNumberOfPlayers();
                assert.equal(numPlayers.toString(), "0");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address
            );
          });
        });
        it("Should increment lottery number", async function () {
          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const lotteryNumber =
                  await smartLotteryV2.getActualLotteryNumber();
                assert.equal(lotteryNumber.toString(), "2");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address
            );
          });
        });
        it("Should postpone not winning pools to next lottery", async function () {
          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const prizeDistribution =
                  await smartLotteryV2.getPrizeDistribution();
                const lotteryBalance = await smartLotteryV2.getLotteryBalance(
                  1
                );
                const nextLotteryBalance =
                  await smartLotteryV2.getActualLotteryBalance();
                //As the last number is different. The balance of the higer prize distribution should be postpone to the next lottery
                assert.equal(
                  nextLotteryBalance.toNumber(),
                  (lotteryBalance.toNumber() *
                    prizeDistribution[3].toNumber()) /
                    100
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const playerTicket = await smartLotteryV2.getPlayerTicket(
              deployer,
              0
            );
            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            //We mock that the winning ticket will match the first 3 numbers of the user ticket. The last one will be different.
            await vrfCoordinatorV2Mock.fulfillRandomWordsWithGivenWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address,
              [
                playerTicket[0].toNumber(),
                playerTicket[1].toNumber(),
                playerTicket[2].toNumber(),
                playerTicket[3].toNumber() - 1,
              ]
            );
          });
        });
      });

      describe("revealWinningTickets", function () {
        it("Should revert if non existing lottery", async function () {
          await expect(
            smartLotteryV2.revealWinningTickets(10)
          ).to.be.revertedWith("SmartLotteryV2__NonExistingLottery");
        });
        it("Should revert if tickets already revealed", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const txReveal = await smartLotteryV2.revealWinningTickets(1);
                await txReveal.wait(1);

                await expect(
                  smartLotteryV2.revealWinningTickets(1)
                ).to.be.revertedWith("SmartLotteryV2__TicketsAlreadyRevealed");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address
            );
          });
        });
        it("Should increment user reward balance when having winning ticket", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const prizeDistribution =
                  await smartLotteryV2.getPrizeDistribution();
                const lotteryBalance = await smartLotteryV2.getLotteryBalance(
                  1
                );
                const txReveal = await smartLotteryV2.revealWinningTickets(1);
                await txReveal.wait(1);

                const userRewards = await smartLotteryV2.getUserRewardsBalance(
                  deployer
                );
                const isTicketRevealed =
                  await smartLotteryV2.isPlayerTicketAlreadyRevealed(
                    deployer,
                    1
                  );
                assert.equal(
                  userRewards.toString(),
                  lotteryBalance.mul(prizeDistribution[2]).div(100).toString()
                );
                assert.equal(isTicketRevealed, true);
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const playerTicket = await smartLotteryV2.getPlayerTicket(
              deployer,
              0
            );
            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWordsWithGivenWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address,
              [
                playerTicket[0].toNumber(),
                playerTicket[1].toNumber(),
                playerTicket[2].toNumber(),
                playerTicket[3].toNumber() - 1,
              ]
            );
          });
        });
        it("Should emit an event when revealing tickets", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                await expect(smartLotteryV2.revealWinningTickets(1)).to.emit(
                  smartLotteryV2,
                  "RevealTicket"
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const playerTicket = await smartLotteryV2.getPlayerTicket(
              deployer,
              0
            );
            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWordsWithGivenWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address,
              [
                playerTicket[0].toNumber(),
                playerTicket[1].toNumber(),
                playerTicket[2].toNumber(),
                playerTicket[3].toNumber() - 1,
              ]
            );
          });
        });
      });

      describe("claimRewards", function () {
        let gasUseToEnter;
        it("Should revert if no pending rewards", async function () {
          await expect(smartLotteryV2.claimRewards()).to.be.revertedWith(
            "SmartLotteryV2__NoPendingRewards"
          );
        });
        it("Should reset rewards user balance to 0", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const txReveal = await smartLotteryV2.revealWinningTickets(1);
                await txReveal.wait(1);
                const txClaim = await smartLotteryV2.claimRewards();
                await txClaim.wait(1);
                const rewardsBalance =
                  await smartLotteryV2.getUserRewardsBalance(deployer);
                assert.equal(rewardsBalance.toString(), "0");
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const playerTicket = await smartLotteryV2.getPlayerTicket(
              deployer,
              0
            );
            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWordsWithGivenWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address,
              [
                playerTicket[0].toNumber(),
                playerTicket[1].toNumber(),
                playerTicket[2].toNumber(),
                playerTicket[3].toNumber() - 1,
              ]
            );
          });
        });
        it("Should increment user balance when having winning ticket and claim", async function () {
          const accounts = await ethers.getSigners();
          const accountConnectedLottery = smartLotteryV2.connect(accounts[1]);
          const txEnter = await accountConnectedLottery.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          const txEnterReceipt = await txEnter.wait(1);
          gasUseToEnter = txEnterReceipt.gasUsed.mul(
            txEnterReceipt.effectiveGasPrice
          );

          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const accountConnectedLottery = smartLotteryV2.connect(
                  accounts[1]
                );
                const prizeDistribution =
                  await smartLotteryV2.getPrizeDistribution();
                const lotteryBalance = await smartLotteryV2.getLotteryBalance(
                  1
                );
                const txReveal =
                  await accountConnectedLottery.revealWinningTickets(1);
                const txRevealReceipt = await txReveal.wait(1);
                const gasUseToReveal = txRevealReceipt.gasUsed.mul(
                  txRevealReceipt.effectiveGasPrice
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
                    .add(gasUseToReveal)
                    .toString(),
                  userBalanceBeforeClaim
                    .add(gasUseToEnter)
                    .add(lotteryBalance.mul(prizeDistribution[2]).div(100))
                    .toString()
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const playerTicket = await smartLotteryV2.getPlayerTicket(
              accounts[1].address,
              0
            );
            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            const userBalanceBeforeClaim = await accounts[1].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWordsWithGivenWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address,
              [
                playerTicket[0].toNumber(),
                playerTicket[1].toNumber(),
                playerTicket[2].toNumber(),
                playerTicket[3].toNumber() - 1,
              ]
            );
          });
        });
        it("Should emit an event when rewards claimed", async function () {
          const txEnter = await smartLotteryV2.buyTickets(1, {
            value: lotteryTicketFee,
          });
          await txEnter.wait(1);
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          await new Promise(async (resolve, reject) => {
            smartLotteryV2.once("WinningTicketLotteryPicked", async () => {
              try {
                const txReveal = await smartLotteryV2.revealWinningTickets(1);
                await txReveal.wait(1);
                await expect(smartLotteryV2.claimRewards()).to.emit(
                  smartLotteryV2,
                  "ClaimLotteryRewards"
                );
              } catch (e) {
                reject(e);
              }
              resolve();
            });

            const playerTicket = await smartLotteryV2.getPlayerTicket(
              deployer,
              0
            );
            const txPerform = await smartLotteryV2.performUpkeep([]);
            const txPerformReceipt = await txPerform.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWordsWithGivenWords(
              txPerformReceipt.events[1].args.requestId,
              smartLotteryV2.address,
              [
                playerTicket[0].toNumber(),
                playerTicket[1].toNumber(),
                playerTicket[2].toNumber(),
                playerTicket[3].toNumber() - 1,
              ]
            );
          });
        });
      });
    });
