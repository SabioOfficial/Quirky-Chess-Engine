import { useEffect, useMemo, useRef, useState } from "react";
import { applyMove, completePromotion, createInitialGameState, DEFAULT_RULES, getGameStatus, getLegalMoves, getPieceAt, getPieceColor, isSamePosition, type PromotionPieceType } from "~/lib/chess/rules";
import type { Position, RuleToggles, GameState } from "~/lib/chess/types";

export function useChessGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [rules, setRules] = useState<RuleToggles>(DEFAULT_RULES);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const placeSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    placeSoundRef.current = new Audio("/place.mp3");
  }, []);

  const status = useMemo(() => getGameStatus(gameState, rules), [gameState, rules]);
  const isGameOver = status === "checkmate" || status === "stalemate";

  const legalMoves = useMemo(
    () => (selectedSquare ? getLegalMoves(gameState, rules, selectedSquare) : []),
    [gameState, rules, selectedSquare],
  );
  const legalTargets = useMemo(() => legalMoves.map((move) => move.to), [legalMoves]);

  const playPlaceSound = () => {
    const sound = placeSoundRef.current;
    if (!sound) return;
    sound.currentTime = 0;
    void sound.play().catch(() => { });
  }

  const handleSquareClick = (position: Position) => {
    if (isGameOver || gameState.pendingPromotion) return;

    if (!selectedSquare) {
      const clickedPiece = getPieceAt(gameState.board, position);
      if (clickedPiece && getPieceColor(clickedPiece) === gameState.currentTurn) {
        setSelectedSquare(position);
      }
      return;
    }

    const chosenMove = legalMoves.find((move) => isSamePosition(move.to, position));
    setSelectedSquare(null);
    if (!chosenMove) return;

    setGameState(applyMove(gameState, rules, chosenMove));
    playPlaceSound();
  }

  const handlePromotionChoice = (pieceType: PromotionPieceType) => {
    setGameState((current) => completePromotion(current, pieceType));
    playPlaceSound();
  }

  const toggleRule = (rule: keyof RuleToggles) => {
    if (gameState.pendingPromotion) return;
    setRules((current) => ({ ...current, [rule]: !current[rule] }));
  }

  const resetGame = () => {
    setGameState(createInitialGameState());
    setSelectedSquare(null);
  }

  return {
    gameState,
    rules,
    status,
    isGameOver,
    selectedSquare,
    legalTargets,
    handleSquareClick,
    handlePromotionChoice,
    toggleRule,
    resetGame,
  }
}
