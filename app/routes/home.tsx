import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { INITIAL_BOARD, type Position, type Board, isMoveValid, getPieceColor } from "~/lib/miniBoard";
import { applyTheme, getStoredTheme, getSystemTheme, toggleTheme } from "~/lib/theme";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Quirky Chess Engine" },
    { name: "description", content: "A customizable local dual-player Javascript-based chess engine." },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [selected, setSelected] = useState<Position | null>(null);

  useEffect(() => {
    const storedTheme = getStoredTheme();
    applyTheme(storedTheme ?? getSystemTheme());
    if (storedTheme) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const handleSquareClick = (row: number, col: number) => {
    const clickedPiece = board[row][col];

    if (!selected) {
      if (clickedPiece === "wQueen") setSelected({ row, col });
      return;
    }

    const movingPiece = board[selected.row][selected.col];
    const destination = { row, col };

    if (!movingPiece || !isMoveValid(movingPiece, selected, destination, board)) {
      setSelected(null);
      return;
    }

    const nextBoard = board.map((boardRow) => [...boardRow]);
    nextBoard[row][col] = movingPiece;
    nextBoard[selected.row][selected.col] = null;

    if (clickedPiece === "bPawn") {
      navigate("/app");
      return;
    }

    if (clickedPiece === "bBishop") {
      toggleTheme();
      nextBoard[selected.row][selected.col] = "bBishop";
    }

    setBoard(nextBoard);
    setSelected(null);
  };

  const selectedPiece = selected ? board[selected.row][selected.col] : null;

  return (
    <div className="flex flex-col gap-16 justify-center items-center text-center h-dvh px-[25dvw]">
      <div className="flex flex-col justify-center items-center">
        <img src="Logo.png" alt="Quirky Chess Engine Logo" height={200} width={200} />
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl">
            Quirky Chess Engine&nbsp;
            <span className="text-base">v1.0&nbsp;
              <span className="bg-linear-to-b from-[#4ab1ff] to-[#4a83ff] bg-clip-text text-transparent">Reloaded</span>
            </span>
          </h1>
          <p>A customizable local dual-player JavaScript-based chess engine. Capture the pawn to start, capture the bishop to change themes.</p>
        </div>
      </div>

      <div id="mini-chess-board" className="flex flex-col items-center rounded-lg overflow-hidden">
        {board.map((boardRow, row) => (
          <div key={row} className="flex">
            {boardRow.map((piece, col) => {
              const isLight = (row + col) % 2 === 0;
              const isSelected = selected?.row === row && selected?.col === col;
              const isAvailable = !!selectedPiece && selected !== null && isMoveValid(selectedPiece, selected, { row, col }, board);

              const background = isLight ? "bg-[#F2E5D3]" : piece && getPieceColor(piece) === "b" ? "bg-[#765A4A]" : "bg-[#5E463E]";

              return (
                <div key={col} onClick={() => handleSquareClick(row, col)} className={[
                  "relative flex items-center justify-center select-none size-[clamp(2.5rem,8vw,5rem)]",
                  background,
                  (isSelected || isAvailable) && "after:content-[''] after:absolute after:inset-[4%] after:border-2 after:pointer-events-none",
                  isSelected && "after:border-white/85",
                  isAvailable && "after:border-[rgba(0,162,255,0.85)] brightness-[1.08] transition-[filter] duration-200 hover:brightness-[1.12] hover:saturate-[1.1]",
                ]
                  .filter(Boolean)
                  .join(" ")}
                >
                  {piece && (
                    <img
                      src={`pieces/standard/${piece}.png`}
                      alt={piece}
                      className="size-[clamp(2.5rem,8vw,5rem)] pointer-events-none"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
