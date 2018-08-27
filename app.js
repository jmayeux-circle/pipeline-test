//test 2
//test
//var StatsD = require('hot-shots')
var metrics = require('datadog-metrics')
var mysql = require('mysql')
var fs = require('fs')
var readline = require('readline')
var proc = require('process')
var aws = require('aws-sdk')
var ssm = new aws.SSM()
var https = require('https')

// uses key in $DATADOG_API_KEY
metrics.init()

var sql;

// sql.on('error', (err)=>{
//   console.log('SQL ERR', err)
// })

var currencyIDs = ['28','53','59','93','125','146','182','185','221','223','263','277','280','286','292']

var currencyNames = {
  28: 'BTC',
  53: 'DGB',
  59: 'DOGE',
  93: 'GAME',
  125: 'LTC',
  146: 'MYR',
  182: 'RDD',
  185: 'SDC',
  221: 'VTC',
  223: 'WDC',
  263: 'IOC',
  277: 'DCR',
  280: 'LBC',
  286: 'ZEC',
  292: 'BCH'
}

var fees = {
  28 : 0.00050000,
  53 : 0.10000000,
  59 : 5.00000000,
  93 : 0.01000000,
  125: 0.00100000,
  146: 0.01000000,
  182: 0.01000000,
  185: 0.01000000,
  221: 0.00100000,
  223: 0.01000000,
  263: 0.01000000,
  277: 0.10000000,
  280: 0.01000000,
  286: 0.00100000,
  292: 0.00010000
}

exports.lambda_handler = async (event, context, callback) => {
  
  require('dns').resolve('www.google.com', function(err) {
    if (err) {
       console.log("No connection");
    } else {
       console.log("Connected");
    }
  })
  
  https.get('https://google.com', (res)=>{
    res.on('data', (d)=>{
      console.log('data', d.toString('utf8'))
    })
  })
  
  let pass = await new Promise((resolve, rej)=>{
    ssm.getParameter({Name:"/dev/wallets-db", WithDecryption:true}, (err, data)=>{
      if (err) {
        console.log(err)
        proc.exit()
      } else {
        resolve(data.Parameter.Value)
      }
    })
  })
  
  // console.log("PASS", pass)
  
  sql = mysql.createConnection({
    host: 'polo-wallets-quicksight-replica.cezwd3kquoki.us-east-1.rds.amazonaws.com',
    // host: 'auroraclonetesting.c43fv9ef5v4d.us-east-1.rds.amazonaws.com',
    user: 'dev_readonly',
    password: pass,
    database: 'wallets',
    ssl: 'Amazon RDS',
    port: 3306
    // connectTimeout: 100000
  })

  // await new Promise((resolve, rej) => {
  //   sql.connect((err)=>{
  //     if (err) {
  //       console.log(err)
  //       sql.destroy()
  //     } else {
  //       console.log('Connected to MySQL')
  //     }
  //     resolve()
  //   })
  // })

  if (!event.currency) {
    console.log('Usage: ')
    console.log('\tnode app.js <currency name>')
    console.log('\tnode app.js <currency id>')
  }

  let arg = event.currency.toUpperCase()

  let curMode = ''

  if (parseInt(arg)) {
    curMode = arg
    if (!currencyIDs.includes(curMode)) {
      console.log('Unkown currency ID')
      proc.exit()
    }
  } else {
    if (arg.toUpperCase() == 'ALL') {
      curMode = 'ALL'
    } else {
      for (let i of currencyIDs) {
        if (currencyNames[i] == arg) {
          curMode = i
          break
        }
      }
      if (curMode == '') {
        console.log('Unkown currency')
        proc.exit()
      }
    }
  }

  await update(curMode.toString())
  
  await new Promise((resolve, rej)=>{
    sql.end((err)=>{
      if (err) {
        console.log("END", err)
      } else {
        console.log('ended connection')
      }
      resolve()
    }) 
  })
}

async function update(mode){//, resolve) {
  if (mode == 'ALL') {
    for (let i of currencyIDs) {
      await getUtxos(i)
    }
  } else {
    await getUtxos(mode)
  }
}

async function getUtxos(currency) {
  let lastTime = Date.now()
  let count = 0
  let increment = 1e7
  let utxos = []

  let limit = 1
  await new Promise((resolve, rej) => {
    sql.query('select count(amount) from wallets.unspent where spent=0 and currency='+currency, (err, res) => {
      if (err) {
        console.log(err)
      }
      limit = res[0]['count(amount)']
      resolve()
    })
  })

  console.log('Scanning '+currencyNames[currency]+' for '+limit+' UTXOs')

  while (count < limit) {
    await new Promise((resolve, rej) => {
      sql.query('select amount from wallets.unspent where spent=0 and currency='+currency+' limit '+count+', '+increment, (err, res) => {
        if (err) console.log(err)
        for (let tx of res) {
          utxos.push(tx.amount)
        }
        count+= res.length
        if (res.length == 0) {
          count = Infinity
        }
        resolve()
      })
    })
  }
  
  utxos.sort((a,b)=>{
    return b-a
  })

  let name = currencyNames[currency]
  let maxUtxo = utxos[0]
  let minUtxo = utxos[utxos.length-1]
  let sumUtxo = utxos.reduce((a,b)=>a+b, 0)
  let dustQty = utxos.reduce((a,b)=>{if(b < fees[currency]) {return a+1} return a}, 0)
  let dustVal = utxos.reduce((a,b)=>{if(b < fees[currency]) {return a+b} return a}, 0)
  let avgUtxo = sumUtxo / utxos.length
  let maxWd = 0
  for (let i = 0; i < Math.min(50, utxos.length); i++) {
    maxWd += utxos[i]
  }

  metrics.gauge('utxos.'+name+'.max', maxUtxo)
  metrics.gauge('utxos.'+name+'.min', minUtxo)
  metrics.gauge('utxos.'+name+'.balance', sumUtxo)
  metrics.gauge('utxos.'+name+'.avg', avgUtxo)
  metrics.gauge('utxos.'+name+'.count', utxos.length)
  metrics.gauge('utxos.'+name+'.dustQty', dustQty)
  metrics.gauge('utxos.'+name+'.dustVal', dustVal)
  metrics.gauge('utxos.'+name+'.maxWd', maxWd)

  console.log('Finished '+currencyNames[currency]+' in '+(Date.now()-lastTime)+'ms')
  console.log('Time Per UTXO: '+((Date.now()-lastTime)/utxos.length))
}

