import { makePiece, PROMOTION_PIECE_TYPES, type PromotionPieceType } from "~/lib/chess/rules";
import type { PieceColor } from "~/lib/chess/types";

interface PromotionModalProperties {
  color: PieceColor;
  onSelect: (pieceType: PromotionPieceType) => void;
}

export function PromotionModal({ color, onSelect }: PromotionModalProperties) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Choose a promotion piece" className="fixed inset-0 z-1000 flex items-center justify-center bg-black/30">
      <div className="rounded-lg bg-white/35 p-5 text-center shadow-[0_4px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <div className="flex select-none justify-center gap-2">
          {PROMOTION_PIECE_TYPES.map((pieceType) => (
            <img
              key={pieceType}
              src={`/pieces/standard/${makePiece(color, pieceType)}.png`}
              alt={`Promote to ${pieceType}`}
              onClick={() => onSelect(pieceType)}
              className="size-[clamp(2.5rem,8vw,5rem)] cursor-pointer transition-all duration-[250] hover:invert"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
