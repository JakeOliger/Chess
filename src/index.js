import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

/* INTERNAL TODO
 * - Add dialog for promotion
 * - Add win conditions
 * - Disallow moves that don't save the king from being in check
 * - Add captured piece icons to trays rather than listing them below the board
 * - Improve UI for moving pieces (e.g. allow dragging)
 * - Show where pieces can move, as an option
 * - Make board resizable
 * 
 * Known bugs:
 * - Pawn en passant capturing code seems to give false positives, though
 *   doesn't follow through on moves?
 * - Castling seems to be disallowed at times it should be allowed, though
 *   this problem is inconsistent and hard to reproduce.
 */

class Pc {
    constructor(type, team, x, y) {
        this.type = type;
        this.team = team;
        this.isFirstMove = true;
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
function isValidMove(piece, dest, pieces, whiteKing, blackKing) {
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

    // Ensure non-king piece cannot be moved if king is in check
    /*
    if (piece.type !== KING &&
        ((piece.team === WHITE && isKingInCheck(whiteKing, pieces)) ||
        ((piece.team === BLACK && isKingInCheck(blackKing, pieces))))) {
        return {isValid: false, moves: moves, isCastling: false};
    }
    */

    switch (piece.type) {
        case PAWN:
            if (mvmt.x !== 0) {
                isValid = false;
                break;
            }
            var maxMvmt = piece.team === WHITE ? 1 : -1;
            isValid = Math.abs(mvmt.y) <= 2 && (piece.team === WHITE ? mvmt.y > 0 : mvmt.y < 0);
            if (isValid) {
                if (piece.isFirstMove) {
                    isValid = getPiece(piece.x, piece.y + maxMvmt, pieces) === null;
                    maxMvmt *= 2;
                }
                isValid = isValid && (piece.team === WHITE ? mvmt.y <= maxMvmt : mvmt.y >= maxMvmt);
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
            if (absMvmt.x === 2 && absMvmt.y === 0 && piece.isFirstMove) {
                // Attempted castling
                var rook = dir.x < 0 ? getPiece(0, piece.y, pieces) : getPiece(7, piece.y, pieces);
                if (rook !== null && rook.type === ROOK && rook.isFirstMove) {
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
    // DEBUG
    if (piece.type === PAWN) {
        console.debug("Move is " + (isValid ? "valid" : "invalid"));
    }
    return {isValid: isValid, moves: moves, isCastling: isCastling};
}

/**
 * Determines whether a given move results in a valid vapture
 *
 * @param {*} validMove Whether the move is valid
 * @param {*} captor The starting position of the move
 * @param {*} captive The end position of the move
 * @param {*} pieces The array of pieces on the board
 * @returns The captured piece, if there is one
 */
function isValidCapture(validMove, captor, captivePos, pieces, hypothetical) {
    hypothetical = hypothetical || false;
    var captive = getPiece(captivePos.x, captivePos.y, pieces);
    var dest = {x: captivePos.x, y: captivePos.y};
    var enPassant = false;
    var isValid = false;
    var mvmt;
    if (hypothetical) {
        captive = {team: (captor.team === WHITE ? BLACK : WHITE), justDoubleMoved: false};
    } else if (captor.type === PAWN && captive === null) {
        // En passant capturing detection
        console.log("enPassant!");
        console.log(captivePos);
        console.log(captor);
        console.log("endPassant.");
        enPassant = true;
        captivePos.y += (captor.team === WHITE ? -1 : 1);
        captive = getPiece(captivePos.x, captivePos.y, pieces);
    }
    if (captor === null || captive === null) return null;
    mvmt = {
        x: dest.x - captor.x,
        y: dest.y - captor.y,
    };
    if (captor.team === captive.team) return null;
    switch (captor.type) {
        case PAWN:
            if (validMove ||
                (captor.team === B && mvmt.y > 0) ||
                (captor.team === W && mvmt.y < 0) ||
                (enPassant && !captive.justDoubleMoved)) {
                isValid = false;
                break;
            }
            isValid = (Math.abs(mvmt.x) === 1 && Math.abs(mvmt.y) === 1) || enPassant;
            break;
        case ROOK:
        case KNIGHT:
        case BISHOP:
        case QUEEN:
        case KING:
            isValid = validMove;
            break;
        default:
            isValid = false;
            break;
    }
    // DEBUG
    if (captor.type === PAWN) {
        console.debug("Capture is " + (isValid ? "valid" : "invalid"));
    }
    return (isValid ? captivePos : null);
}

/**
 * Determines whether or not the king piece or space given is in check
 *
 * @param {*} king Either the king or an object with an (x, y) coordinate
 * @param {*} pieces The game pieces object
 * @param {*} kingTeam The team of the king, used for hypothetical king positions
 * @returns The checking piece if found, null otherwise
 */
function isKingInCheck(king, pieces, kingTeam) {
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
        if (pieces.hasOwnProperty(coord)) {
            let pieceIsKing = pieces[coord].x === king.x && pieces[coord].y === king.y;
            if (pieces[coord] === null || pieceIsKing) continue;
            if (kingTeam === pieces[coord].team) continue;
            let move = isValidMove(pieces[coord], king, pieces);
            let capture = isValidCapture(move.isValid, pieces[coord], king, pieces, hypothetical);
            if (capture) return pieces[coord];
        }
    }
    return null;
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
    if (isNaN(x) || isNaN(y) || !pieces) return null;
    // Off the board
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;

    // Try to find the piece
    let key = x + "," + y;
    if (pieces.hasOwnProperty(key)) {
        return Object.assign(pieces[key], {x: x, y: y});
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
 * Moves the piece from start to end
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
    if (Math.abs(start.y - end.y) === 2 && piece.type === PAWN) {
        piece.justDoubleMoved = true;
    }
    piece.isFirstMove = false;
    pieces[end.x + "," + end.y] = piece;
    return true;
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
                    whiteKing = pieces[coord];
                } else {
                    blackKing = pieces[coord];
                }
            }
        }
    }
    return {whiteKing: whiteKing, blackKing: blackKing};
}

class Space extends React.Component {
    render() {
        if (!this.props.piece) {
            return (<td onClick={this.props.onClick}></td>);
        }
        
        var type = this.props.piece.type !== null ? PIECE_NAME_LC[this.props.piece.type] : "";
        var team = this.props.piece.team !== null ? TEAM_NAME_LC[this.props.piece.team] : "";
        var className = team;
        var coords = this.props.showCoords ? <span className="spotId">{this.props.pos}</span> : null;
        var img = null;

        if (type !== "" && team !== "") {
            img = <img src={require(`../public/images/${type}.png`)} alt={`${type}`} />;
            className += (className.length > 0 ? " " : "") + "occupied";
            className += this.props.isOnDeck ? " on-deck" : "";
        }
        
        return (
            <td className={className} onClick={this.props.onClick}>{coords}{img}</td>
        );
    }
}

class Board extends React.Component {
    constructor(props) {
        super(props);

        let pieces = regulationStartingPieces;
        let {whiteKing, blackKing} = getKings(pieces);

        this.state = {
            history: [{
                pieces: pieces,
                whiteKing: whiteKing,
                blackKing: blackKing,
                captured: [],
                whitesTurn: true,
                kingStatus: "",
            }],
            index: 0,
            pieceToMove: null,
            ignoreTurns: false,
            isReplaying: false,
            stopReplaying: false,
            showCoords: false,
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
                console.debug(clickedPiece);
            }
        } else {
            var move = isValidMove(pieceToMove, {x: x, y: y}, pieces);
            var capturedPiecePos = isValidCapture(move.isValid, pieceToMove, {x: x, y: y}, pieces);
            var successfulCapture = capturedPiecePos !== null;
            var capturedPiece = successfulCapture ? getPiece(capturedPiecePos.x, capturedPiecePos.y, pieces) : null;
            if (clickedPiece !== null && !successfulCapture && !move.isCastling) {
                this.resetTurn();
                return;
            }

            if (move.isValid || successfulCapture) {
                var newState = {
                    whitesTurn: !this.state.history[this.state.index].whitesTurn || this.state.ignoreTurns,
                    captured: this.state.history[this.state.index].captured.slice(),
                    whiteKing: JSON.parse(JSON.stringify(this.state.history[this.state.index].whiteKing)),
                    blackKing: JSON.parse(JSON.stringify(this.state.history[this.state.index].blackKing)),
                };

                if (successfulCapture) {
                    newState.captured.push(capturedPiece);
                    removePiece(capturedPiecePos.x, capturedPiecePos.y, pieces);
                }

                for (let i = 0; i < move.moves.length; i++) {
                    if (move.moves[i].piece.type === KING) {
                        if (move.moves[i].piece.team === WHITE) {
                            newState.whiteKing = JSON.parse(JSON.stringify(move.moves[i].piece));
                        } else {
                            newState.blackKing = JSON.parse(JSON.stringify(move.moves[i].piece));
                        }
                    }
                    movePiece(move.moves[i].start, move.moves[i].end, pieces);
                }
    
                newState.pieces = pieces;

                var history = this.state.history.slice();
                history.push(newState);
                this.setState({
                    history: history,
                    index: this.state.index + 1,
                }, () => {
                    // Check whether or not the king is in check
                    let history = this.state.history.slice();
                    let pieces = JSON.parse(JSON.stringify(history[this.state.index].pieces));

                    let whiteKing = history[this.state.index].whiteKing;
                    let blackKing = history[this.state.index].blackKing;

                    let whiteKingAttacker = whiteKing ? isKingInCheck(whiteKing, pieces) : null;
                    let blackKingAttacker = blackKing ? isKingInCheck(blackKing, pieces) : null;

                    if (whiteKingAttacker) {
                        history[this.state.index].kingStatus = "White king in check!";
                        console.debug("Piece putting white king in check:");
                        console.debug(whiteKingAttacker)
                    } else if (blackKingAttacker) {
                        history[this.state.index].kingStatus = "Black king in check!";
                        console.debug("Piece putting black king in check:");
                        console.debug(blackKingAttacker)
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

        return (
            <div>
                <p className="status-bar">
                    <span className="whos-turn">{this.state.history[this.state.index].whitesTurn ? "White's" : "Black's"} Turn</span>
                    <span className="king-status">{this.state.history[this.state.index].kingStatus}</span>
                </p>
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
                                            x={x}
                                            y={y}
                                            isOnDeck={this.state.pieceToMove !== null && (this.state.pieceToMove.x === x && this.state.pieceToMove.y === y)}
                                            onClick={() => this.handleClick(x, y)}
                                            />
                                    );
                                })}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                {/*<div class="pieceTray">
                    {this.state.history[this.state.index].captured.map((piece, index) => {
                        let type = piece.type;
                        return (
                            <img src={require(`../public/images/${type}.png`)} />
                        );
                    })}
                </div>*/}
                <div>{replay}</div>
                <h3 className="subtitle">Captured Pieces</h3>
                <ul id="capturedPieces">
                    {this.state.history[this.state.index].captured.map((piece, index) => {
                        return (
                            <li key={index}>{TEAM_NAME[piece.team]} {PIECE_NAME[piece.type]}</li>
                        );
                    })}
                </ul>
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
