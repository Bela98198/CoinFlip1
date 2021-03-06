const {
    expect
} = require("chai");
const { BigNumber, Wallet } = require("ethers");
const {
    ethers
} = require("hardhat");
const {
    deployments
} = require("hardhat");

describe("CoinFlip contract: ", function () {
    let coinFlip, accounts;
    before("Before: ", async () => {
        accounts = await ethers.getNamedSigners()

        tx = await deployments.deploy("CoinFlip", {
            from: accounts.deployer.address,
            log: false,
        });

        coinFlip = await ethers.getContract("CoinFlip");
    })

    describe("Initialization...", async () => {
        it("Should initialize contract with correct values: ", async () => {
            expect(await coinFlip.WIN_COEFFICIENT()).to.equal(195);
            expect(await coinFlip.minEtherBet()).to.equal(ethers.utils.parseEther("0.1"));
            expect(await coinFlip.maxEtherBet()).to.equal(ethers.utils.parseEther("10"));
            //expect(await coinFlip.WIN_COEFFICIENT()).to.equal(195);
        })
    })

    describe("Function play: ", async () => {
        it("Should revert with msg Choice should be 0 or 1", async () => {
            const seed = ethers.utils.formatBytes32String("game1");
            await accounts.deployer.sendTransaction({ value: ethers.utils.parseEther("0.2"), to: coinFlip.address })
            await expect(coinFlip.connect(accounts.caller).play(2, seed, { value: ethers.utils.parseEther("0.2") }))
                .to.be.revertedWith('Choice should be 0 or 1');
        })

        it('Should revert with msg Seed already used', async () => {
            const seed = ethers.utils.formatBytes32String("game1");
            await coinFlip.connect(accounts.caller).play(1, seed, {
                value: ethers.utils.parseEther("0.2")
            })
            await expect(coinFlip.connect(accounts.caller).play(1, seed, {
                value: ethers.utils.parseEther("0.2")
            }))
                .to.be.revertedWith('Seed already used');
        })

        it('Should Add new game with correct vaules', async () => {
            const betAmount = ethers.utils.parseEther("0.2");
            const choice = ethers.constants.One;
            const totalGamesCount = await coinFlip.totalGamesCount();
            const houseProfitEther = await coinFlip.houseProfitEther();
            const seed = ethers.utils.formatBytes32String("game2");

            await accounts.deployer.sendTransaction({
                value: betAmount,
                to: coinFlip.address
            });

            await coinFlip.connect(accounts.caller).play(choice, seed, {
                value: betAmount
            })

            //console.log("CurrentGame", currentGame)

            expect(await coinFlip.totalGamesCount()).to.equal(totalGamesCount.add(1))
            expect(await coinFlip.houseProfitEther()).to.equal(houseProfitEther.add(betAmount))
            expect(await coinFlip.games(seed)).to.deep.equal([
                totalGamesCount.add(1),
                accounts.caller.address,
                betAmount,
                ethers.constants.Zero,
                choice,
                ethers.BigNumber.from(0),
                0
            ])

        })

        it("Should transfer bet Amount to CoinFlip contract", async () => {
            const betAmount = ethers.utils.parseEther("0.2");
            const choice = ethers.constants.One;
            const seed = ethers.utils.formatBytes32String("game3");
            await expect(() => coinFlip.connect(accounts.caller).play(choice, seed, {
                value: betAmount
            }))
                .to.changeEtherBalances([accounts.caller, coinFlip], [betAmount.mul(ethers.constants.NegativeOne), betAmount]);
        })

        it("Should trow event GameCreated with correct args", async () => {
            const betAmount = ethers.utils.parseEther("0.2");
            const choice = ethers.constants.One;
            const totalGamesCount = await coinFlip.totalGamesCount();
            const houseProfitEther = await coinFlip.houseProfitEther();
            const seed = ethers.utils.formatBytes32String("game4");


            await expect(coinFlip.connect(accounts.caller).play(choice, seed, {
                value: betAmount
            }))
                .to.emit(coinFlip, 'GameCreated')
                .withArgs(accounts.caller.address, betAmount, choice, seed);
        })
    })


    describe("Function confirm", async () => {
        it("Should revert with  msg Game already played", async () => {
            const seed = ethers.utils.formatBytes32String("game2");
            const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
            const signature = await web3.eth.accounts.sign(seed, privateKey)

            await coinFlip.connect(accounts.deployer).confirm(seed, signature.v, signature.r, signature.s);
            await expect(coinFlip.connect(accounts.deployer).confirm(seed, signature.v, signature.r, signature.s))
                .to.be.revertedWith('Game already played');
        })

        it("Should revert with  msg Invalid signature", async () => {
            const seed = ethers.utils.formatBytes32String("game3");
            const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
            const signature = await web3.eth.accounts.sign(seed, privateKey)

             await expect(coinFlip.connect(accounts.deployer).confirm(seed, signature.v, signature.r, signature.s))
                .to.be.revertedWith('Invalid signature');

        it("Game result when you win", async () => {
            const seed = ethers.utils.formatBytes32String("game7");
            const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
            const signature = await web3.eth.accounts.sign(seed, privateKey)
            const betAmount = ethers.utils.parseEther("0.2");
            const choice = ethers.constants.Zero;
            const winBet = 390000000000000000n

                await coinFlip.connect(accounts.caller).play(choice, seed, { value: betAmount })
                await expect(coinFlip.connect(accounts.deployer).confirm(seed, signature.v, signature.r, signature.s))
                    .to
                    .emit(coinFlip, 'GamePlayed')
                    .withArgs(accounts.caller.address, betAmount, winBet, choice, 0, seed, 1);

                const a = await coinFlip.games(seed)
                console.log(a.toString())
                expect(a[0]).to.equal(4);
                expect(a[1]).to.equal(accounts.caller.address);
                expect(a[2]).to.equal(betAmount);
                expect(a[3]).to.equal(winBet);
                expect(a[4]).to.equal(choice);
                expect(a[5]).to.equal(0);
                expect(a[6]).to.equal(1);

            })

        it("Game result when you lose", async () => {
            const seed = ethers.utils.formatBytes32String("game8");
            const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
            const signature = await web3.eth.accounts.sign(seed, privateKey)
            const betAmount = ethers.utils.parseEther("0.2");
            const choice = ethers.constants.One;
            const winBet = 0

                await coinFlip.connect(accounts.caller).play(choice, seed, { value: betAmount })
                await expect(coinFlip.connect(accounts.deployer).confirm(seed, signature.v, signature.r, signature.s))
                    .to
                    .emit(coinFlip, 'GamePlayed')
                    .withArgs(accounts.caller.address, betAmount, winBet, choice, 0, seed, 2);

                const b = await coinFlip.games(seed)

                expect(b[0]).to.equal(5);
                expect(b[1]).to.equal(accounts.caller.address);
                expect(b[2]).to.equal(betAmount);
                expect(b[3]).to.equal(winBet);
                expect(b[4]).to.equal(choice);
                expect(b[5]).to.equal(0);
                expect(b[6]).to.equal(2);
            })
        })
    })



    describe("Function takeProfit: ", async () => {
        it("Should revert with msg Only the", async () => {
            await expect(coinFlip.connect(accounts.caller).takeProfit())
                .to.be.revertedWith("Only the")
        })

        //it("Should revert with msg HouseProfitEther is negative", async () => {
        //await coinFlip.houseProfitEther
        //})

        it("Should transfer profit to ProfitTaker", async () => {
            const houseProfitEther = await coinFlip.houseProfitEther();
            await expect(await coinFlip.takeProfit())
                .to.changeEtherBalances([coinFlip, accounts.deployer], [houseProfitEther.mul(ethers.constants.NegativeOne), houseProfitEther]);
        })
    })

    describe("Function withdraw", async () => {
        it("Should withdraw balance of contract", async () => {
            const houseProfitEther = await coinFlip.houseProfitEther();
            const balanceContract = await ethers.provider.getBalance(coinFlip.address)    //this is contract address 
            await expect(await coinFlip.withdraw())
                .to.changeEtherBalances([coinFlip, accounts.deployer], [balanceContract.sub(houseProfitEther).mul(ethers.constants.NegativeOne), balanceContract.sub(houseProfitEther)])
        })
    })




    describe("Function setBetRange ", async () => {
        it("Should set the new minBet and maxBet values", async () => {
            await coinFlip.setBetRange(2, 25);
            expect(await coinFlip.maxEtherBet())
                .to.equal(25);
            expect(await coinFlip.minEtherBet())
                .to.equal(2);
        })
    })


    describe("Function setWinCoefficient ", async () => {
        it("Should set the new coficient", async () => {
            await coinFlip.setWinCoefficient(175);
            expect(await coinFlip.WIN_COEFFICIENT())
                .to.equal(175);
        })
    })

    describe("Function setCroupier", async () => {
        it("Should set the new croupier", async () => {
            await coinFlip.setCroupier(accounts.deployer.address);
            expect(await coinFlip.croupier())
                .to.equal(accounts.deployer.address)
        })
    })

    describe("Function setProfitTaker", async () => {
        it("Should set the new profit taker", async () => {
            await coinFlip.setProfitTaker(accounts.deployer.address)
            expect(await coinFlip.profitTaker())
                .to.equal(accounts.deployer.address)
        })
    })

})




// Without test for event