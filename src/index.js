import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

/* INTERNAL TODO
 * - Replace board representation with an array of only pieces and positions
 *      Pros: Easier to iterate through pieces
 *      Cons: Potentially more difficult to check if a space is occupied
 * - Enforce check rules
 *      - Determine why castling check check is not working
 * - Add dialog for promotion
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
    "0,7": new Pc(R, B), "1,7": new Pc(KN, B), "2,7": new Pc(BI, B), "3,7": new Pc(Q, B),
    "4,7": new Pc(KI, B), "5,7": new Pc(BI, B), "6,7": new Pc(KN, B), "7,7": new Pc(R, B),
};

var castlingTestingPieces = {
    "0,0": new Pc(R, W), "3,0": new Pc(KI, W), "5,0": new Pc(BI, W), "7,0": new Pc(R, W),
    "2,1": new Pc(P, W),
    "0,2": new Pc(BI, W),
    "7,5": new Pc(BI, B),
    "5,6": new Pc(P, B),
    "0,7": new Pc(R, B), "2,7": new Pc(BI, B), "4,7": new Pc(KI, B), "7,7": new Pc(R, B)
};

/**
 * Determines whether the attempted move is valid
 *
 * @param {*} piece The start piece, with x and y specified as properties
 * @param {*} dest The end position of the move, with x and y specified as properties
 * @param {*} board The array of piece positions on the board
 * @returns
 */
function isValidMove(piece, dest, pieces) {
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
            function boolog(msg) { console.log(msg); return true; }
            // Check to make sure all spaces between here and the destination are clear
            for (let l = rookMoveFunc(piece.x, piece.y); boolog(l.x !== dest.x && l.y !== dest.y) && l.x !== dest.x && l.y !== dest.y; l = rookMoveFunc(l.x, l.y)) {
                console.log("Test");
                if (getPiece(l.x, l.y, pieces) !== null) {
                    isValid = false;
                    console.log("Ain't valid");
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
            for (let l = queenMoveFunc(piece.x, piece.y); l.x !== dest.x && l.y !== dest.y; l = queenMoveFunc(l.x, l.y)) {
                if (getPiece(l.x, l.y, pieces) !== null) {
                    isValid = false;
                    break;
                }
            }
            break;
        /*case KING:
            // If the place the king is moving to is in check, don't allow it
            var absMvmt = Math.abs(mvmt);
            var rowEnd = rowStart + 7;
            isValid = absMvmt === 1 || absMvmt === 7 || absMvmt === 8 || absMvmt === 9;
            if (absMvmt === 2 && piece.isFirstMove) {
                // Attempted castling
                var rookPosition = null;
                if (dir > 0 && board[rowStart] !== null && board[rowStart].type === ROOK) {
                    rookPosition = rowStart;
                } else if (dir < 0 && board[rowEnd] !== null && board[rowEnd].type === ROOK) {
                    rookPosition = rowEnd;
                }
                if (rookPosition !== null && board[rookPosition].isFirstMove) {
                    isCastling = true;
                    for (let i = rookPosition + dir; i !== start; i += dir) {
                        if (board[i] !== null) {
                            isCastling = false;
                            break;
                        }
                    }
                    // Check if king is in check -- saving most complex calculation for last
                    isCastling = !isKingInCheckWholeBoard(start, board) &&
                        !isKingInCheckWholeBoard(start - dir, board, piece.team);
                }
                if (isCastling) {
                    isValid = true;
                    moves.push({
                        piece: board[rookPosition],
                        start: rookPosition,
                        end: start - dir
                    });
                }
            }
            isValid = isValid && !isKingInCheckWholeBoard(end, board, piece.team);
            break;*/
        default:
            isValid = false;
            break;
    }
    return {isValid: isValid, moves: moves, isCastling: isCastling};
}

function isKingInCheckWholeBoard(kingPosition, board, kingTeam) {
    var king = board[kingPosition];
    if (kingTeam === undefined) {
        kingTeam = king !== null ? king.team : null;
    }
    for (let i = 0; i < board.length; i++) {
        if (board[i] === null || i === kingPosition) continue;
        let kingExists_isOnTeam =
            king !== null && board[i].team === king.team;
        let kingHypothetical_isOnTeam =
            kingTeam !== null && board[i].team === kingTeam;
        if (kingExists_isOnTeam || kingHypothetical_isOnTeam) {
            continue;
        }
        let move = isValidMove(i, kingPosition, board);
        let capture = isValidCapture(move.isValid, i, kingPosition, board, king === null);
        if (capture) return {location: i, piece: board[i]};
    }
}

function isKingInCheckSpecificPieces(kingPosition, pieces, board) {
    var king = board[kingPosition];
    for (let i = 0; i < pieces.length; i++) {
        let move = isValidMove(pieces[i].location, kingPosition, board);
        if (isValidCapture(move.isValid, pieces[i].location, kingPosition, board, king === null)) {
            return pieces[i];
        }
    }
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
    return (isValid ? captivePos : null);
}

function getPiece(x, y, pieces) {
    if (isNaN(x) || isNaN(y) || !pieces) return null;
    let key = x + "," + y;
    if (pieces.hasOwnProperty(key)) {
        return Object.assign(pieces[key], {x: x, y: y});
    }
    return null;
}

function removePiece(x, y, pieces) {
    if (isNaN(x) || isNaN(y) || !pieces) return;
    let key = x + "," + y;
    let piece = pieces[key];
    delete pieces[key];
    return piece;
}

function movePiece(start, end, pieces) {
    if (getPiece(end.x, end.y, pieces)) {
        console.error("Tried moving a piece to an occupied space!");
        return;
    }
    let piece = removePiece(start.x, start.y, pieces);
    if (Math.abs(start.y - end.y) === 2 && piece.type === PAWN) {
        piece.justDoubleMoved = true;
    }
    piece.isFirstMove = false;
    pieces[end.x + "," + end.y] = piece;
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
        this.state = {
            history: [{
                pieces: regulationStartingPieces,
                captured: [],
                whitesTurn: true,
                kingStatus: "",
            }],
            index: 0,
            pieceToMove: null,
            ignoreTurns: false,
            isReplaying: false,
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
                };

                if (successfulCapture) {
                    newState.captured.push(capturedPiece);
                    removePiece(capturedPiecePos.x, capturedPiecePos.y, pieces);
                }

                for (let i = 0; i < move.moves.length; i++) {
                    movePiece(move.moves[i].start, move.moves[i].end, pieces);
                }
/*
                // Prepare pieces for check check
                let whitePieces = [];
                let whiteKing = null;
                let blackPieces = [];
                let blackKing = null;
                for (let i = 0; i < board.length; i++) {
                    if (board[i] === null) continue;
                    if (board[i].team === WHITE) {
                        if (board[i].type === KING) {
                            whiteKing = {location: i, piece: board[i]};
                        } else {
                            whitePieces.push({location: i, piece: board[i]});
                        }
                    } else {
                        if (board[i].type === KING) {
                            blackKing = {location: i, piece: board[i]};
                        } else {
                            blackPieces.push({location: i, piece: board[i]});
                        }
                    }
                }

                var whiteKingAttacker = whiteKing ? isKingInCheckSpecificPieces(whiteKing.location, blackPieces, board) : null;
                var blackKingAttacker = blackKing ? isKingInCheckSpecificPieces(blackKing.location, whitePieces, board) : null;
                if (whiteKingAttacker) {
                    console.log(whiteKingAttacker);
                    newState.kingStatus = "White king in check!";
                }
                if (blackKingAttacker) {
                    console.log(blackKingAttacker);
                    newState.kingStatus = "Black king in check!";
                }
    */
                newState.pieces = pieces;

                var history = this.state.history.slice();
                history.push(newState);
                this.setState({
                    history: history,
                    index: this.state.index + 1,
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
                if (this.state.isReplaying) return;

                this.setState({isReplaying: true});
                var i = 0;
                var intervalId = setInterval(() => {
                    this.jumpTo(i);
                    i++;
                    if (i >= this.state.history.length) {
                        this.setState({isReplaying: false});
                        clearInterval(intervalId);
                    }
                }, 500);
            }}>
                {this.state.isReplaying ? "Replaying..." : "Instant Replay"}
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
