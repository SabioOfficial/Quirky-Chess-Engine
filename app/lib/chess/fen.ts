import { getOpponent, getPieceAt, getPieceColor, getPieceType, isKingInCheck, makePiece } from "./rules";
import { type Square, type Board, type CastlingRights, type CastlingSide, type GameState, type PieceColor, type PieceType, type Position } from "./types";

export const STANDARD_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const COLORS: PieceColor[] = ["w", "b"];
const SIDES: CastlingSide[] = ["kingside", "queenside"];
const COLOR_NAMES: Record<PieceColor, string> = { w: "White", b: "Black" };
const TYPE_BY_LETTER: Record<string, PieceType> = { p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King" };
const LETTER_BY_TYPE: Record<PieceType, string> = { Pawn: "p", Knight: "n", Bishop: "b", Rook: "r", Queen: "q", King: "k" };
const CASTLING_LETTERS: Record<PieceColor, Record<CastlingSide, string>> = {
  w: { kingside: "K", queenside: "Q" },
  b: { kingside: "k", queenside: "q" },
};

const flipIndex = (index: number) => 7 - index;

export type FenPosition = Pick<GameState, "board" | "currentTurn" | "castlingRights"> & Partial<Pick<GameState, "doubleSteppedPawn">>;

export type FenResult = {
  state: GameState;
  error?: undefined
} | {
  state?: undefined;
  error: string
};

const createCastlingRights = (value: boolean): CastlingRights => ({
  w: { kingside: value, queenside: value },
  b: { kingside: value, queenside: value },
});

export const getAvailableCastlingRights = (board: Board): CastlingRights => {
  const rights = createCastlingRights(false);

  for (const color of COLORS) {
    const homeRow = { w: 0, b: 7 }[color];
    const isKingHome = getPieceAt(board, { row: homeRow, col: 3 }) === makePiece(color, "King");

    for (const side of SIDES) {
      const isRookHome = getPieceAt(board, { row: homeRow, col: { kingside: 0, queenside: 7 }[side] }) === makePiece(color, "Rook");
      rights[color][side] = isKingHome && isRookHome;
    }
  }
  return rights;
};

export const validatePosition = ({ board, currentTurn }: Pick<GameState, "board" | "currentTurn">): string | null => {
  const kingCounts: Record<PieceColor, number> = { w: 0, b: 0 };
  let hasPawnOnEdge = false;

  board.forEach((boardRow, row) => {
    boardRow.forEach((piece) => {
      if (!piece) return;
      if (getPieceType(piece) === "King") kingCounts[getPieceColor(piece)]++;
      if (getPieceType(piece) === "Pawn" && (row === 0 || row === 7)) hasPawnOnEdge = true;
    });
  });

  if (kingCounts.w !== 1 || kingCounts.b !== 1) return "Each side needs exactly one king.";
  if (hasPawnOnEdge) return "Pawns can't stand on the first or last rank.";

  const waitingColor = getOpponent(currentTurn);
  if (isKingInCheck(board, waitingColor)) {
    return `${COLOR_NAMES[waitingColor]}'s king is in check, but it's ${COLOR_NAMES[currentTurn]}'s turn.`;
  }
  return null;
};

const parseCastlingField = (field: string): CastlingRights | null => {
  if (field === "-") return createCastlingRights(false);

  const rights = createCastlingRights(false);
  for (const letter of field) {
    const match = COLORS.flatMap((color) => SIDES.map((side) => ({ color, side }))).find(({ color, side }) => CASTLING_LETTERS[color][side] === letter);
    if (!match) return null;
    rights[match.color][match.side] = true;
  }
  return rights;
}

export const parseFen = (fen: string): FenResult => {
  const [placement, turnField = "w", castlingField, enPassantField = "-"] = fen.trim().split(/\s+/);
  if (!placement) return { error: "Enter a FEN string." };

  const ranks = placement.split("/");
  if (ranks.length !== 8) return { error: `Expected 8 ranks seperated by "/", found ${ranks.length}.` };

  const board: Board = Array.from({ length: 8 }, () => Array<Square>(8).fill(null));

  for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
    const rankNumber = 8 - rankIndex;
    let fileIndex = 0;

    for (const char of ranks[rankIndex]) {
      if (/[1-8]/.test(char)) {
        fileIndex += Number(char);
        continue;
      }

      const type = TYPE_BY_LETTER[char.toLowerCase()];
      if (!type) return { error: `Unknown piece "${char}" in rank ${rankNumber}.` };
      if (fileIndex >= 8) return { error: `Rank ${rankNumber} has more than 8 squares.` };

      board[flipIndex(rankIndex)][flipIndex(fileIndex)] = makePiece(char === char.toUpperCase() ? "w" : "b", type);
      fileIndex++;
    }

    if (fileIndex !== 8) return { error: `Rank ${rankNumber} doesn't add up to 8 squares.` };
  }

  if (turnField !== "w" && turnField !== "b") return { error: "Side to move must be 'w' or 'b'." };
  const currentTurn: PieceColor = turnField;

  const availableRights = getAvailableCastlingRights(board);
  const requestedRights = castlingField === undefined ? availableRights : parseCastlingField(castlingField);
  if (!requestedRights) return { error: "Invalid castling rights." };

  const castlingRights = createCastlingRights(false);
  for (const color of COLORS) {
    for (const side of SIDES) castlingRights[color][side] = requestedRights[color][side] && availableRights[color][side];
  }

  let doubleSteppedPawn: Position | null = null;
  if (enPassantField !== "-") {
    const match = /^([a-h])([36])$/.exec(enPassantField);
    if (!match) return { error: "Invalid en passant square." };

    const isWhitePawn = match[2] === "3";
    const pawnPosition = { row: isWhitePawn ? 3 : 4, col: flipIndex("abcdefgh".indexOf(match[1])) };
    const isCorrectTurn = currentTurn === (isWhitePawn ? "b" : "w");

    if (!isCorrectTurn || getPieceAt(board, pawnPosition) !== makePiece(isWhitePawn ? "w" : "b", "Pawn")) {
      return { error: "The en passant square doesn't match a pawn that just moved two squares." };
    }
    doubleSteppedPawn = pawnPosition;
  }

  const validationError = validatePosition({ board, currentTurn });
  if (validationError) return { error: validationError };

  return {
    state: {
      board, currentTurn, castlingRights, doubleSteppedPawn, pendingPromotion: null, moveHistory: []
    }
  }
}

export const toFen = ({ board, currentTurn, castlingRights, doubleSteppedPawn = null }: FenPosition): string => {
  const placement = Array.from({ length: 8 }, (_, rankIndex) => {
    let rank = "";
    let emptyCount = 0;

    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const piece = board[flipIndex(rankIndex)][flipIndex(fileIndex)];
      if (!piece) {
        emptyCount++;
        continue;
      }

      if (emptyCount > 0) rank += emptyCount;
      emptyCount = 0;

      const letter = LETTER_BY_TYPE[getPieceType(piece)];
      rank += getPieceColor(piece) === "w" ? letter.toUpperCase() : letter;
    }

    return emptyCount > 0 ? rank + emptyCount : rank;
  }).join("/");

  const availableRights = getAvailableCastlingRights(board);
  const castling = COLORS.flatMap((color) => SIDES.filter((side) => castlingRights[color][side] && availableRights[color][side]).map((side) => CASTLING_LETTERS[color][side])).join("");

  const pawn = doubleSteppedPawn ? getPieceAt(board, doubleSteppedPawn) : null;
  const enPassant = doubleSteppedPawn && pawn && getPieceType(pawn) === "Pawn" ? `${"abcdefgh"[flipIndex(doubleSteppedPawn.col)]}${getPieceColor(pawn) === "w" ? 3 : 6}` : "-";

  return `${placement} ${currentTurn} ${castling || "-"} ${enPassant} 0 1`;
}
