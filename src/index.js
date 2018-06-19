import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

/* INTERNAL TODO
 * - Add dialog for promotion
 * - Add win conditions
 * - Improve UI for moving pieces (e.g. allow dragging)
 * - Show where pieces can move, as an option
 * - Make board resizable
 * - Make board flippable
 * 
 * Known bugs:
 * - Castling seems to be disallowed at times it should be allowed, though
 *   this problem is inconsistent and hard to reproduce.
 */

class Pc {
    constructor(type, team, x, y) {
        this.type = type;
        this.team = team;
        this.hasMoved = false;
        this.justDoubleMoved = false;
        if (x !== undefined) this.x = x;
        if (y !== undefined) this.y = y;
    }
}

var [WHITE, BLACK] = [0, 1];
var [W, B] = [WHITE, BLACK];
var TEAM_NAME = [
    "White",
    "Black",
];
var TEAM_NAME_LC = [
    "white",
    "black",
];

var [PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING] = [1, 2, 3, 4, 5, 6];
var [P, R, KN, BI, Q, KI] = [PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING];
var PIECE_NAME = [
    "",
    "Pawn",
    "Rook",
    "Knight",
    "Bishop",
    "Queen",
    "King",
];
var PIECE_NAME_LC = [
    "",
    "pawn",
    "rook",
    "knight",
    "bishop",
    "queen",
    "king",
];

const ROOK_MOVES = [
    (x, y, direction) => { return {x: x, y: y + direction} },
    (x, y, direction) => { return {x: x + direction, y: y} },
];
const BISHOP_MOVES = (x, y, directionX, directionY) => {
    return {
        x: x + directionX,
        y: y + directionY,
    };
};

var regulationStartingPieces = {
    "0,0": new Pc(R, W), "1,0": new Pc(KN, W), "2,0": new Pc(BI, W), "3,0": new Pc(KI, W),
    "4,0": new Pc(Q, W), "5,0": new Pc(BI, W), "6,0": new Pc(KN, W), "7,0": new Pc(R, W), 
    "0,1": new Pc(P, W), "1,1": new Pc(P, W), "2,1": new Pc(P, W), "3,1": new Pc(P, W),
    "4,1": new Pc(P, W), "5,1": new Pc(P, W), "6,1": new Pc(P, W), "7,1": new Pc(P, W),
    "0,6": new Pc(P, B), "1,6": new Pc(P, B), "2,6": new Pc(P, B), "3,6": new Pc(P, B),
    "4,6": new Pc(P, B), "5,6": new Pc(P, B), "6,6": new Pc(P, B), "7,6": new Pc(P, B),
    "0,7": new Pc(R, B), "1,7": new Pc(KN, B), "2,7": new Pc(BI, B), "3,7": new Pc(KI, B),
    "4,7": new Pc(Q, B), "5,7": new Pc(BI, B), "6,7": new Pc(KN, B), "7,7": new Pc(R, B),
};

var castlingTestingPieces = {
    "0,0": new Pc(R, W), "3,0": new Pc(KI, W), "5,0": new Pc(BI, W), "7,0": new Pc(R, W),
    "2,1": new Pc(P, W),
    "0,2": new Pc(BI, W),
    "7,5": new Pc(BI, B),
    "5,6": new Pc(P, B),
    "0,7": new Pc(R, B), "2,7": new Pc(BI, B), "3,7": new Pc(KI, B), "7,7": new Pc(R, B)
};

/**
 * Determines whether the attempted move is valid
 *
 * @param {*} piece The start piece, with x and y specified as properties
 * @param {*} dest The end position of the move, with x and y specified as properties
 * @param {*} board The array of piece positions on the board
 * @returns An object detailing the move and whether or not it is valid
 */
function isValidMove(piece, dest, pieces) {
    var destPiece = getPiece(dest.x, dest.y, pieces);
    if (destPiece && destPiece.team === piece.team) {
        return {isValid: false, moves: [], isCastling: false, capturedPiece: null};
    }
    var capturedPiece = null;
    var isValid = false;
    var mvmt = {
        x: dest.x - piece.x,
        y: dest.y - piece.y,
    };
    var dir = {
        x: mvmt.x < 0 ? -1 : 1,
        y: mvmt.y < 0 ? -1 : 1,
    }
    var moves = [{
        piece: piece,
        start: {x: piece.x, y: piece.y},
        end: dest
    }];
    var isCastling = false;

    switch (piece.type) {
        case PAWN:
            // Verify we're moving in the right direction
            if (piece.team === WHITE ? mvmt.y < 0 : mvmt.y > 0) break;
            if (Math.abs(mvmt.x) === 1 && Math.abs(mvmt.y) === 1) {
                // Attempted capture
                if (!destPiece) {
                    // En passant
                    destPiece = getPiece(dest.x, dest.y - mvmt.y, pieces);
                    if (!destPiece ||
                        destPiece.team === piece.team ||
                        !destPiece.justDoubleMoved) {
                        break;
                    }
                }
                capturedPiece = destPiece;
                isValid = true;
            } else if (mvmt.x === 0) {
                var maxMvmt = piece.team === WHITE ? 1 : -1;
                isValid = Math.abs(mvmt.y) <= 2 && (piece.team === WHITE ? mvmt.y > 0 : mvmt.y < 0);
                if (isValid) {
                    if (!piece.hasMoved) {
                        isValid = getPiece(piece.x, piece.y + maxMvmt, pieces) === null;
                        maxMvmt *= 2;
                    }
                    isValid = isValid &&
                        (piece.team === WHITE ? mvmt.y <= maxMvmt : mvmt.y >= maxMvmt) &&
                        !destPiece;
                }
            }
            break;
        case ROOK:
            // Determine if the requested move matches a movement function for this piece
            var rookMoveFunc;
            if (mvmt.y !== 0 && mvmt.x === 0) {
                rookMoveFunc = (x, y) => { return {x: x, y: y + dir.y} }
            } else if (mvmt.x !== 0 && mvmt.y === 0) {
                rookMoveFunc = (x, y) => { return {x: x + dir.x, y: y} }
            } else {
                break;
            }
            isValid = true;
            // Check to make sure all spaces between here and the destination are clear
            for (let l = rookMoveFunc(piece.x, piece.y); l.x !== dest.x || l.y !== dest.y; l = rookMoveFunc(l.x, l.y)) {
                if (getPiece(l.x, l.y, pieces) !== null) {
                    isValid = false;
                    break;
                }
            }
            break;
        case KNIGHT:
            mvmt.x = Math.abs(mvmt.x);
            mvmt.y = Math.abs(mvmt.y);
            isValid = (mvmt.x === 2 && mvmt.y === 1) || (mvmt.x === 1 && mvmt.y === 2);
            break;
        case BISHOP:
            // Determine if the requested move matches a movement function for this piece
            if (Math.abs(mvmt.x) !== Math.abs(mvmt.y)) break;
            var bishopMoveFunc = (x, y) => {
                return {
                    x: x + dir.x,
                    y: y + dir.y,
                };
            };
            isValid = true;
            // Check to make sure all spaces between here and the destination are clear
            for (let l = bishopMoveFunc(piece.x, piece.y); l.x !== dest.x && l.y !== dest.y; l = bishopMoveFunc(l.x, l.y)) {
                if (getPiece(l.x, l.y, pieces) !== null) {
                    isValid = false;
                    break;
                }
            }
            break;
        case QUEEN:
            // Determine if the requested move matches a movement function for this piece
            var queenMoveFunc;
            if (mvmt.y !== 0 && mvmt.x === 0) {
                queenMoveFunc = (x, y) => { return {x: x, y: y + dir.y} }
            } else if (mvmt.x !== 0 && mvmt.y === 0) {
                queenMoveFunc = (x, y) => { return {x: x + dir.x, y: y} }
            } else if (Math.abs(mvmt.x) === Math.abs(mvmt.y)) {
                queenMoveFunc = (x, y) => {
                    return {
                        x: x + dir.x,
                        y: y + dir.y,
                    };
                };
            } else {
                break;
            }
            isValid = true;
            // Check to make sure all spaces between here and the destination are clear
            for (let l = queenMoveFunc(piece.x, piece.y); l.x !== dest.x || l.y !== dest.y; l = queenMoveFunc(l.x, l.y)) {
                if (getPiece(l.x, l.y, pieces) !== null) {
                    isValid = false;
                    break;
                }
            }
            break;
        case KING:
            // If the place the king is moving to is in check, don't allow it
            var absMvmt = {
                x: Math.abs(mvmt.x),
                y: Math.abs(mvmt.y),
            };
            isValid = absMvmt.x <= 1 && absMvmt.y <= 1;
            if (absMvmt.x === 2 && absMvmt.y === 0 && !piece.hasMoved) {
                // Attempted castling
                var rook = dir.x < 0 ? getPiece(0, piece.y, pieces) : getPiece(7, piece.y, pieces);
                if (rook !== null && rook.type === ROOK && !rook.hasMoved) {
                    isCastling = true;
                    // Ensure spaces between rook and king are empty
                    for (let i = rook.x - dir.x; i !== piece.x; i -= dir.x) {
                        if (getPiece(i, rook.y, pieces) !== null) {
                            isCastling = false;
                            break;
                        }
                    }
                    // Check if king is in check -- saving most complex calculation for last
                    isCastling = !isKingInCheck(piece, pieces) &&
                        !isKingInCheck({x: piece.x + dir.x, y: piece.y}, pieces, piece.team);
                }
                if (isCastling) {
                    isValid = true;
                    moves.push({
                        piece: rook,
                        start: rook,
                        end: {x: piece.x + dir.x, y: piece.y}
                    });
                }
            }
            // Check if the final position of the king would be in check
            isValid = isValid && !isKingInCheck(dest, pieces, piece.team);
            break;
        default:
            isValid = false;
            break;
    }

    // Ensure king would not be in check if move is followed through on
   if (isValid && (!destPiece || (destPiece && destPiece.type !== KING))) {
        let piecesCopy = JSON.parse(JSON.stringify(pieces));
        if (destPiece) {
            removePiece(destPiece.x, destPiece.y, piecesCopy);
        }
        movePiece(piece, dest, piecesCopy);
        let king;
        if (piece.team === WHITE) {
            king = piecesCopy[piecesCopy.whiteKing];
        } else {
            king = piecesCopy[piecesCopy.blackKing];
        }
        isValid = isValid && !isKingInCheck(king, piecesCopy);
    }

    if (isValid && !capturedPiece && destPiece) {
        capturedPiece = destPiece;
    }
    
    return {
        isValid: isValid,
        moves: moves,
        isCastling: isCastling,
        capturedPiece: capturedPiece
    };
}

function addMove(moves, pieces, piece, to, captured = null) {
    let id = `${to.x},${to.y}`;
    moves[id] = {
        piece: piece,
        to: to,
        captured: captured,
    };
    return moves[id];
}

function isValidMovement(piece, location) {
    return (piece.x !== location.x || piece.y !== location.y) &&
        location.x >= 0 &&
        location.x <= 7 &&
        location.y >= 0 &&
        location.y <= 7;
}

function getPieceMoves(piece, pieces) {
    if (!piece || !piece.hasOwnProperty('type')) return null;
    
    var directions = [-1, 1];
    var moves = [/*
        {
            piece: moving piece with x and y properties,
            to: where the piece is moving to,
            captured: the piece captured if a capture occurs
        }
    */];

    switch (piece.type) {
        case PAWN:
            let direction = piece.team === WHITE ? 1 : -1;
            // Check for captures
            let potentialCaptures = [
                getPiece(piece.x - 1, piece.y + direction, pieces),
                getPiece(piece.x + 1, piece.y + direction, pieces)
            ];
            for (let pc = 0; pc < potentialCaptures.length; pc++) {
                if (potentialCaptures[pc] && potentialCaptures[pc].team !== piece.team) {
                    addMove(
                        moves,
                        pieces,
                        piece,
                        {x: potentialCaptures[pc].x, y: potentialCaptures[pc].y},
                        potentialCaptures[pc]
                    );
                }
            }
            // Check for en passant captures
            let potentialEnPassants = [
                getPiece(piece.x + 1, piece.y, pieces),
                getPiece(piece.x - 1, piece.y, pieces)
            ];
            for (let pc = 0; pc < potentialCaptures.length; pc++) {
                if (potentialEnPassants[pc] &&
                    potentialEnPassants[pc].team !== piece.team &&
                    potentialEnPassants[pc].justDoubleMoved) {
                    addMove(
                        moves,
                        pieces,
                        piece,
                        {
                            x: potentialEnPassants[pc].x,
                            y: potentialEnPassants[pc].y + direction
                        },
                        potentialEnPassants[pc]
                    );
                }
            }
            // Check for regular single and double moves
            if (!getPiece(piece.x, piece.y + direction, pieces)) {
                addMove(moves, pieces, piece, {x: piece.x, y: piece.y + direction});
            }
            if (!piece.hasMoved && !getPiece(piece.x, piece.y + direction * 2, pieces)) {
                addMove(moves, pieces, piece, {x: piece.x, y: piece.y + direction * 2});
            }
            break;
        case ROOK:
            for (let d in directions) {
                let dir = directions[d];
                for (let i = 0; i < ROOK_MOVES.length; i++) {
                    for (let l = ROOK_MOVES[i](piece.x, piece.y, dir); isValidMovement(piece, l); l = ROOK_MOVES[i](l.x, l.y, dir)) {
                        let potentialCapture = getPiece(l.x, l.y, pieces);
                        if (!potentialCapture || potentialCapture.team !== piece.team) {
                            addMove(moves, pieces, piece, {x: l.x, y: l.y}, potentialCapture);
                        }
                        if (potentialCapture) break;
                    }
                }
            }
            break;
        case KNIGHT:
            let possibleMoves = [
                {x: -2, y: -1},
                {x: -1, y: -2},
                {x: 1,  y: -2},
                {x: 2,  y: -1},
                {x: 2,  y: 1},
                {x: 1,  y: 2},
                {x: -1, y: 2},
                {x: -2, y: 1},
            ];
            for (let i = 0; i < possibleMoves.length; i++) {
                let potentialCapture = getPiece(possibleMoves[i].x, possibleMoves[i].y, pieces);
                if (potentialCapture === undefined) continue;
                if (potentialCapture === null || potentialCapture.team !== piece.team) {
                    addMove(moves, pieces, piece, {x: possibleMoves[i].x, y: possibleMoves[i].y}, potentialCapture);
                }
            }
            break;
        case BISHOP:
            for (let i = 0; i < directions.length; i++) {
                for (let j = 0; j < directions.length; j++) {
                    let dx = directions[j];
                    let dy = directions[i];
                    for (let l = BISHOP_MOVES(piece.x, piece.y, dx, dy); isValidMovement(piece, l); l = BISHOP_MOVES(l.x, l.y, dx, dy)) {
                        let potentialCapture = getPiece(l.x, l.y, pieces);
                        if (!potentialCapture || potentialCapture.team !== piece.team) {
                            addMove(moves, pieces, piece, {x: l.x, y: l.y}, potentialCapture);
                        }
                        if (potentialCapture) break;
                    }
                }
            }
            break;
        case QUEEN:
            for (let d in directions) {
                let dir = directions[d];
                for (let i = 0; i < ROOK_MOVES.length; i++) {
                    for (let l = ROOK_MOVES[i](piece.x, piece.y, dir); isValidMovement(piece, l); l = ROOK_MOVES[i](l.x, l.y, dir)) {
                        let potentialCapture = getPiece(l.x, l.y, pieces);
                        if (!potentialCapture || potentialCapture.team !== piece.team) {
                            addMove(moves, pieces, piece, {x: l.x, y: l.y}, potentialCapture);
                        }
                        if (potentialCapture) break;
                    }
                }
            }
            for (let i = 0; i < directions.length; i++) {
                for (let j = 0; j < directions.length; j++) {
                    let dx = directions[j];
                    let dy = directions[i];
                    for (let l = BISHOP_MOVES(piece.x, piece.y, dx, dy); isValidMovement(piece, l); l = BISHOP_MOVES(l.x, l.y, dx, dy)) {
                        let potentialCapture = getPiece(l.x, l.y, pieces);
                        if (!potentialCapture || potentialCapture.team !== piece.team) {
                            addMove(moves, pieces, piece, {x: l.x, y: l.y}, potentialCapture);
                        }
                        if (potentialCapture) break;
                    }
                }
            }
            break;
        case KING:
            break;
        default:
    }
    /*
    console.log(`MOVES FOR ${TEAM_NAME[piece.team]} ${PIECE_NAME[piece.type]}`);

    for (let m in moves) {
        if (moves.hasOwnProperty(m)) {
            console.log(`Valid move (${m}):`);
            console.log(moves[m].to);
            if (moves[m].captured)
                console.log(moves[m].captured);
        }
    }*/

    return moves;
}

/**
 * Determines whether or not the king piece or space given is in check
 *
 * @param {*} king Either the king or an object with an (x, y) coordinate
 * @param {*} pieces The game pieces object
 * @param {*} kingTeam The team of the king, used for hypothetical king positions
 * @returns The checking piece if found, null otherwise
 */
/*function isKingInCheck(king, pieces, kingTeam) {
    if (king == null) {
        console.error("Invalid parameter given: king is null or undefined");
        return null;
    }
    let hypothetical = king.team == null;
    if (kingTeam === undefined) {
        kingTeam = !hypothetical ? king.team : null;
    }
    if (kingTeam == null) {
        console.error("King team could not be determined");
        return null;
    }
    for (let coord in pieces) {
        if (!["whiteKing", "blackKing", "lastMoved"].includes(coord) && pieces.hasOwnProperty(coord)) {
            let pieceIsKing = pieces[coord].x === king.x && pieces[coord].y === king.y;
            if (pieces[coord] === null || pieceIsKing) continue;
            if (kingTeam === pieces[coord].team) continue;
            let move = isValidMove(pieces[coord], king, pieces);
            if (move.capturedPiece) return pieces[coord];
        }
    }
    return null;
}*/
function isKingInCheck(team, pieces) {
    let kingCoord = team === WHITE ? pieces.whiteKing : pieces.blackKing;
    for (let coord in pieces) {
        if (!pieces.hasOwnProperty(coord) || !pieces[coord].hasOwnProperty('moves')) {
            continue;
        }

        if (pieces[coord].moves.hasOwnProperty(kingCoord)) {
            return true;
        }
    }
    return false;
}

function isCheckmate(king, pieces) {

}

/**
 * Returns the piece on the board at the given (x, y) coordinate for the given
 * pieces, or null if not found. The piece will also be assigned an x and y
 * property so that it "knows" where it is on the board.
 *
 * @param {*} x The X coordinate
 * @param {*} y The Y coordinate
 * @param {*} pieces The object specifying game pieces and locations, each key
 *                   being in the form of "x,y"
 * @returns The piece if found, null otherwise
 */
function getPiece(x, y, pieces) {
    // Invalid arguments
    if (isNaN(x) || isNaN(y) || !pieces) return undefined;
    // Off the board
    if (x < 0 || x > 7 || y < 0 || y > 7) return undefined;

    // Try to find the piece
    let key = x + "," + y;
    if (pieces.hasOwnProperty(key)) {
        return pieces[key];
    }

    return null;
}
 
/**
 * Removes the piece at the specified (x, y) coordinate from the given
 * pieces.
 *
 * @param {*} x The X coordinate
 * @param {*} y The Y coordinate
 * @param {*} pieces The object specifying game pieces and locations, each key
 *                   being in the form of "x,y"
 * @returns The piece if found and removed, null otherwise
 */
function removePiece(x, y, pieces) {
    // Invalid arguments
    if (isNaN(x) || isNaN(y) || !pieces) return null;
    // Off the board
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;

    let key = x + "," + y;
    let piece = pieces[key];
    delete pieces[key];
    return piece;
}

/**
 * Moves the piece from start to end and updates its self-coordinates
 *
 * @param {*} start An object specifying the start position with x and y properties
 * @param {*} end An object specifying the end position with x and y properties
 * @param {*} pieces The object specifying game pieces and locations, each key
 *                   being in the form of "x,y"
 * @returns True if piece successfully removed, false otherwise
 */
function movePiece(start, end, pieces) {
    if (getPiece(end.x, end.y, pieces)) {
        console.error("Tried moving a piece to an occupied space!");
        return false;
    }
    let piece = removePiece(start.x, start.y, pieces);
    let pieceId = end.x + "," + end.y;
    if (Math.abs(start.y - end.y) === 2 && piece.type === PAWN) {
        piece.justDoubleMoved = true;
    }
    piece.hasMoved = true;
    piece.x = end.x;
    piece.y = end.y;
    if (piece.type === KING) {
        if (piece.team === WHITE) {
            pieces.whiteKing = pieceId;
        } else {
            pieces.blackKing = pieceId;
        }
    }
    pieces[pieceId] = piece;
    if (pieces.lastMoved && pieces.hasOwnProperty(pieces.lastMoved)) {
        pieces[pieces.lastMoved].justDoubleMoved = false;
    }
    pieces.lastMoved = pieceId;
    return true;
}

function updatePieceMoves(pieces, changedCoords = []) {
    for (let coord in pieces) {
        if (["whiteKing", "blackKing", "lastMoved"].includes(coord) || !pieces.hasOwnProperty(coord)) {
            continue;
        }

        for (let i = 0; i < changedCoords.length; i++) {
            if (pieces[coord].moves && !pieces[coord].moves.hasOwnProperty(changedCoords[i])) {
                continue;
            }
        }
        
        pieces[coord].moves = getPieceMoves(pieces[coord], pieces);
    }
}

/**
 * Find and returns the two kings
 *
 * @param {*} pieces The game pieces object
 * @returns The white and black kings in an object with properties whiteKing and blackKing
 */
function getKings(pieces) {
    let whiteKing = null;
    let blackKing = null;
    for (let coord in pieces) {
        if (whiteKing !== null && blackKing !== null) break;
        if (pieces.hasOwnProperty(coord) && pieces[coord] !== null) {
            if (pieces[coord].type === KING) {
                if (pieces[coord].team === WHITE) {
                    whiteKing = coord;
                } else {
                    blackKing = coord;
                }
            }
        }
    }
    return {whiteKing: whiteKing, blackKing: blackKing};
}

class Space extends React.Component {
    render() {
        let classes = [];
        if (this.props.highlight === true) {
            classes.push("highlight");
        }

        var coords = this.props.showCoords ? <span className="spotId">{this.props.pos}</span> : null;

        if (this.props.piece) {
            var type = this.props.piece.type !== null ? PIECE_NAME_LC[this.props.piece.type] : "";
            var team = this.props.piece.team !== null ? TEAM_NAME_LC[this.props.piece.team] : "";
            var img = null;
            
            classes.push(team);

            if (type !== "" && team !== "") {
                img = <img src={require(`../public/images/${type}.png`)} alt={`${type}`} />;
                classes.push("occupied");
                if (this.props.isOnDeck) {
                    classes.push("on-deck");
                }
            }
        }
        
        return (
            <td className={classes.join(" ")} onClick={this.props.onClick}>{coords}{img}</td>
        );
    }
}

class Board extends React.Component {
    constructor(props) {
        super(props);

        let pieces = regulationStartingPieces;
        // Locate the kings for easier calculations later on
        let {whiteKing, blackKing} = getKings(pieces);
        pieces.whiteKing = whiteKing;
        pieces.blackKing = blackKing;
        pieces.lastMoved = null;

        for (let p in pieces) {
            if (!pieces.hasOwnProperty(p) || ["blackKing", "whiteKing", "lastMoved"].includes(p)) {
                continue;
            }

            let coords = p.split(",");
            let x = parseInt(coords[0], 10);
            let y = parseInt(coords[1], 10);
            pieces[p].x = x;
            pieces[p].y = y;
        }

        updatePieceMoves(pieces);

        this.state = {
            history: [{
                pieces: pieces,
                whiteCaptured: [],
                blackCaptured: [],
                whitesTurn: true,
                kingStatus: "",
            }],
            index: 0,
            pieceToMove: null,
            ignoreTurns: false,
            isReplaying: false,
            stopReplaying: false,
            showCoords: true,
        };
    }

    resetTurn() {
        this.setState({pieceToMove: null});
    }

    handleClick(x, y) {
        if (this.state.isReplaying) return;

        var pieceToMove = this.state.pieceToMove;
        var pieces = JSON.parse(JSON.stringify(this.state.history[this.state.index].pieces));
        var clickedPiece = getPiece(x, y, pieces);

        if (this.state.pieceToMove === null) {
            if (clickedPiece !== null && clickedPiece.team === (this.state.history[this.state.index].whitesTurn ? WHITE : BLACK)) {
                clickedPiece.x = x;
                clickedPiece.y = y;
                this.setState({
                    pieceToMove: clickedPiece,
                });
                getPieceMoves(clickedPiece, pieces);
            }
        } else {
            var move = isValidMove(pieceToMove, {x: x, y: y}, pieces);
            if (clickedPiece !== null && !move.capturedPiece && !move.isCastling) {
                this.resetTurn();
                return;
            }

            if (move.isValid) {
                var newState = {
                    whitesTurn: !this.state.history[this.state.index].whitesTurn || this.state.ignoreTurns,
                    whiteCaptured: this.state.history[this.state.index].whiteCaptured.slice(),
                    blackCaptured: this.state.history[this.state.index].blackCaptured.slice(),
                };
                var moves = [];
                
                if (move.capturedPiece) {
                    if (move.capturedPiece.team === WHITE) {
                        newState.whiteCaptured.push(move.capturedPiece);
                    } else {
                        newState.blackCaptured.push(move.capturedPiece);
                    }
                    removePiece(move.capturedPiece.x, move.capturedPiece.y, pieces);
                    moves.push(`${move.capturedPiece.x},${move.capturedPiece.y}`);
                }

                for (let i = 0; i < move.moves.length; i++) {
                    movePiece(move.moves[i].start, move.moves[i].end, pieces);
                    moves.push(`${move.moves[i].start.x},${move.moves[i].start.y}`);
                    moves.push(`${move.moves[i].end.x},${move.moves[i].end.y}`);
                }
                updatePieceMoves(pieces, moves);
    
                newState.pieces = JSON.parse(JSON.stringify(pieces));

                var history = this.state.history.slice();
                history.push(newState);
                this.setState({
                    history: history,
                    index: this.state.index + 1,
                }, () => {
                    // Check whether or not the king is in check
                    let history = this.state.history.slice();
                    let pieces = JSON.parse(JSON.stringify(history[this.state.index].pieces));

                    let whiteKingAttacker = isKingInCheck(WHITE, pieces);
                    let blackKingAttacker = isKingInCheck(BLACK, pieces);

                    if (whiteKingAttacker) {
                        history[this.state.index].kingStatus = "White king in check!";
                        console.debug("White king attacker:");
                        console.debug(whiteKingAttacker);
                    } else if (blackKingAttacker) {
                        history[this.state.index].kingStatus = "Black king in check!";
                        console.debug("Black king attacker");
                        console.debug(blackKingAttacker);
                    } else {
                        history[this.state.index].kingStatus = "";
                    }

                    history[this.state.index].pieces = pieces;
                    this.setState({history: history});
                });
            }
            this.resetTurn();
        }
    }

    jumpTo(index) {
        this.setState({index: index});
    }

    render() {
        let replay =
            <button className="replay" onClick={() => {
                if (this.state.isReplaying) {
                    this.setState({
                        stopReplaying: true,
                        index: this.state.history.length - 1,
                    });
                } else {
                    var i = 0;
                    var intervalId = setInterval(() => {
                        if (this.state.stopReplaying) {
                            clearInterval(intervalId);
                            this.setState({
                                stopReplaying: false,
                                isReplaying: false,
                            });
                        } else {
                            this.jumpTo(i);
                            i++;
                            if (i >= this.state.history.length) {
                                clearInterval(intervalId);
                                this.setState({
                                    isReplaying: false,
                                    stopReplaying: false,
                                });
                            }
                        }
                    }, 500);
                    this.setState({
                        isReplaying: true,
                        stopReplaying: false,
                    });
                }

            }}>
                {this.state.isReplaying ? "Stop Replay" : "Instant Replay"}
            </button>;

        let whiteTrayOccupied = this.state.history[this.state.index].whiteCaptured.length > 0;
        let blackTrayOccupied = this.state.history[this.state.index].blackCaptured.length > 0;
        let whiteTrayClasses = ["pieceTray"];
        let blackTrayClasses = ["pieceTray"];
        if (whiteTrayOccupied) whiteTrayClasses.push("occupied");
        if (blackTrayOccupied) blackTrayClasses.push("occupied");

        return (
            <div>
                <p className="status-bar">
                    <span className="whos-turn">{this.state.history[this.state.index].whitesTurn ? "White's" : "Black's"} Turn</span>
                    <span className="king-status">{this.state.history[this.state.index].kingStatus}</span>
                </p>
                <div className={blackTrayClasses.join(" ")}>
                    {this.state.history[this.state.index].blackCaptured.map((piece, index) => {
                        let type = PIECE_NAME_LC[piece.type];
                        let typeUc = PIECE_NAME[piece.type];
                        let team = TEAM_NAME[piece.team];
                        return (
                            <img key={index} className={type} src={require(`../public/images/${type}.png`)} alt={`${team} ${typeUc}`} />
                        );
                    })}
                </div>
                <table>
                    <tbody>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i, y) => {
                        return (
                            <tr key={i}>
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((j, x) => {
                                    return (
                                        <Space
                                            key={x + "," + y}
                                            pos={x + "," + y}
                                            piece={getPiece(x, y, this.state.history[this.state.index].pieces)}
                                            showCoords={this.state.showCoords}
                                            highlight={this.state.pieceToMove && isValidMove(this.state.pieceToMove, {x: x, y: y}, this.state.history[this.state.index].pieces).isValid}
                                            isOnDeck={this.state.pieceToMove && (this.state.pieceToMove.x === x && this.state.pieceToMove.y === y)}
                                            onClick={() => this.handleClick(x, y)}
                                            />
                                    );
                                })}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                <div className={whiteTrayClasses.join(" ")}>
                    {this.state.history[this.state.index].whiteCaptured.map((piece, index) => {
                        let type = PIECE_NAME[piece.type];
                        let typeLc = PIECE_NAME_LC[piece.type];
                        let team = TEAM_NAME[piece.team];
                        let teamLc = TEAM_NAME_LC[piece.team];
                        return (
                            <img key={index} className={teamLc} src={require(`../public/images/${typeLc}.png`)} alt={`${team} ${type}`} />
                        );
                    })}
                </div>
                <div>{replay}</div>
            </div>
        );
    }
}

class ChessGame extends React.Component {

    render() {
        return (
            <div id="game">
                <h2 className="title">Chess</h2>
                <Board />
                <div className="footer">Project by Jake Oliger. <a href="https://jakeoliger.com">Website</a>. <a href="https://github.com/JakeOliger/Chess">GitHub</a>. Icons from <a href="https://icons8.com/">Icons8</a>.</div>
            </div>
        );
    }

}

// ========================================

ReactDOM.render(
    <ChessGame />,
    document.getElementById('root')
);
