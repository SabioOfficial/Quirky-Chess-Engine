import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Scale, Undo2 } from "lucide-react";
import type { RuleToggles } from "~/lib/chess/types";

interface RuleDefinition {
  key: keyof RuleToggles;
  icon: string;
  label: string;
}

const LEGAL_RULES: RuleDefinition[] = [
  { key: "castling", icon: "♖", label: "Castling" },
  { key: "enPassant", icon: "♙", label: "En Passant" },
  { key: "pawnPromotion", icon: "♙", label: "Pawn Promotion" },
];

const ILLEGAL_RULES: RuleDefinition[] = [
  { key: "ilVaticano", icon: "♗", label: "Il Vaticano" },
];

function HoldToExitButton({ onExit }: { onExit: () => void }) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  }

  const startHold = () => {
    cancelHold();
    holdTimerRef.current = setTimeout(onExit, 1500);
  }

  useEffect(() => () => cancelHold(), []);

  return (
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      className="flex cursor-pointer select-none gap-2 text-left"
    >
      <Undo2 /> Back (Hold)
    </button>
  );
}

interface RuleGroupProperties {
  title: string;
  ruleDefinitions: RuleDefinition[];
  rules: RuleToggles;
  onToggle: (rule: keyof RuleToggles) => void;
}

function RuleGroup({ title, ruleDefinitions, rules, onToggle }: RuleGroupProperties) {
  const [isOpen, setIsOpen] = useState(true);
  const ChevronIcon = isOpen ? ChevronDown : ChevronUp;

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="mt-2 mb-1 flex items-center cursor-pointer gap-2 text-left text-[1.4rem]"
      >
        {title}
        <ChevronIcon />
      </button>
      {isOpen &&
        ruleDefinitions.map(({ key, icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className="cursor-pointer text-left"
          >
            {icon} {rules[key] ? "Disable" : "Enable"} {label}
          </button>
        ))
      }
    </>
  )
}

interface RuleTogglerProperties {
  rules: RuleToggles;
  onToggle: (rule: keyof RuleToggles) => void;
  onExit: () => void;
}

export function RuleToggler({ rules, onToggle, onExit }: RuleTogglerProperties) {
  return (
    <div className="ml-24 flex flex-col gap-2">
      <HoldToExitButton onExit={onExit} />
      <h2 className="mt-2 flex items-center gap-4 text-[2rem]">
        <Scale />
        Toggle Rules
      </h2>
      <RuleGroup title="Legal Moves" ruleDefinitions={LEGAL_RULES} rules={rules} onToggle={onToggle} />
      <RuleGroup title="Illegal Moves" ruleDefinitions={ILLEGAL_RULES} rules={rules} onToggle={onToggle} />
    </div>
  )
}
