import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PRESET_POSITIONS } from "~/lib/chess/positions";

interface PositionPickerProperties {
  startingFen: string;
  onLoad: (fen: string) => string | null;
  onRestart: () => void;
}

export function PositionPicker({ startingFen, onLoad, onRestart }: PositionPickerProperties) {
  const [isOpen, setIsOpen] = useState(true);
  const [fenInput, setFenInput] = useState(startingFen);
  const [error, setError] = useState<string | null>(null);
  const ChevronIcon = isOpen ? ChevronDown : ChevronUp;

  useEffect(() => {
    setFenInput(startingFen);
    setError(null);
  }, [startingFen]);

  const selectedPreset = PRESET_POSITIONS.find((preset) => preset.fen === startingFen);

  const loadFen = (fen: string) => setError(onLoad(fen));

  return (
    <div className="ml-24 flex w-56 flex-col gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex cursor-pointer items-center gap-2 text-left text-[1.4rem]"
      >
        Starting Position
        <ChevronIcon />
      </button>

      {isOpen && (
        <>
          <select
            aria-label="Starting position"
            value={selectedPreset?.fen ?? "custom"}
            onChange={(event) => event.target.value !== "custom" && loadFen(event.target.value)}
            className="w-full rounded-md border border-black/15 bg-white/60 px-2 py-1 text-sm dark:border-white/20 dark:bg-black/30 dark:scheme-dark"
          >
            {PRESET_POSITIONS.map((preset) => (
              <option key={preset.id} value={preset.fen}>
                {preset.name}
              </option>
            ))}
            {!selectedPreset && <option value="custom">Custom</option>}
          </select>

          <input
            aria-label="FEN"
            value={fenInput}
            spellCheck={false}
            onChange={(event) => setFenInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && loadFen(fenInput)}
            className="w-full rounded-md border border-black/15 bg-white/60 px-2 py-1 text-sm dark:border-white/20 dark:bg-black/30 dark:scheme-dark"
          />

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <button type="button" onClick={() => loadFen(fenInput)} className="cursor-pointer">
              Load FEN
            </button>
            <button type="button" onClick={onRestart} className="cursor-pointer">
              Restart
            </button>
          </div>
        </>
      )}
    </div>
  )
}
