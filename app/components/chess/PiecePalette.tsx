import { Eraser } from "lucide-react";
import { makePiece } from "~/lib/chess/rules";
import type { Piece, PieceType } from "~/lib/chess/types";
import { classNames } from "~/lib/classNames";

export type EditorTool = Piece | "erase";

const PIECE_TYPES: PieceType[] = ["King", "Queen", "Rook", "Bishop", "Knight", "Pawn"];

interface PiecePalleteProperties {
  tool: EditorTool;
  onSelect: (tool: EditorTool) => void;
}

export function PiecePalette({ tool, onSelect }: PiecePalleteProperties) {
  return (
    <div className="flex flex-col gap-1">
      {(["w", "b"] as const).map((color) => (
        <div key={color} className="flex gap-1">
          {PIECE_TYPES.map((type) => {
            const piece = makePiece(color, type);

            return (
              <button
                key={piece}
                type="button"
                aria-label={piece}
                aria-pressed={tool === piece}
                onClick={() => onSelect(piece)}
                className={classNames(
                  "size-12 cursor-pointer rounded-md bg-[#F2E5D3] dark:bg-[#5E463E] p-0.5 ring-2", tool === piece ? "ring-[#4a83ff]" : "ring-transparent hover:ring-black/20"
                )}
              >
                <img src={`/pieces/standard/${piece}.png`} className="size-full object-contain" />
              </button>
            );
          })}
        </div>
      ))}

      <button
        type="button"
        aria-pressed={tool === "erase"}
        onClick={() => onSelect("erase")}
        className={classNames(
         "mt-1 flex cursor-pointer items-center gap-2 self-start rounded-md px-3 py-1 ring-2", tool === "erase" ? "ring-[#4a83ff]" : "ring-black/15 dark:ring-white/20"
        )}
      >
        <Eraser size={16} /> Eraser
      </button>
    </div>
  )
}
