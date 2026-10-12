import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
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
    <div className="flex flex-row pl-[4dvw]">
      <div className="flex flex-col items-start justify-center text-left h-dvh grow">
        <div className="flex flex-row gap-4">
          <img src="Logo.png" alt="Quirky Chess Engine Logo" className="h-[20dvh] dark:invert dark:hue-rotate-180" />
          <div className="flex flex-col gap-3 items-start">
            <h1 className="text-3xl">
              Quirky Chess Engine&nbsp;
              <span className="text-base">v1.0&nbsp;
                <span className="bg-linear-to-b from-[#4ab1ff] to-[#4a83ff] bg-clip-text text-transparent" data-tooltip-id="reloaded" data-tooltip-place="bottom-start">Reloaded</span>
                <Tooltip id="reloaded">
                  Quirky Chess Engine is back, now running on React Router v8,<br />
                  which will make development so much easier.
                </Tooltip>
              </span>
            </h1>
            <p>A customizable local dual-player TypeScript-based chess engine. Capture the pawn to start, capture the bishop to change themes.</p>
            <div id="mini-chess-board" className="flex flex-col items-center rounded-lg overflow-hidden mt-4">
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
        </div>
      </div>
      <div className="flex flex-col gap-4 items-start mx-[1dvw] my-[3dvh] py-[2dvh] px-[2dvw] w-[33dvw] bg-black/5 dark:bg-black/10 rounded-2xl">
        <h2 className="text-2xl self-center">Latest News</h2>
        <hr className="border-2 rounded-full border-black/80 dark:border-white/80 w-full" />
        <div className="flex flex-col gap-2">
          <h3 className="text-3xl whitespace-nowrap">Framework Upgrade <span className="bg-blue-500 w-fit px-2 py-0.5 text-sm rounded-sm">MAJOR</span></h3>
          <p className="text-sm">Quirky Chess Engine is being rewritten into TypeScript with the React Router v8 framework! New features are arriving soon.</p>
        </div>
      </div>
    </div>
  );
}
