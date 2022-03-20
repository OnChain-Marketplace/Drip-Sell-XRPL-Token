function siground(value, sigdecimals) {
    var value = value.toString()
    if(!(value.includes('.'))) return value
    var split = value.split('.')
    var whole = split[0]
    var dp = split[1]

    for(var a = 0; a < dp.length; a++){
        if(dp.charAt(a) == '0') continue

        var number = whole+"."+"0".repeat(a)+dp.charAt(a)
        for(var b = 1; b < sigdecimals; b++){
            if(dp.charAt(a+b) != null){
                var num = dp.charAt(a+b)
            } else {
                var num = "0"
            }
            number += num
        }
        break
    }

    return number.replace(/([0-9]+(.[0-9]+[1-9])?)(.?0+$)/,'$1')
}

module.exports = { siground };