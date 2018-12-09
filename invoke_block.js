'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');
var fs = require('fs')

//
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('mychannel');
let data = fs.readFileSync('/Users/kr901577/project/hyperledger/fabric-samples/basic-network/crypto-config/peerOrganizations/org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem')
// var peer = fabric_client.newPeer('grpc://localhost:7051');
// channel.addPeer(peer);
let peer = fabric_client.newPeer(
    'grpc://localhost:7051',
    {
        pem: Buffer.from(data).toString(),
        'ssl-target-name-override': 'peer0.org1.example.com'
    }
);

channel.addPeer(peer);
var order = fabric_client.newOrderer('grpc://localhost:7050')
channel.addOrderer(order);
// let event_hub = channel.newChannelEventHub(peer);

// block_reg = event_hub.registerBlockEvent((block) => {
//     console.log('Successfully received the block event');
    
// }, (error)=> {
//     console.log('Failed to receive the block event ::'+error);
 
// });
var chaincode_id = "test";
let event_hub = channel.newChannelEventHub(peer);//channel.newChannelEventHub(peer);

var promises = [];
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('user1', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded user1 from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get user1.... run registerUser.js');
	}
let event_monitor = new Promise((resolve, reject) => {
	let regid = null;
	let handle = setTimeout(() => {
		if (regid) {
			// might need to do the clean up this listener
			event_hub.unregisterChaincodeEvent(regid);
			event_hub.disconnect();
			console.log('Timeout - Failed to receive the chaincode event');
		}
		reject(new Error('Timed out waiting for chaincode event'));
	}, 30000);

	regid = event_hub.registerChaincodeEvent(chaincode_id.toString(), '^transfer*',
		(event, block_num, txnid, status) => {
		// This callback will be called when there is a chaincode event name
		// within a block that will match on the second parameter in the registration
		// from the chaincode with the ID of the first parameter.
		console.log('Successfully got a chaincode event with transid:'+ txnid + ' with status:'+status);
		console.log('Successfully got a chaincode event with block_no:'+ block_num);
		console.log('Successfully got a chaincode event:',event);
		// might be good to store the block number to be able to resume if offline
		//storeBlockNumForLater(block_num);

		// to see the event payload, the channel_event_hub must be connected(true)


		//if(event_payload.indexOf('CHAINCODE') > -1) {
			 clearTimeout(handle);
			// // Chaincode event listeners are meant to run continuously
			// // Therefore the default to automatically unregister is false
			// // So in this case we want to shutdown the event listener once
			// // we see the event with the correct payload
			 event_hub.unregisterChaincodeEvent(regid);
			 event_hub.disconnect();
			 console.log('Successfully received the chaincode event on block number '+ block_num);
			 resolve('RECEIVED');
		//} else {
			console.log('Successfully got chaincode event ... just not the one we are looking for on block number '+ block_num);
		//}

		// keep the block_reg to unregister with later if needed
		// let block_reg = event_hub.registerBlockEvent((block) => {
		// 	console.log('Successfully received the block event:'+block);
			
		// }, (error)=> {
		// 	console.log('Failed to receive the block event ::'+error);
		// 	reject(error);
		// });

	}, (error)=> {
		clearTimeout(handle);
		console.log('Failed to receive the chaincode event ::'+error);
		reject(error);
	}, 
	   {disconnect: true,  unregister: true} //disconnect when complete
	   
	);
	event_hub.connect();

		// no options specified
		// startBlock will default to latest
		// endBlock will default to MAX
		// unregister will default to false
		// disconnect will default to false

	});

// now that we have two promises all set to go... execute them
	Promise.all([event_monitor])
.then((results) => {
	console.log('evnet:', results);
})});