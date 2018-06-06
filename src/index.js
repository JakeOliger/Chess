import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

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

function isValidMove(start, end, board) {
    var isValid = false;
    var mvmt = start - end;
    var piece = board[start];
    switch (piece.type) {
        case PAWN:
            var maxMvmt = 8 * (piece.team === B ? 1 : -1);
            isValid = mvmt % 8 === 0 && (piece.team === B ? mvmt > 0 : mvmt < 0);
            if (isValid && piece.isFirstMove) {
                isValid = isValid && board[start - maxMvmt] === null;
                maxMvmt *= 2;
            }
            isValid = isValid && (piece.team === B ? mvmt <= maxMvmt : mvmt >= maxMvmt);
            break;
        case ROOK:
            var rowStart = start - start % 8;
            var dir = mvmt > 0 ? 1 : -1;
            // Determine if the requested move matches a movement function for this piece
            var rookMoveFunc;
            if (mvmt % 8 === 0) {
                rookMoveFunc = (i) => i + 8 * dir;
            } else if (rowStart < end && rowStart + 8 > end) {
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
            var dir = mvmt > 0 ? 1 : -1;
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
            var rowStart = start - start % 8;
            var dir = mvmt > 0 ? 1 : -1;
            // Determine if the requested move matches a movement function for this piece
            var queenMoveFunc;
            if (mvmt % 7 === 0) {
                queenMoveFunc = (i) => i + 7 * dir;
            } else if (mvmt % 9 === 0) {
                queenMoveFunc = (i) => i + 9 * dir;
            } else if (mvmt % 8 === 0) {
                queenMoveFunc = (i) => i + 8 * dir;
            } else if (rowStart < end && rowStart + 8 > end) {
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
            mvmt = Math.abs(mvmt);
            isValid = mvmt === 1 || mvmt === 7 || mvmt === 8 || mvmt === 9;
            break;
        default:
            isValid = false;
            break;
    }
    if (isValid) piece.isFirstMove = false;
    return isValid;
}

function isValidCapture(validMove, start, end, board) {
    var captor = board[start];
    var captive = board[end];
    if (captor === null || captive === null) return false;
    var isValid = false;
    var mvmt = start - end;
    if (captor.team === captive.team) return false;

    switch (captor.type) {
        case PAWN:
            if (validMove || (captor.team === B && mvmt < 0) || (captor.team === W && mvmt > 0)) {
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
    return isValid;
}

class Pc {
    constructor(type, team) {
        this.type = type;
        this.team = team;
        this.isFirstMove = true;
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
            spaces: [
                new Pc(R, W), new Pc(KN, W), new Pc(BI, W), new Pc(KI, W), new Pc(Q, W), new Pc(BI, W), new Pc(KN, W), new Pc(R, W),
                new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W), new Pc(P, W),
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B), new Pc(P, B),
                new Pc(R, B), new Pc(KN, B), new Pc(BI, B), new Pc(Q, B), new Pc(KI, B), new Pc(BI, B), new Pc(KN, B), new Pc(R, B),
            ],
            captured: [],
            desiredStart: null,
            whitesTurn: true,
        };
    }

    handleClick(i) {
        var spaces = this.state.spaces.slice();
        if (this.state.desiredStart === null) {
            if (spaces[i] !== null && spaces[i].team === (this.state.whitesTurn ? WHITE : BLACK)) {
                this.setState({
                    desiredStart: i,
                });
            }
        } else {
            var validMove = isValidMove(this.state.desiredStart, i, spaces);
            var validCapture = isValidCapture(validMove, this.state.desiredStart, i, spaces);
            var attemptedCapture = spaces[i] !== null;
            
            if (attemptedCapture && !validCapture) {
                return;
            }

            if (validMove || validCapture) {
                var newState = {whitesTurn: !this.state.whitesTurn};
                if (spaces[i] !== null) {
                    var captured = this.state.captured.slice();
                    captured.push(spaces[i]);
                    newState.captured = captured;
                }
                spaces[i] = spaces[this.state.desiredStart];
                spaces[this.state.desiredStart] = null;
    
                newState.spaces = spaces;
                newState.desiredStart = null;
                this.setState(newState);
            } else {
                this.setState({desiredStart: null});
            }
        }
    }

    render() {
        return (
            <div>
                <p class="whos-turn">{this.state.whitesTurn ? "White's" : "Black's"} Turn</p>
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
                <h3 class="subtitle">Captured Pieces</h3>
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
