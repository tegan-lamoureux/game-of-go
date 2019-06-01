//go server
'use strict';

var express = require('express');
var socket = require('socket.io');
var assert = require('assert');

var server = express();

server.use('/', express.static(__dirname + '/'));

var io = socket(server.listen(process.env.PORT || 8080));

//keys: Turn and stonePositions. gameState.stonePositions is
// object containing all positins
var boardState={};
var playerColor={};
playerColor['black']=null; 
playerColor['white']=null;

io.on('connection', function(objectSocket) {
	console.log('client connected');
	console.log(objectSocket.id);

	//if new client and move has already been made. give them the
	//current board positions/turn info
	if (boardState !== 0){
		io.emit('moveEvent', boardState);
	}

	objectSocket.on('moveEvent', function(objectData) {
		console.log(objectData);
		//save current game state from last move
		boardState = objectData;
		//reverse color 
		if (boardState.turn == 'black'){
			boardState.turn= 'white'
		}
		else{
			boardState.turn= 'black'
		}
		io.emit('moveEvent', boardState);
	});

	objectSocket.on('colorChoiceEvent', function(objectData){
		console.log(`player chose ${objectData.colorChoice}`);
		var assignedColor= null;

		//validate color choice
		//if color choice is available
		if(playerColor[objectData.colorChoice] === null){
			console.log('color is available');
			playerColor[objectData.colorChoice]=objectSocket.id;
			assignedColor=objectData.colorChoice;

			//remove client id from other color if necesary if player is reversing color
			if(objectData.colorChoice == 'black' && playerColor['white'] === objectSocket.id){
				playerColor['white'] = null;
			}
			if(objectData.colorChoice == 'white' && playerColor['black'] === objectSocket.id){
				playerColor['black'] = null;
			}
		}
		//if they chose black and white available
		else if((objectData.colorChoice == 'black') && (playerColor['white']===null)){
			console.log('player chose black but white is available');
			assignedColor='white'
		}
		//if they chose white, check black
		else if((objectData.colorChoice == 'white') && (playerColor['black'] ===null)){
			console.log('player chose white but black is available');
			assignedColor= 'black'
		}
		//assign observer color=none
		else{
			console.log('no color assigned')
			assignedColor=objectData.currentColor
		}

		//send assigned color back to player
		io.to(objectSocket.id).emit('assignColorEvent', assignedColor);

		//update other players color choices
	});

	objectSocket.on('disconnect', function() {
		if(playerColor['black']=== objectSocket.id){
			playerColor['black']=null;
		}
		if(playerColor['white']=== objectSocket.id){
			playerColor['black']=null;
		}
		console.log('client disconnected');
	});
});

console.log('go ahead and open "http://localhost:8080/go_client_test.html" in your browser');

console.log(playerColor['white']);