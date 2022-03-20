const xrpl = require('xrpl')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function xconnect(xrpClient, nodes) {
    for (const x of nodes) {
        console.log("\nCONNECTING TO " + x)
        xrpClient = new xrpl.Client(x)

        var connectCount = 0
        while (connectCount < 5) {
            try {
                await xrpClient.connect()
                break
            } catch (err) {
                console.log("Error Connecting")
                connectCount += 1

                if (connectCount == 5) {
                    console.log("\n<<couldn't connect to " + x + ">>")
                }
            }
        }
        if (xrpClient.isConnected()) {
            console.log("\n<<CONNECTED TO " + x + ">>")
            return xrpClient
        }
    }
}

async function xReconnect(xrpClient, nodes) {
    console.log("\n<<XRPL CLIENT DISCONNECTED>>")
    xrpClient = await xconnect(xrpClient, nodes);

    if (!xrpClient.isConnected()) {
        await delay(1000);
        xReconnect();
    } else {
        xrpClient.on('disconnected', async () => {
            await xReconnect(xrpClient, nodes);
        });
        return xrpClient;
    }
}

module.exports = {
    xconnect,
    xReconnect
};