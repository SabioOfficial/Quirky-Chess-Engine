import { STANDARD_FEN } from "./fen";

export interface StartingPosition {
  id: string;
  name: string;
  fen: string;
}

export const PRESET_POSITIONS: StartingPosition[] = [
  { id: "standard", name: "Standard", fen: STANDARD_FEN },
  { id: "il-vaticano", name: "Il Vaticano setup", fen: "4k3/8/8/8/2BppB2/8/8/4K3 w - - 0 1" },
  { id: "castling", name: "Castling setup", fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1" },
  { id: "en-passant", name: "En passant setup", fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1" },
  { id: "promotion-race", name: "Promotion setup", fen: "8/P6k/8/8/8/8/p6K/8 w - - 0 1" },
]
