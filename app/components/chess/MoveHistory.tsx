import { useEffect, useRef } from "react";

interface MoveHistoryProperties {
  moves: string[];
}

export function MoveHistory({ moves }: MoveHistoryProperties) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [moves.length]);

  const turns = Array.from({ length: Math.ceil(moves.length / 2) }, (_, index) => ({
    number: index + 1,
    white: moves[index * 2],
    black: moves[index * 2 + 1] ?? "",
  }));

  return (
    <div className="flex min-w-0 flex-1 justify-center px-2">
      <ol
        ref={listRef}
        aria-label="Move history"
        className="grid max-h-[min(90vw,90vh)] grid-cols-[auto_auto_auto] content-start gap-x-3 gap-y-1 overflow-y-auto text-lg"
      >
        {turns.map(({ number, white, black }) => (
          <li key={number} className="contents">
            <span>M{number}</span>
            <span>{white}</span>
            <span>{black}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
