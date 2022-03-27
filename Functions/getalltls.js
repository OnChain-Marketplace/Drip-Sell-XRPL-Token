let getalltls = async function GetAllTrustlines(client, issuer, ledgerindex){

    var ArrayofTLs = []
//Initial account_lines request (gives us a place marker)

    var trustlines = await client.request({
        "command": "account_lines",
        "account": issuer,
        "limit": 400,
        "ledger_index": ledgerindex
      })


      var NewLines = trustlines.result.lines
      var PlaceMarker = trustlines.result.marker

      //append trustlines to array 
      var ArrayofTLs = ArrayofTLs.concat(NewLines)
    
//Repeating account_lines request utilising marker until all Trustlines are pulled 
//(i.e. A marker value is not returned in the JSON if we are at the end of the data )    

    while(PlaceMarker != null){
        var trustlines = await client.request({
            "command": "account_lines",
            "account": issuer,
            "limit": 400,
            "ledger_index": ledgerindex,
            "marker": PlaceMarker
          })
      
        var NewLines = trustlines.result.lines
        var PlaceMarker = trustlines.result.marker

        //append trustlines to array 
        var ArrayofTLs = ArrayofTLs.concat(NewLines)
    }

    return ArrayofTLs
}

module.exports = { getalltls };