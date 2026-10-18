import { type Square, type Board, type CastlingRights, type CastlingSide, type PieceColor, type Position } from "~/lib/chess/types";
import type { Route } from "./+types/editor";
import { getAvailableCastlingRights, parseFen, STANDARD_FEN, toFen } from "~/lib/chess/fen";
import { createInitialGameState } from "~/lib/chess/rules";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { type EditorTool, PiecePalette } from "~/components/chess/PiecePalette";
import { ArrowLeft, Copy, Pencil } from "lucide-react";
import { classNames } from "~/lib/classNames";
import { ChessBoard } from "~/components/chess/ChessBoard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Position Editor // Quirky Chess Engine" },
    { name: "description", content: "An intuitive editor to create custom starting positions for Quirky Chess Engine." }
  ];
}

interface EditorPosition {
  board: Board;
  currentTurn: PieceColor;
  castlingRights: CastlingRights;
  doubleSteppedPawn: Position | null;
}

const COLOR_NAMES: Record<PieceColor, string> = { w: "White", b: "Black" };
const SIDE_LABELS: Record<CastlingSide, string> = { kingside: "O-O", queenside: "O-O-O" };
const SIDES: CastlingSide[] = ["kingside", "queenside"];

const createEmptyBoard = (): Board => Array.from({ length: 8 }, () => Array<Square>(8).fill(null));

const createNoCastlingRights = (): CastlingRights => ({
  w: { kingside: false, queenside: false },
  b: { kingside: false, queenside: false },
});

const toEditorPosition = (fen: string | null): EditorPosition => {
  const state = (fen ? parseFen(fen).state : undefined) ?? createInitialGameState();
  return { board: state.board, currentTurn: state.currentTurn, castlingRights: state.castlingRights, doubleSteppedPawn: state.doubleSteppedPawn };
}

export default function Editor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [position, setPosition] = useState<EditorPosition>(() => toEditorPosition(searchParams.get("fen")));
  const [tool, setTool] = useState<EditorTool>("wPawn");

  const fen = toFen(position);
  const validationError = parseFen(fen).error ?? null;
  const availableRights = getAvailableCastlingRights(position.board);

  const [fenInput, setFenInput] = useState(fen);
  const [fenError, setFenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFenInput(fen);
    setFenError(null);
  }, [fen]);

  const handleSquareClick = ({ row, col }: Position) => {
    setPosition((current) => {
      const board = current.board.map((boardRow) => [...boardRow]);
      board[row][col] = tool === "erase" || board[row][col] === tool ? null : tool;
      return { ...current, board };
    });
  }

  const isRightChecked = (color: PieceColor, side: CastlingSide) => position.castlingRights[color][side] && availableRights[color][side];

  const toggleCastlingRight = (color: PieceColor, side: CastlingSide) => {
    const nextValue = !isRightChecked(color, side);
    setPosition((current) => ({
      ...current,
      castlingRights: { ...current.castlingRights, [color]: { ...current.castlingRights[color], [side]: nextValue } },
    }));
  }

  const loadFen = () => {
    const result = parseFen(fenInput);
    if (!result.state) {
      setFenError(result.error);
      return;
    }

    setFenError(null);
    setPosition({ board: result.state.board, currentTurn: result.state.currentTurn, castlingRights: result.state.castlingRights, doubleSteppedPawn: result.state.doubleSteppedPawn });
  }

  const copyFen = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFenError("Couldn't copy to clipboard.")
    }
  }

  const clearBoard = () => setPosition({ board: createEmptyBoard(), currentTurn: "w", castlingRights: createNoCastlingRights(), doubleSteppedPawn: null });
  const resetToStandard = () => setPosition(toEditorPosition(STANDARD_FEN));
  const playPosition = () => navigate(`/app?fen=${encodeURIComponent(fen)}`);

  return (
    <div className="flex min-h-dvh items-center justify-center py-6 text-black dark:text-white">
      <div className="ml-24 flex w-80 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Link to="/app" className="flex items-center gap-2">
            <ArrowLeft size={18} /> Back to game
          </Link>
          <h1 className="flex items-center gap-3 text-[2rem]">
            <Pencil /> Position Editor
          </h1>
        </div>

        <PiecePalette tool={tool} onSelect={setTool} />

        <div className="flex flex-col gap-2">
          <span className="text-[1.2rem]">Side to move</span>
          <div className="flex gap-2">
            {(["w", "b"] as const).map((color) => (
              <button
                key={color}
                type="button"
                aria-pressed={position.currentTurn === color}
                onClick={() => setPosition((current) => ({ ...current, currentTurn: color }))}
                className={classNames(
                  "cursor-pointer rounded-md border border-black/15 px-3 py-1 dark:border-white/20",
                  position.currentTurn === color && "border-transparent bg-black text-white dark:bg-white dark:text-black"
                )}
              >
                {COLOR_NAMES[color]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[1.2rem]">Castling</span>
          {(["w", "b"] as const).map((color) => (
            <div key={color} className="flex items-center gap-4">
              <span className="w-12">{COLOR_NAMES[color]}</span>
              {SIDES.map((side) => (
                <label key={side} className={classNames("flex items-center gap-1", !availableRights[color][side] && "opacity-40")}>
                  <input
                    type="checkbox"
                    checked={isRightChecked(color, side)}
                    disabled={!availableRights[color][side]}
                    onChange={() => toggleCastlingRight(color, side)}
                  />
                  {SIDE_LABELS[side]}
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[1.2rem]">FEN</span>
          <input
            aria-label="FEN"
            value={fenInput}
            spellCheck={false}
            onChange={(event) => setFenInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && loadFen()}
            className="w-full rounded-md border border-black/15 bg-white/60 px-2 py-1 text-sm dark:border-white/20 dark:bg-black/30"
          />
          {fenError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{fenError}</p>}
          <div className="flex gap-4">
            <button type="button" onClick={loadFen} className="cursor-pointer">
              Load FEN
            </button>
            <button type="button" onClick={copyFen} className="flex cursor-pointer items-center gap-1">
              <Copy size={14} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={clearBoard} className="cursor-pointer rounded-md border border-black/15 px-3 py-1 dark:border-white/20">
            Clear board
          </button>
          <button type="button" onClick={resetToStandard} className="cursor-pointer rounded-md border border-black/15 px-3 py-1 dark:border-white/20">
            Standard
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={validationError !== null}
            onClick={playPosition}
            className="cursor-pointer self-start rounded-md bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black"
          >
            Play this position
          </button>
          {validationError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{validationError}</p>}
        </div>
      </div>

      <div className="mr-[clamp(0rem,8vw,6rem)] ml-auto flex aspect-square w-[min(90vw,90vh)] max-w-160 items-center justify-center">
        <ChessBoard board={position.board} currentTurn="w" selectedSquare={null} legalTargets={[]} onSquareClick={handleSquareClick} />
      </div>
    </div>
  )
}
