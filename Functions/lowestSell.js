
let lowestSell = async function(client, issuer, hex, ledgerindex) {
    var orders =  await client.request({
        "command": "book_offers",
        "ledger_index": ledgerindex,
        "limit": 400,
        "taker_pays": {
          "currency": "XRP"
        },
        "taker_gets": {
          "currency": hex,
          "issuer": issuer
        }
      })
        
      var offer = orders.result.offers[0]
      var takerGets = (offer.TakerGets.value)
      var takerPays = (offer.TakerPays)/1000000

      var xrpPertoken = takerPays/takerGets

        return xrpPertoken
}
module.exports = { lowestSell };
