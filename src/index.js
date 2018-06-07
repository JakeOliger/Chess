import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

/* INTERNAL TODO
 * - Replace board representation with an array of only pieces and positions
 *      Pros: Easier to iterate through pieces
 *      Cons: Potentially more difficult to check if a space is occupied
 * - Add isKingInCheck(king, board) method
 * 
 * 
 */

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

/**
 * Determines whether the attempted move is valid
 *
 * @param {*} start The start position of the move, also used to determine moving piece
 * @param {*} end The end position of the move
 * @param {*} board The array of piece positions on the board
 * @returns
 */
function isValidMove(start, end, board) {
    var isValid = false;
    var mvmt = start - end;
    var piece = board[start];
    var dir = mvmt > 0 ? 1 : -1;
    var rowStart = start - start % 8;
    var moves = [{
        piece: piece,
        start: start,
        end: end
    }];
    var isCastling = false;
    switch (piece.type) {
        case PAWN:
            var maxMvmt = 8 * (piece.team === B ? 1 : -1);
            isValid = mvmt % 8 === 0 && (piece.team === B ? mvmt > 0 : mvmt < 0);
            if (isValid) {
                if (piece.isFirstMove) {
                    isValid = board[start - maxMvmt] === null;
                    maxMvmt *= 2;
                    piece.justDoubleMoved = true;
                } else {
                    piece.justDoubleMoved = false;
                }
                isValid = isValid && (piece.team === B ? mvmt <= maxMvmt : mvmt >= maxMvmt);
            }
            break;
        case ROOK:
            // Determine if the requested move matches a movement function for this piece
            var rookMoveFunc;
            if (mvmt % 8 === 0) {
                rookMoveFunc = (i) => i + 8 * dir;
            } else if (rowStart <= end && rowStart + 7 >= end) {
                rookMoveFunc = (i) => i + dir;
            } else {
                isValid = false;
                break;
            }
            isValid = true;
            // Check to make sure all spaces between here and the destination are clear
            for (var i = rookMoveFunc(0); dir > 0 ? i < mvmt : i > mvmt; i = rookMoveFunc(i)) {
                if (board[start - i] !== null) {
                    isValid = false;
                    break;
                }
            }
            break;
        case KNIGHT:
            mvmt = Math.abs(mvmt);
            isValid = mvmt === 17 || mvmt === 15 || mvmt === 6 || mvmt === 10;
            break;
        case BISHOP:
            // Determine if the requested move matches a movement function for this piece
            var bishopMoveFunc;
            if (mvmt % 7 === 0) {
                bishopMoveFunc = (i) => i + 7 * dir;
            } else if (mvmt % 9 === 0) {
                bishopMoveFunc = (i) => i + 9 * dir;
            } else {
                isValid = false;
                break;
            }
            isValid = true;
            // Check to make sure all spaces between here and the destination are clear
            for (var i = bishopMoveFunc(0); dir > 0 ? i < mvmt : i > mvmt; i = bishopMoveFunc(i)) {
                if (board[start - i] !== null) {
                    isValid = false;
                    break;
                }
            }
            break;
        case QUEEN:
            // Determine if the requested move matches a movement function for this piece
            var queenMoveFunc;
            if (mvmt % 7 === 0) {
                queenMoveFunc = (i) => i + 7 * dir;
            } else if (mvmt % 9 === 0) {
                queenMoveFunc = (i) => i + 9 * dir;
            } else if (mvmt % 8 === 0) {
                queenMoveFunc = (i) => i + 8 * dir;
            } else if (rowStart <= end && rowStart + 7 >= end) {
                queenMoveFunc = (i) => i + dir;
            } else {
                isValid = false;
                break;
            }
            isValid = true;
            // Check to make sure all spaces between here and the destination are clear
            for (var i = queenMoveFunc(0); dir > 0 ? i < mvmt : i > mvmt; i = queenMoveFunc(i)) {
                if (board[start - i] !== null) {
                    isValid = false;
                    break;
                }
            }
            break;
        case KING:
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
                    for (var i = rookPosition + dir; i !== start; i += dir) {
                        if (board[i] !== null) {
                            isCastling = false;
                            break;
                        }
                    }
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
            break;
        default:
            isValid = false;
            break;
    }
    if (isValid) piece.isFirstMove = false;
    return {isValid: isValid, moves: moves, isCastling: isCastling};
}

/**
 * Determines whether a given move results in a valid vapture
 *
 * @param {*} validMove Whether the move is valid
 * @param {*} start The starting position of the move
 * @param {*} end The end position of the move
 * @param {*} board The array of pieces on the board
 * @returns The captured piece, if there is one
 */
function isValidCapture(validMove, start, end, board) {
    var captor = board[start];
    var captive = null;
    var captivePos = end;
    if (captor.type === PAWN && board[end] === null) {
        // En passant capturing detection
        captivePos += (captor.team === WHITE ? -8 : 8);
    }
    captive = board[captivePos];
    if (captor === null || captive === null) return null;
    var isValid = false;
    var mvmt = start - end;
    if (captor.team === captive.team) return null;

    switch (captor.type) {
        case PAWN:
            if (validMove ||
                (captor.team === B && mvmt < 0) ||
                (captor.team === W && mvmt > 0) ||
                (captivePos !== end && !captive.justDoubleMoved)) {
                isValid = false;
                break;
            }
            mvmt = Math.abs(mvmt);
            isValid = mvmt === 7 || mvmt === 9;
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

class Pc {
    constructor(type, team) {
        this.type = type;
        this.team = team;
        this.isFirstMove = true;
        this.justDoubleMoved = false;
    }
}

class Space extends React.Component {
    render() {
        if (this.props.piece === null) {
            return (<td onClick={this.props.onClick}></td>);
        }
        
        var type = this.props.piece.type !== null ? PIECE_NAME[this.props.piece.type] : "";
        var team = this.props.piece.team !== null ? TEAM_NAME_LC[this.props.piece.team] : "";
        var className = team;
        var img = null;

        if (type !== "" && team !== "") {
            img = <img src={require(`../public/images/${type}.svg`)} alt={`${type}`} />;
            className += (className.length > 0 ? " " : "") + "occupied";
            className += this.props.isOnDeck ? " on-deck" : "";
        }
        
        return (
            <td className={className} onClick={this.props.onClick}>{img}</td>
        );
    }
}

class Board extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            /*spaces: [
                new Pc(R, W), new Pc(KN, W), new Pc(BI, W), new Pc(KI, W), new Pc(Q, W), new Pc(BI, W), new Pc(KN, W), new Pc(R, W),
                new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W),
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B),
                new Pc(R, B), new Pc(KN, B), new Pc(BI, B), new Pc(Q, B), new Pc(KI, B), new Pc(BI, B), new Pc(KN, B), new Pc(R, B),
            ],*/
            spaces: [
                new Pc(R, W), null, null, new Pc(KI, W), null, null, null, new Pc(R, W),
                new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W),
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B),
                new Pc(R, B), new Pc(KN, B), null, null, new Pc(KI, B), new Pc(KN, B), null, new Pc(R, B),
            ],
            captured: [],
            desiredStart: null,
            whitesTurn: true,
            ignoreTurns: false,
        };
    }

    cancelTurn() {
        this.setState({desiredStart: null});
    }

    handleClick(i) {
        var spaces = this.state.spaces.slice();
        var mover = spaces[this.state.desiredStart];
        var moverSpace = this.state.desiredStart;
        if (moverSpace === null) {
            if (spaces[i] !== null && spaces[i].team === (this.state.whitesTurn ? WHITE : BLACK)) {
                this.setState({
                    desiredStart: i,
                });
            }
        } else {
            var move = isValidMove(moverSpace, i, spaces);
            var capturedPiecePos = isValidCapture(move.isValid, moverSpace, i, spaces);
            var successfulCapture = capturedPiecePos !== null;

            console.log(move);

            if (spaces[i] !== null && !successfulCapture && !move.isCastling) {
                this.cancelTurn();
                return;
            }

            if (move.isValid || successfulCapture) {
                var newState = {whitesTurn: !this.state.whitesTurn || this.state.ignoreTurns};
                if (successfulCapture) {
                    var captured = this.state.captured.slice();
                    captured.push(spaces[capturedPiecePos]);
                    newState.captured = captured;
                    spaces[capturedPiecePos] = null;
                }

                for (var i = 0; i < move.moves.length; i++) {
                    var m = move.moves[i];
                    console.log(m);
                    spaces[m.end] = m.piece;
                    spaces[m.start] = null;
                }
    
                newState.spaces = spaces;
                newState.desiredStart = null;
                this.setState(newState);
            } else {
                this.cancelTurn();
            }
        }
    }

    render() {
        return (
            <div>
                <p className="whos-turn">{this.state.whitesTurn ? "White's" : "Black's"} Turn</p>
                <table>
                    <tbody>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((x, i) => {
                        return (
                            <tr key={i}>
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((y, j) => {
                                    return (
                                        <Space
                                            key={i * 8 + j}
                                            piece={this.state.spaces[i * 8 + j]}
                                            id={i * 8 + j}
                                            isOnDeck={(i * 8 + j) === this.state.desiredStart}
                                            onClick={() => this.handleClick(i * 8 + j)}
                                            />
                                    );
                                })}
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
                <h3 className="subtitle">Captured Pieces</h3>
                <ul id="capturedPieces">
                    {this.state.captured.map((piece, index) => {
                        return (
                            <li>{TEAM_NAME[piece.team]} {PIECE_NAME[piece.type]}</li>
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
                <div className="icon-credit">Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Chess Pack Author">Freepik</a>.</div>
                <Board />
            </div>
        );
    }

}

// ========================================

ReactDOM.render(
    <ChessGame />,
    document.getElementById('root')
);
