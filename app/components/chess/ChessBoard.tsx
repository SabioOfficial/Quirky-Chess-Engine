import { getPieceColor, isSamePosition } from "~/lib/chess/rules";
import type { Board, PieceColor, Position } from "~/lib/chess/types";

const FILE_LABELS = ["h", "g", "f", "e", "d", "c", "b", "a"];
const classNames = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

interface ChessBoardProperties {
  board: Board;
  currentTurn: PieceColor;
  selectedSquare: Position | null;
  legalTargets: Position[];
  onSquareClick: (position: Position) => void;
}

export function ChessBoard({ board, currentTurn, selectedSquare, legalTargets, onSquareClick }: ChessBoardProperties) {
  const isRotated = currentTurn === "w";
  const rankLabelCol = isRotated ? 7 : 0;
  const fileLabelRow = isRotated ? 0 : 7;

  return (
    <div className={classNames("flex size-full flex-col items-center justify-center overflow-hidden rounded-lg transition-all duration-700 ease-[ease]", isRotated ? "rotate-180" : "rotate-0")}>
      {board.map((boardRow, row) => (
        <div key={row} className="flex">
          {boardRow.map((piece, col) => {
            const position = { row, col };
            const isLightSquare = (row + col) % 2 === 0;
            const hasBlackPiece = piece !== null && getPieceColor(piece) === "b";
            const isSelected = selectedSquare !== null && isSamePosition(selectedSquare, position);
            const isLegalTarget = legalTargets.some((target) => isSamePosition(target, position));
            const labelClasses = classNames("pointer-events-none absolute text-xs font-bold", isLightSquare ? "text-[#5E463E]" : "text-[#F2E5D3]", isRotated && "rotate-180");

            return (
              <div
                key={col}
                onClick={() => onSquareClick(position)}
                className={classNames(
                  "relative flex select-none items-center justify-center size-[clamp(2.5rem,8vw,5rem)]",
                  isLightSquare ? "bg-[#F2E5D3]" : hasBlackPiece ? "bg-[#765A4A]" : "bg-[#5E463E]",
                  (isSelected || isLegalTarget) && "after:content-[''] after:absolute after:inset-[4%] after:border-2 after:pointer-events-none",
                  isSelected && "after:border-white/85",
                  isLegalTarget && "after:border-[rgba(0,162,255,0.85)] brightness-[1.08] transition-[filter] duration-200 hover:brightness-110 hover:saturate-[1.1]"
                )}
              >
                {col === rankLabelCol && (
                  <span className={classNames(labelClasses, isRotated ? "right-1 bottom-0.5" : "top-0.5 left-1")}>{row + 1}</span>
                )}
                {row === fileLabelRow && (
                  <span className={classNames(labelClasses, isRotated ? "top-0.5 left-1" : "right-1 bottom-0.5")}>{FILE_LABELS[col]}</span>
                )}
                {piece && (
                  <img
                    src={`/pieces/standard/${piece}.png`}
                    alt={piece}
                    className={classNames("size-[clamp(2.5rem,8vw,5rem)] pointer-events-none", isRotated && "rotate-180")}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
