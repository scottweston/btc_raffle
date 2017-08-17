const http = require('https');
const req = require('request');
const async = require('async');
const shuffle = require('shuffle-array');
const sleep = require('sleep');

var apiKey="MY_APIKEY";

var transactions = [];

//each address will be added 1 time for each ticket associated with it
var raffleTickets = [];

var verbose = false;
function log() {
  if (verbose) {
    console.log.apply(this, arguments);
  }
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
  req('https://api.blocktrail.com/v1/BCC/address/' + raffleAddress + '/transactions?api_key=' + apiKey , function(err, response, body) {
    if (!err) {
      var addrInfo = JSON.parse(body);
      if (addrInfo.msg) {
        console.log(addrInfo.msg);
        process.exit(1);
      }
      addrInfo.data.forEach(function(tx) {
        tx.outputs.forEach(function(output) {
          if (output.address == raffleAddress) {
            var tickets = Math.floor((output.value/100000000)/ticketPrice);
            var input = tx.inputs[output.spent_index];
            if (input) {
              for(var t=0; t<tickets; t++) {
                raffleTickets.push(input.address);
              }
            } else {
              console.log("ERROR: spent_index missing from inputs");
            }
          }
        });
      });

      var winner = [];
      for (i = winners; i > 0; i--) {
        winner.push(shuffle.pick(raffleTickets));
      }
      console.log("\nAND THE POTENTIAL WINNERS ARE:", winner);
    } else {
      console.log('Error fetching address info');
      process.exit(1);
    }
  });
}

var raffleAddress, ticketPrice;

if (process.argv.length != 4) {
  console.log("Usage:\n raffle.js <raffle_address> <bch_ticket_price>");
  return;
} else {
  raffleAddress = process.argv[2];
  ticketPrice = process.argv[3];

  console.log("Searching for transactions to:", raffleAddress);
  console.log("Price per ticket:", ticketPrice, "\n");
  getWinners(raffleAddress, ticketPrice, 10);
}
