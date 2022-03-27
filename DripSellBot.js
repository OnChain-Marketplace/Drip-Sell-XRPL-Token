//Dependancies 
const xrpl = require('xrpl')
const fs = require('fs')

//LOCALLY MADE COMMANDS
const {currentledger} = require("./Functions/currentledger")
const {wait} = require("./Functions/wait")
const {siground} = require('./Functions/siground')
const {lowestSell} = require('./Functions/lowestSell')
const {getalltls} = require('./Functions/getalltls')
const {round} = require(`./Functions/round`)
const {
    xconnect,
    xReconnect
} = require('./Functions/xrplConnect')

//config file reporting
const {
    nodes,
    retrymax,
    tokens,
    secondsBetweenChecks
} = require('./config.json');

//Define initial client
var client = new xrpl.Client(nodes[0])

//Error Handling
process.on('unhandledRejection', async (reason, promise) => {
    var error = `Unhandled rejection at, ${promise}, reason: ${reason}`;
    console.log(error)
    fs.writeFileSync("./ERRORS.txt", `\nUnhandled Rejection: ${error}`)
    process.exit(1)
});

process.on('uncaughtException', async (err) => {
    console.log(`Uncaught Exception: ${err.message}`)
    fs.writeFileSync("./ERRORS.txt", `\nUncaught Exception: ${err.message}`)
    process.exit(1)
});

//Main asynchronous function
async function main() {

    //connect to XRPL
    client = await xconnect(client, nodes)

    //reconnect unpon disconnect
    client.on('disconnected', async () => {
        client = await xReconnect(client, nodes);
    });

    console.log(`—————\nThis Tool Was Developed, For Public Use, by OnChain Whales\nPlease visit our website @ onchainwhales.net to see just what we can bring to the NFTs on the XRPL\nTwitter: @onchainwhales\nEmail: josh@onchainwhales.net\n—————\n`)

    //Start of loops
    var run = true
    var count = 1
    while (run) {

        //start time
        console.log(`\n\n<< STARTING NEW SCAN ${count} >>`)
        var start = Date.now()
        var run = false

        //Get current validated ledger
        var searchCount = 0
        while (searchCount < retrymax) {
            try {
                var current = await currentledger(client, "validated") //returns [ledgerindex, ledgertime]
                var currentledgerindex = current[0]
                var rippleLedgerTime = current[1]
                var currentledgertime = xrpl.rippleTimeToUnixTime(current[1]) / 1000
                console.log(`The time since Epoch is ${currentledgertime} seconds, LedgerIndex is ${currentledgerindex}`)
                break
            } catch (err) {
                console.log(`Error Getting Current Ledger ${searchCount}`)
                searchCount += 1

                if (searchCount == retrymax) {
                    fs.writeFileSync("./ERRORS.txt", `\nCOULDN"T GET CURRENT LEDGER\n LIKELY TO BE AN ISSUE WITH WEBSOCKET OR INTERNET CONNECTION \nTIME:${start}`)
                    process.exit(1)
                }
            }
        }

        //get prices of unique tokens
        for (a in tokens) {
            var name = tokens[a].name
            var hex = tokens[a].hex
            var issuer = tokens[a].issuer
            var minPrice = tokens[a].minimumPriceXRP
            var relativeOP = tokens[a].relativeOrderPrice
            var orderExpiry = tokens[a].orderExpiry
            var seedOfWallet = tokens[a].seedOfWallet
            var maxIterations = tokens[a].maxIterations
            var runUntilCrash = tokens[a].runUntilCrash
            var constAmount = tokens[a].constAmount


            var wallet = xrpl.Wallet.fromSeed(seedOfWallet)
            console.log(`\nUSING ACCOUNT: ${wallet.classicAddress}`)

            var expiration = (Number(rippleLedgerTime) + Number(orderExpiry))

            if (runUntilCrash) {
                console.log(`RUNNING UNTIL CRASH`)
            } else {
                if (maxIterations < count) {
                    console.log(`Maxed Out Already`)
                    continue
                }
                console.log(`CONTINUING UNTIL ${maxIterations} ITERATIONS`)
            }

            var run = true

            //Check for Old Orders
            var searchCount = 0
            while (searchCount < retrymax) {
                try {
                    var sellarray = []
                    var marker = null
                    var first = true
                    while (marker != null || first) {
                        let offers = await client.request({
                            command: "book_offers",
                            taker: wallet.classicAddress,
                            ledger_index: currentledgerindex,
                            taker_pays: {
                                currency: "XRP"
                            },
                            taker_gets: {
                                currency: hex,
                                issuer: issuer
                            },
                            marker: marker
                        });
                        var newdata = offers.result.offers
                        var sellarray = sellarray.concat(newdata)
                        var marker = offers.result.marker
                        var first = false
                    }
                    break
                } catch (err) {
                    console.log(`Error Getting Order History ${searchCount}`)
                    searchCount += 1

                    if (searchCount == retrymax) {
                        fs.writeFileSync("./ERRORS.txt", `\nCOULDN"T GET RELEVANT ORDERS FOR ${name} in Variables ${a}\n LIKELY TO BE AN ISSUE WITH DATA IN THE CONFIG FILE (OR CONNECTIONS/WEBSOCKET)\nTIME:${start}`)
                        process.exit(1)
                    }
                }
            }

            //Check if Offer Exists, and Remove any Expired Offers
            var newOffer = true
            for (b in sellarray) {
                if (sellarray[b].Account == wallet.classicAddress) {
                    if (sellarray[b].Expiration < rippleLedgerTime) {
                        console.log(`Expired Offer Exists\nRemoving Offer ${sellarray[b].Sequence}`)

                        //Remove Order
                        var searchCount = 0
                        while (searchCount < retrymax) {
                            try {
                                var cancelOffer = await client.autofill({
                                    "TransactionType": "OfferCancel",
                                    "Account": wallet.classicAddress,
                                    "Fee": "20",
                                    "OfferSequence": sellarray[b].Sequence,
                                    "LastLedgerSequence": currentledgerindex + 20
                                })
                                var signed = wallet.sign(cancelOffer)
                                var result = await client.submitAndWait(signed.tx_blob);
                                break
                            } catch (err) {
                                console.log(`Error Getting Current Ledger ${searchCount}`)
                                searchCount += 1

                                if (searchCount == retrymax) {
                                    fs.writeFileSync("./ERRORS.txt", `\nCOULDN"T REMOVE EXPIRED ORDER IN VARIABLE ${a}\nLIKELY TO BE AN ISSUE WITH DATA BEING SUBMITTED TO RIPPLED (OR CONNECTIONS/WEBSOCKET)\nTIME:${start}`)
                                    process.exit(1)
                                }
                            }
                        }
                        if (result.result.meta.TransactionResult == "tesSUCCESS") {
                            console.log(`SUCCESS:            ${signed.hash}`)
                        } else {
                            console.log(`ERROR\n${result.result.meta.TransactionResult}:            ${signed.hash}`)
                        }
                    } else {
                        var newOffer = false
                    }
                }
            }

            //Skip Creating Order if Viable Offer is Found
            if (!(newOffer)) {
                console.log(`Existing Viable Offer Found`)
                continue
            }

            if (constAmount) {
                var value = round(tokens[a].amountPerSell, 8)
                console.log(`ISSUING NEW OFFER -> FOR CONSTANT ${value} $${name}`)
            } else {
                //Get Trustlines
                var checkCount = 0
                while (checkCount < retrymax) {
                    try {
                        var trustlines = await getalltls(client, wallet.classicAddress, currentledgerindex)
                        console.log(`GOT ALL HOLDINGS OF ${wallet.classicAddress}`)
                        break
                    } catch (err) {
                        console.log(`Error Getting Trustlines ${searchCount}`)
                        checkCount += 1
                    }

                    if (checkCount == retrymax) {
                        fs.writeFileSync("./ERRORS.txt", `\nCOULDN"T GET TRUSTLINES ${a}\nLIKELY TO BE AN ISSUE WITH DATA IN THE CONFIG FILE (OR CONNECTIONS/WEBSOCKET)\n TIME:${start}`)
                        process.exit(1)
                    }
                }

                for (b in trustlines) {
                    if (trustlines[b].currency == hex) {
                        if (trustlines[b].account == issuer) {
                            var total = Math.abs(trustlines[b].balance)
                        }
                    }
                }

                var value = round(Number(total) * Number(tokens[a].ratioPerSell), 8)
                console.log(`ISSUING NEW OFFER -> FOR VARIABLE ${value} $${name}`)
            }

            //Get Lowest Sell Price
            var checkCount = 0
            while (checkCount < retrymax) {
                try {
                    var xrpPertoken = await lowestSell(client, issuer, hex, currentledgerindex)
                    break
                } catch (err) {
                    console.log(`Error Getting Lowest Sell Price ${searchCount}`)
                    checkCount += 1
                }

                if (checkCount == retrymax) {
                    fs.writeFileSync("./ERRORS.txt", `\nCOULDN"T GET ${name} $XRP VALUE FOR VARIABLE ${a}\nLIKELY TO BE AN ISSUE WITH DATA IN THE CONFIG FILE (OR CONNECTIONS/WEBSOCKET)\n TIME:${start}`)
                    process.exit(1)
                }
            }

            console.log(`Lowest Sell Price of ${name} is ${siground(xrpPertoken)} $XRP`)

            var priceTosell = (xrpPertoken * relativeOP) * 1000000
            if (priceTosell < (minPrice * 1000000)) {
                var priceTosell = minPrice * 1000000
            }

            console.log(`Placing Sell Order for ${value} ${name} for ${siground(priceTosell/1000000)} $XRP each (${siground((value*priceTosell)/1000000)} total)`)

            //Submit sell order
            var checkCount = 0
            while (checkCount < retrymax) {
                try {
                    var Offer = await client.autofill({
                        "TransactionType": "OfferCreate",
                        "Account": wallet.address,
                        "Expiration": expiration,
                        "Fee": "20",
                        "TakerPays": (priceTosell * value).toFixed(0),
                        "TakerGets": {
                            "currency": hex,
                            "issuer": issuer,
                            "value": value
                        }
                    });
                    var signed = wallet.sign(Offer)
                    var result = await client.submitAndWait(signed.tx_blob);
                    break
                } catch (err) {
                    console.log(`Error Submitting Order ${searchCount}`)
                    checkCount += 1
                }

                if (checkCount == retrymax) {
                    fs.writeFileSync("./ERRORS.txt", `\nCOULDN'T SUBMIT SELL ORDER FOR ${value} $${name}\nLIKELY TO BE AN ISSUE WITH CONNECTIONS/WEBSOCKET (OR DATA BEING SUBMITTED, CHECK IT THE VALUE IS A VIABLE NUMBER)\n TIME:${start}`)
                    process.exit(1)
                }
            }
            if (result.result.meta.TransactionResult == "tesSUCCESS") {
                console.log(`SUCCESS:            ${signed.hash}`)
            } else {
                console.log(`ERROR\n${result.result.meta.TransactionResult}:            ${signed.hash}`)
            }

        }

        //After iterating through variables, wait the designated time if applicable before retrying 
        var end = new Date()
        var length = (end - start) / 1000
        var waitTime = secondsBetweenChecks - length
        if (waitTime > 0) {
            console.log(`_____WAITING FOR ${waitTime.toFixed(0)} SECONDS_____`)
            await wait(waitTime)
        } else {
            console.log('NO NEED TO WAIT')
        }
        count += 1
    }

    //Once all variables have complete their cycles, exit the program
    client.disconnect()
    console.log(`\n\nALL SELLS DONE FOR SPECIFIED TIME`)

    console.log(`\n\n\n—————\nWebsite @ onchainwhales.net\nTwitter: @onchainwhales\nEmail: josh@onchainwhales.net\n—————\n`)

    process.exit(1)
}
main()
