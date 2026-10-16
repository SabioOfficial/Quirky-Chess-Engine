export type PieceColor = "w" | "b";
export type PieceType = "Pawn" | "Knight" | "Bishop" | "Rook" | "Queen" | "King";

export type Piece = `${PieceColor}${PieceType}`;
export type Square = Piece | null;
export type Board = Square[][];

export interface Position {
  row: number;
  col: number;
}

export type MoveKind = "normal" | "castling" | "enPassant" | "ilVaticano";

export interface Move {
  from: Position;
  to: Position;
  kind: MoveKind;
}

export type CastlingSide = "kingside" | "queenside";
export type CastlingRights = Record<PieceColor, Record<CastlingSide, boolean>>;

export interface PendingPromotion {
  position: Position;
  color: PieceColor;
  notation: string;
}

export interface GameState {
  board: Board;
  currentTurn: PieceColor;
  castlingRights: CastlingRights;
  doubleSteppedPawn: Position | null;
  pendingPromotion: PendingPromotion | null;
  moveHistory: string[];
}

export interface RuleToggles {
  castling: boolean;
  enPassant: boolean;
  pawnPromotion: boolean;
  ilVaticano: boolean;
}

export type GameStatus = "playing" | "check" | "checkmate" | "stalemate";
