# Drip-Sell-XRPL-Token
This program was designed to allow users to slowly sell their XRPL tokens onto the open markets (XRPL Dex). The program offers several variables to be adjusted, to allow the set-up to suit personal, ethical and public/project use.

# Use-Case
This program was specifically designed to allow projects to design a token selling schedule that can be strictly adhered to and operate in the public eye of the XRPL. It allows projects (and users) to slowly sell their token holdings, which is vital to fund developement of their platform, within an easy to use system/guideline.

# Variables
The user can set several variables in the config file
nodes: An array of websockets for Rippled nodes (the function will cycle through the array if necessary)
retrymax: Max attempts repeat a process if an error was found (number)
secondsBetweenChecks: Seconds between each iteration of the program's checks
tokens: Array of variables (used if multiple accounts/tokens are being used)
      name: The name of the token (for logging purposes)
      hex: Hexcode for the token (As defined by the XRPL/Rippled)
      issuer: Issuing address of the token (XRPL)
      relativeOrderPrice: Price to sell at, relative to the lowest sell price (number)
      minimumPriceXRP: Minimum price to sell token ($XRP per token)
      orderExpiry: Seconds until the order expires (from set)
      amountPerSell: Amount of tokens to sell in each order
      seedOfWallet: Seed of the XRPL wallet holding the funds
      runUntilCrash: Boolean, if true the program will run indefinetly for this token (If false, refer to maxIterations)
      maxIterations: Max cycles/checks this token will participate in, regardless of sell activity (only relevant if runUntilCrash is true)
     
# Operation 
This program will create sell orders, as defined by the variables, and will only allow 1 eligible sellOffer to exist at any point. If the sell Offer is filled, or expires, the program will issue another order (relative with the varibales and the current market movements). In the event an order has expired, but has not been removed by Rippled, this program will remove the order, and issue a new one. The frequency this program will repeat this process as per the "secondsBetweenChecks" variable.

# Flow
1) Connect to XRPL
2) Repeat steps 3 to 9 as often as necessary (defined by "runUntilCrash" and "maxIterations")
3) Get the most recent validated ledger data
4) Repeat steps 5 to 9 for each token (as defined in the config file)
5) Check if the token should run (defined by "runUntilCrash" and "maxIterations")
6) Check the OrderBook for any relevant offers, and remove any expired orders
7) If an eligible order exists, skip the steps 8 to 9
8) Get the lowest sell price on the XRPL
9) Issue a sell price, relative to the data in step 8, using the variables defined in the config file
10) Close the program once all token cycles are complete 

# Error Handling 
All attempts will be made x times (defined in config file), in the event an attempt fails everytime, the program will close and create and log the error within an ERRORs.txt. The user can then resolve any issues as needed.

# Dependancies
xrpl -> https://github.com/XRPLF/xrpl.js

# Extra
Built using JS, OnChain Whales
