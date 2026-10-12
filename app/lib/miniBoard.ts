export type PieceCode = "bPawn" | "bBishop" | "wQueen";
export type Square = PieceCode | null;
export type Board = Square[][];
export type Position = {
  row: number;
  col: number;
};

export const INITIAL_BOARD: Board = [
  [null, "bPawn", "bBishop"],
  [null, "wQueen", null],
];

export const getPieceColor = (piece: PieceCode) => piece[0] as "w" | "b";

const isStraightMoveValid = (from: Position, to: Position, board: Board) => {
  if (from.row !== to.row && from.col !== to.col) return false;

  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row !== to.row || col !== to.col) {
    if (board[row]?.[col]) return false;
    row += rowStep;
    col += colStep;
  }
  return true;
};

const isDiagonalMoveValid = (from: Position, to: Position, board: Board) => {
  if (Math.abs(from.row - to.row) !== Math.abs(from.col - to.col)) return false;

  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row !== to.row || col !== to.col) {
    if (board[row]?.[col]) return false;
    row += rowStep;
    col += colStep;
  }
  return true;
};

const isQueenMoveValid = (from: Position, to: Position, board: Board) => isStraightMoveValid(from, to, board) || isDiagonalMoveValid(from, to, board);

export const isMoveValid = (piece: PieceCode, from: Position, to: Position, board: Board) => {
  if (from.row === to.row && from.col === to.col) return false;
  if (to.row < 0 || to.row >= board.length) return false;
  if (to.col < 0 || to.col >= board[0].length) return false;

  const target = board[to.row][to.col];
  if (target && getPieceColor(target) === getPieceColor(piece)) return false;

  return isQueenMoveValid(from, to, board);
};
