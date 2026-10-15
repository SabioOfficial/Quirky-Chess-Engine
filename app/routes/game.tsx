import type { GameStatus, PieceColor } from "~/lib/chess/types";
import type { Route } from "./+types/game";
import { getOpponent } from "~/lib/chess/rules";
import { useNavigate } from "react-router";
import { useChessGame } from "~/hooks/useChessGame";
import { RuleToggler } from "~/components/chess/RuleToggler";
import { ChessBoard } from "~/components/chess/ChessBoard";
import { PromotionModal } from "~/components/chess/PromotionModal";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Game // Quirky Chess Engine" },
    { name: "description", content: "Playing a game in Quirky Chess Engine." },
  ];
}

const COLOR_NAMES: Record<PieceColor, string> = { w: "White", b: "Black" };

const getStatusMessage = (status: GameStatus, currentTurn: PieceColor): string | null => {
  switch (status) {
    case "check":
      return `${COLOR_NAMES[currentTurn]} is in check!`;
    case "checkmate":
      return `Checkmate! ${COLOR_NAMES[getOpponent(currentTurn)]} wins!`;
    case "stalemate":
      return `Stalemate. It's a tie... :(`
    default:
      return null;
  }
}

export default function Game() {
  const navigate = useNavigate();
  const {
    gameState,
    rules,
    status,
    isGameOver,
    selectedSquare,
    legalTargets,
    handleSquareClick,
    handlePromotionChoice,
    toggleRule,
    resetGame
  } = useChessGame();

  const statusMessage = getStatusMessage(status, gameState.currentTurn);

  return (
    <div className="flex h-dvh items-center justify-center text-black dark:text-white">
      {statusMessage && (
        <div
          role="status"
          className="fixed top-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-black/10 px-5 py-3 text-xl backdrop-blur-sm dark:bg-white/10"
        >
          {statusMessage}
          {isGameOver && (
            <button type="button" onClick={resetGame} className="cursor-pointer underline">
              New Game
            </button>
          )}
        </div>
      )}

      <RuleToggler rules={rules} onToggle={toggleRule} onExit={() => navigate("/")} />

      <div className="mr-[clamp(0rem,8vw,6rem)] ml-auto flex aspect-square w-[min(90vw,90vh)] max-w-160 items-center justify-center">
        <ChessBoard
          board={gameState.board}
          currentTurn={gameState.currentTurn}
          selectedSquare={selectedSquare}
          legalTargets={legalTargets}
          onSquareClick={handleSquareClick}
        />
      </div>

      {gameState.pendingPromotion && (
        <PromotionModal color={gameState.pendingPromotion.color} onSelect={handlePromotionChoice} />
      )}
    </div>
  )
}
