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
		var size=19;
		console.log(objectData);
		//save current game state from last move
		boardState = objectData;
		//reverse color
		//check_board(boardState.positions, size);
		//print_board(positions, size);
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

		// Let players know the game can start
		if (playerColor['white']!==null && playerColor['black']!==null) {
			var positions={}
			var coord = '';
			for(var i = 1; i <= size; i++) {
				for(var j = 1; j <= size; j++) {
					coord = i.toString() + '-' + j.toString();
					positions[coord] = 0;
				}
			}
			io.emit('ready',
				positions	
			);
		}
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
function check_stone(coord, positions, size){
    coordArr=coord.split('-')
    var x= parseInt(coordArr[0]);
    var y= parseInt(coordArr[1]);
    var isFree=false;
    var checked=[];
    //console.log('check_stone', coord, x, y) 
    //assume captured unless you find freedom in adjacent spot
    //or connnected stone has adjacent spot
    isFree=has_freedom(x, y, checked, positions, size);    
    //console.log(coord,'isFree=', isFree);

    if(isFree == false){
       capture(x, y, positions, size)
    }
}

function has_freedom(x, y, oldCheckList, positions, size){
    var rightFreedom= false;
    var leftFreedom= false;
    var topFreedom= false;
    var bottomFreedom= false;
    var color=get_val(x, y, positions);
    var coord=x.toString()+'-'+y.toString()
    var checkList=[];
    checkList.push(coord);
    //console.log('has_freedom coord=', coord, x, y, 'color=', color);

    for(var i=0; i<oldCheckList.length; i=i+1){
        checkList.push(oldCheckList[i]);
    }

    // check if any free if neigbor is free space return true
    //check if stone to left is free if x > 1
    if(x >1 && get_val(x-1, y, positions)=== 0){
        return true;
    }
    //check stone to right if x less 19
    if(x<size && (get_val((x+1), y, positions)===0)){
        return true;
    }
    //check stone above if y is greater than 1
    if(y>1 && get_val(x, y-1, positions)===0){
        return true
    }
    //check stone below if y is less than 19
    if(y<size && get_val(x, y+1, positions)===0){
        return true
    }

    //if neigbor is same color, recursivly check it 
    if (x>1 && color === get_val(x-1, y, positions) && not_checked(x-1, y, checkList)){
        leftFreedom = has_freedom(x-1, y, checkList, positions, size)
    }
    if (x<19 && color === get_val(x+1, y, positions) && not_checked(x+1, y, checkList)){
        rightFreedom = has_freedom(x+1, y, checkList, positions, size)
    }
    //check above
    if (y>1 && color === get_val(x, y-1, positions) && not_checked(x, y-1, checkList)){
        topFreedom = has_freedom(x, y-1, checkList, positions, size)
    }
    //check below
    if (y<19 && color === get_val(x, y+1, positions) && not_checked(x, y+1, checkList)){
        bottomFreedom = has_freedom(x, y+1, checkList, positions, size)
    }
    
    if(rightFreedom || leftFreedom || topFreedom || bottomFreedom){
        return true;
    }
    else{
        return false
    }
}
function get_val(x, y, positions){
    coord= x.toString() + '-' + y.toString();
    //console.log('get_val() coord=', coord, x, y)
    return positions[coord];
}

function capture(x, y, positions, size){
    coord=x.toString() + '-' + y.toString();

    //get color of space
    color=positions[coord];

    //change space to empty 
    //console.log('capturing ', coord)
    positions[coord]=0;   

    //if neightbor is same color call on neighbor
    if (x>1 && color === get_val(x-1, y, positions)){
        capture(x-1, y, positions, size)
    }
    if (x<19 && color === get_val(x+1, y, positions)){
        capture(x+1, y, positions, size)
    }
    //check above
    if (y>1 && color === get_val(x, y-1, positions)){
        capture(x, y-1, positions, size)
    }
    //check below
    if (y<19 && color === get_val(x, y+1, positions)){
        capture(x, y+1, positions, size)
    }
}

function not_checked(x, y, checkList){
    coord= x.toString() + '-' + y.toString();
    len=checkList.length
    for(var i=0; i<len; i=i+1){
        if(checkList[i] == coord)
            return false;
    }
    return true;
}

function print_board(positions, size){
    line='';
    for(var i=1; i<size+1; i=i+1){
        for(var j=1; j<size+1; j=j+1){
            coord=i.toString() + '-' + j.toString(); 
            //console.log(coord)
            line = line + positions[coord] + '  ';
            //console.log(get_val(i, j, positions))
        }
        console.log(line)
        line='';
    }
}

function check_board(positions, size){
    for(var i=1; i<size+1; i=i+1){
        for(var j=1; j<size+1; j=j+1){
            coord=i.toString() + '-' + j.toString(); 
            //console.log('check_board', coord);
            check_stone(coord, positions, size);
        }
    }
}
