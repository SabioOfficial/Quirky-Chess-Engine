import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Quirky Chess Engine" },
    { name: "description", content: "A customizable local dual-player Javascript-based chess engine." },
  ];
}

export default function Home() {
  return (
    <div className="flex flex-col justify-center items-center text-center h-dvh px-[25dvw]">
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

      <div id="mini-chess-board" className="flex flex-col items-center rounded-lg overflow-hidden"></div>
    </div>
  );
}
