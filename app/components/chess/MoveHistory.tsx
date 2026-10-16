import { useEffect, useRef } from "react";

interface MoveHistoryProperties {
  moves: string[];
}

export function MoveHistory({ moves }: MoveHistoryProperties) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [moves.length]);

  const turns = Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => ({
    number: index + 1,
    whiteIndex: index * 2,
    blackIndex: index * 2 + 1,
  }));

  const lastMoveIndex = moves.length - 1;
  const renderMove = (moveIndex: number) => {
    const move = moves[moveIndex];
    if (!move) return null;
    if (moveIndex !== lastMoveIndex) return move;

    return (
      <span className="rounded bg-black px-1.5 py-0.5 text-white dark:bg-white dark:text-black">{move}</span>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 mx-8">
      <div
        ref={scrollRef}
        className="max-h-[min(90vw,90vh,40rem)] min-w-0 grow overflow-auto rounded-lg border border-black/10 bg-white/50 shadow-sm dark:border-white/15 dark:bg-black/30"
      >
        <table aria-label="Move history" className="w-full border-separate border-spacing-0 text-left text-base tabular-nums">
          <thead>
            <tr className="text-xs uppercase tracking-wide">
              {["Move", "White", "Black"].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="sticky top-0 z-10 border-b border-black/10 bg-neutral-200 px-2.5 py-2 dark:border-white/15 dark:bg-neutral-800"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {turns.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2.5 py-4 text-center opacity-50">
                  No moves yet
                </td>
              </tr>
            ) : (
              turns.map(({ number, whiteIndex, blackIndex }) => (
                <tr key={number} className="even:bg-black/5 dark:even:bg-white/5">
                  <th scope="row" className="px-2.5 py-1.5 opacity-60">M{number}</th>
                  <td className="px-2.5 py-1.5">{renderMove(whiteIndex)}</td>
                  <td className="px-2.5 py-1.5">{renderMove(blackIndex)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
