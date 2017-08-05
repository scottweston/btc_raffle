const http = require('https');
const req = require('request');
const async = require('async');
const shuffle = require('shuffle-array');
const sleep = require('sleep');

var transactions = [];

//each address will be added 1 time for each ticket associated with it
var raffleTickets = [];

var verbose = false;
function log() {
  if (verbose) {
    console.log.apply(this, arguments);
  }
}

function getTransaction(txhash, callback) {
  req('https://blockexplorer.com/api/tx/' + txhash, function(err, response, body) {
    if (!err) {
      var txinfo = JSON.parse(body);
      if (txinfo.error) {
        console.log(txinfo.error);
        process.exit(1);
      }
      transactions.push(txinfo);
      callback();
      return txinfo;
    } else {
      console.log("Can't get transaction info");
      callback(err);
    }
  });
}


function processTransaction(tx) {
  console.log("Processing transaction:", tx.txid);
  for (var out of tx.vout) {
    if (out.scriptPubKey.addresses.indexOf(raffleAddress) >= 0) {
      const nTickets = Math.floor(out.value / ticketPrice);
      const address = tx.vin[out.spentIndex].addr;
      console.log("  Address " + address + " gets " + nTickets + " Tickets");
      for (var x = 0; x < nTickets; ++x) {
        raffleTickets.push(address);
      }
    }
  }
}

function getWinners(raffleAddress, ticketPrice, winners) {
  req('https://blockexplorer.com/api/addr/' + raffleAddress , function(err, response, body) {
    if (!err) {
      var addrInfo = JSON.parse(body);
      if (addrInfo.error) {
        console.log(addrInfo.error);
        process.exit(1);
      }
      async.eachSeries(addrInfo.transactions, getTransaction, function(err) {
        if (err) {
          console.log("Error processing transactions");
          process.exit(1);
        } else {
          for (var tx of transactions) {
            sleep.sleep(5);
            processTransaction(tx);
          }
          log("Tickets: ", raffleTickets);
          var winner = [];
          for (i = winners; i > 0; i--) {
            winner.push(shuffle.pick(raffleTickets));
          }
          console.log("\n\nAND THE POTENTIAL WINNERS ARE:", winner);
        }
      });
    } else {
      console.log('Error fetching address info');
      process.exit(1);
    }
  });
}

var raffleAddress, ticketPrice;

if (process.argv.length != 4) {
  console.log("Usage:\n raffle.js <raffle_address> <btc_ticket_price>");
  return;
} else {
  raffleAddress = process.argv[2];
  ticketPrice = process.argv[3];

  console.log("Searching for transactions to:", raffleAddress);
  console.log("Price per ticket:", ticketPrice, "\n");
  getWinners(raffleAddress, ticketPrice, 10);
}
