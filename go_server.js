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
var passCount=0;
var size=19;
playerColor['black']=null;
playerColor['white']=null;

io.on('connection', function(objectSocket) {
	console.log('client connected');
	console.log(objectSocket.id);

	//if new client and move has already been made. give them the
	//current board positions/turn info
	// Check that positions aren't null and that the 1,1 location exists
	// inside it.
	if (boardState.stonePositions !== undefined && ('1-1' in boardState.stonePositions)){
		io.emit('moveEvent', boardState);
	}

    objectSocket.on('passEvent', function(){
        var gameWinner='';
        passCount=passCount + 1;
        if (passCount === 2){
					console.log(boardState);
            //score board
            var scoreObj={};
            scoreObj= score_board(boardState.stonePositions, size);
            console.log('black score: ', scoreObj.black);
            console.log('white score: ', scoreObj.white);

            if(scoreObj.black>scoreObj.white){
                gameWinner='black';
            }
            if(scoreObj.black<scoreObj.white){
                gameWinner='white';
            }
            if(scoreObj.black === scoreObj.white){
                gameWinner='tie';
            }

		    io.emit('gameOver', {
                'winner': gameWinner,
                'blackScore': scoreObj.black,
                'whiteScore': scoreObj.white
            });
        }
		if (boardState.turn == 'black'){
			boardState.turn= 'white'
		}
		else{
			boardState.turn= 'black'
		}
		io.emit('moveEvent', boardState);
    });

    objectSocket.on('newGame', function(){
        var passCount=0;
        playerColor['black']=null;
        playerColor['white']=null;

        var positions={};
        var coord = '';
        for(var i = 1; i <= 19; i++) {
            for(var j = 1; j <= 19; j++) {
                coord = i.toString() + '-' + j.toString();
                positions[coord] = 0;
            }
        }
        boardState.turn='black';
        boardState.stonePositions=positions;
        io.emit('moveEvent', boardState);
    });

	objectSocket.on('moveEvent', function(objectData) {
        var size=19;
        passCount=0;
		//console.log(objectData);
		//save current game state from last move
		boardState = objectData;
		//reverse color
        check_board(boardState.stonePositions, size);
        console.log('after return from check_board')
		print_board(boardState.stonePositions, size);
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
		}
		//if they chose black and white available
		else if((objectData.colorChoice == 'black') && (playerColor['white']===null)){
			console.log('player chose black but white is available');
			assignedColor='white'
			playerColor[assignedColor]=objectSocket.id;
		}
		//if they chose white, check black
		else if((objectData.colorChoice == 'white') && (playerColor['black'] ===null)){
			console.log('player chose white but black is available');
			playerColor[assignedColor]=objectSocket.id;
		}

		//send assigned color back to player
		io.to(objectSocket.id).emit('assignColorEvent', assignedColor);

		//update other players color choices

		// Let players know the game can start
		if (playerColor['white']!==null && playerColor['black']!==null) {
			// Initialize the game board.
			var positions={};
			var coord = '';
			for(var i = 1; i <= 19; i++) {
				for(var j = 1; j <= 19; j++) {
					coord = i.toString() + '-' + j.toString();
					positions[coord] = 0;
				}
			}

			io.emit('ready', positions);
		}
	});

	objectSocket.on('disconnect', function() {
		if(playerColor['black']=== objectSocket.id){
			playerColor['black']=null;
		}
		if(playerColor['white']=== objectSocket.id){
			playerColor['white']=null;
		}
		console.log('client disconnected');
	});
});

console.log('go ahead and open "http://localhost:8080/go_client_test.html" in your browser');

console.log(playerColor['white']);
// ------------------------------------------------------------------------
//                               scoring
// -------------------------------------------------------------------------

function score_board(positions, size){
    var scoreObj=new Object();
    scoreObj.black=0;
    scoreObj.white=0;
    var color=null;
    var seenList=[];

    for(var i=1; i<size+1; i=i+1){
        for(var j=1; j<size+1; j=j+1){
            var coord=i.toString() + '-' + j.toString();
            //get color of current vertex
            color= get_val(i, j, positions)
            if(color === 1){
                scoreObj.black=scoreObj.black + 1
            }
            else if(color===2){
                scoreObj.white=scoreObj.white+1
            }
            else{
                //if blank and not already checked
                if(not_checked(i, j, seenList)){
                    //count white spaces and determined if surrounded
                    //return black, white, score, checkedList
                    var emptyGroupObj= new Object();
                    emptyGroupObj.black=false;
                    emptyGroupObj.white=false;
                    emptyGroupObj.areaTotal=0;
                    //console.log('scoring empty group starting at ', coord);
                    score_empty_spaces(coord, seenList, emptyGroupObj, positions);
                    //console.log(emptyGroupObj);
                    //console.log();
                    if(emptyGroupObj.black=== true && emptyGroupObj.white===false){
                        scoreObj.black= scoreObj.black + emptyGroupObj.areaTotal;
                    }
                    if(emptyGroupObj.black=== false && emptyGroupObj.white===true){
                        scoreObj.white= scoreObj.white + emptyGroupObj.areaTotal;
                    }
                }
            }
        }
    }
    return scoreObj
}


function score_empty_spaces(coordStr, seenList, emptyGroupObj, positions){
    var coordArr=coordStr.split('-')
    var size=19;
    var x= parseInt(coordArr[0]);
    var y= parseInt(coordArr[1]);
    var black=1;
    var white=2;

    //add stuff for the square
    seenList.push(coordStr);
    emptyGroupObj.areaTotal=emptyGroupObj.areaTotal+1;

    //check surrounding squares
    //if black or white add true to emptyGroupObj
    //if empty call count_blank_spaces on it
    //check left - fixed
    if(y>1 && black === get_val(x, y-1, positions)){
        emptyGroupObj.black=true;
    }
    if(y>1 && white === get_val(x, y-1, positions)){
        emptyGroupObj.white=true;
    }
    if(y>1 && 0 === get_val(x, y-1, positions) && not_checked(x, y-1, seenList)){
        score_empty_spaces(coord_str(x, y-1), seenList, emptyGroupObj, positions);
    }
    //right - fixed
    if(y<size && black === get_val(x, y+1, positions)){
        emptyGroupObj.black=true;
    }
    if(y<size && white === get_val(x, y+1, positions)){
        emptyGroupObj.white=true;
    }
    if (y<size && 0 === get_val(x, y+1, positions) && not_checked(x, y+1, seenList)){
        score_empty_spaces(coord_str(x, y+1), seenList, emptyGroupObj, positions);
    }
    //check above - fixed
    if(x<size && black === get_val(x+1, y, positions)){
        emptyGroupObj.black=true;
    }
    if(x<size && white === get_val(x+1, y, positions)){
        emptyGroupObj.white=true;
    }
    if (x<size && 0 === get_val(x+1, y, positions) && not_checked(x+1, y, seenList)){
        score_empty_spaces(coord_str(x+1, y), seenList, emptyGroupObj, positions);
    }
    //check below
    if(x>1 && black === get_val(x-1, y, positions)){
        emptyGroupObj.black=true;
    }
    if(x>1 && white === get_val(x-1, y, positions)){
        emptyGroupObj.white=true;
    }
    if (x>1 && 0 === get_val(x-1, y, positions) && not_checked(x-1, y, seenList)){
        score_empty_spaces(coord_str(x-1, y), seenList, emptyGroupObj, positions);
    }
}

function coord_str(x, y){
    var xStr= x.toString();
    var yStr= y.toString();
    var coordStr =xStr + '-' + yStr;
    return coordStr;
}

// ------------------------------------------------------------------------
//                               capturing
// -------------------------------------------------------------------------

function check_stone(coord, positions, size){
    var coordArr=coord.split('-')
    var x= parseInt(coordArr[0]);
    var y= parseInt(coordArr[1]);
    var isFree=false;
    var checked=[];
    //console.log('check_stone', coord, x, y)
    //assume captured unless you find freedom in adjacent spot
    //or connnected stone has adjacent spot
    isFree=has_freedom(x, y, checked, positions, size);
    //console.log(coord,'isFree=', isFree);

    if(isFree === false){
       print_board(positions, size);
       console.log();
       capture(x, y, positions, size);
       //console.log();
       //print_board(positions, size);
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
    //check left - DONE
    //if(x >1 && get_val(x-1, y, positions)=== 0){
    if(y >1 && get_val(x, y-1, positions)=== 0){
        return true;
    }
    //check  right -- DONE
    //if(x<size && (get_val((x+1), y, positions)===0)){
    if(y<size && (get_val(x, y+1, positions)===0)){
        return true;
    }
    //check above
    //if(y>1 && get_val(x, y-1, positions)===0){
    if(x<size && get_val(x+1, y, positions)===0){
        return true
    }
    //check below -- DONE
    //if(y<size && get_val(x, y+1, positions)===0){
    if(x>1 && get_val(x-1, y, positions)===0){
        return true
    }

    //if neigbor is same color, recursivly check it
    //left- DONE
    //if (x>1 && color === get_val(x-1, y, positions) && not_checked(x-1, y, checkList)){
    if (y>1 && color === get_val(x, y-1, positions) && not_checked(x, y-1, checkList)){
        //leftFreedom = has_freedom(x-1, y, checkList, positions, size)
        leftFreedom = has_freedom(x, y-1, checkList, positions, size)
    }
    //right - DONE
    //if (x<19 && color === get_val(x+1, y, positions) && not_checked(x+1, y, checkList)){
    if (y<size && color === get_val(x, y+1, positions) && not_checked(x, y+1, checkList)){
        //rightFreedom = has_freedom(x+1, y, checkList, positions, size)
        rightFreedom = has_freedom(x, y+1, checkList, positions, size)
    }
    //check above - DONE
    //if (y>1 && color === get_val(x, y-1, positions) && not_checked(x, y-1, checkList)){
    if (x<size && color === get_val(x+1, y, positions) && not_checked(x+1, y, checkList)){
        //topFreedom = has_freedom(x, y-1, checkList, positions, size)
        topFreedom = has_freedom(x+1, y, checkList, positions, size)
    }
    //check below - DONE
    //if (y<19 && color === get_val(x, y+1, positions) && not_checked(x, y+1, checkList)){
    if (x>1 && color === get_val(x-1, y, positions) && not_checked(x-1, y, checkList)){
        //bottomFreedom = has_freedom(x, y+1, checkList, positions, size)
        bottomFreedom = has_freedom(x-1, y, checkList, positions, size)
    }

    if(rightFreedom || leftFreedom || topFreedom || bottomFreedom){
        return true;
    }
    else{
        return false
    }
}
function get_val(x, y, positions){
    var coord= x.toString() + '-' + y.toString();
    //console.log('get_val() coord=', coord, x, y)
    return positions[coord];
}

function capture(x, y, positions, size){
    var coord=x.toString() + '-' + y.toString();

    //get color of space
    var color=positions[coord];

    //change space to empty
    //console.log('capturing ', coord)
    positions[coord]=0;

    //if neightbor is same color call on neighbor
    //LEFT
    if(y >1 && color=== get_val(x, y-1, positions)){
    //if (x>1 && color === get_val(x-1, y, positions)){
        capture(x, y-1, positions, size)
        //capture(x-1, y, positions, size)
    }
    //RIGHT
    if(y<size && color === get_val(x, y+1, positions)){
        capture(x, y+1, positions, size)
    }
    //TOP
    if(x<size && color=== get_val(x+1, y, positions)){
    //if (y>1 && color === get_val(x, y-1, positions)){
        capture(x+1, y, positions, size)
    }
    //BOTTOM
    if(x>1 && color === get_val(x-1, y, positions)){
    //if (y<19 && color === get_val(x, y+1, positions)){
        capture(x-1, y, positions, size)
    }
}

function not_checked(x, y, checkList){
    var coord= x.toString() + '-' + y.toString();
    var len=checkList.length
    for(var i=0; i<len; i=i+1){
        if(checkList[i] == coord)
            return false;
    }
    return true;
}

function print_board(positions, size){
    var line='';
    var coord=''
    for(var i=19; i>0; i=i-1){
        for(var j=1; j<19+1; j=j+1){
            coord=i.toString() + '-' + j.toString();
            //coord= j.toString() + '-' + i.toString() ;
            //console.log(coord)
            line = line + positions[coord] + '  ';
            //console.log(get_val(i, j, positions))
        }
        console.log(line)
        line='';
    }
}

function check_board(positions, size){
    var coord=''
    for(var i=1; i<size+1; i=i+1){
        for(var j=1; j<size+1; j=j+1){
            coord=i.toString() + '-' + j.toString();
            //console.log('check_board', coord);
            check_stone(coord, positions, size);
        }
    }
}
