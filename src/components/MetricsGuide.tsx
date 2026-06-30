import Link from "next/link";
import { ArrowLeft, BookOpen, Eye, Film, Info, MoveHorizontal, MoveUpRight, Ruler, ShieldCheck } from "lucide-react";
import { metricGuideItems, type MetricGuideItem } from "@/lib/analysis/metric-guide";

const categoryCopy: Record<MetricGuideItem["category"], string> = {
  measured: "Measured directly",
  derived: "Derived heuristic",
  ai: "AI interpretation",
};

export function MetricsGuide() {
  return (
    <main className="min-h-screen bg-[#f6f4ee] text-[#171713]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="border-b border-[#d8d1c2] pb-6">
          <Link
            href="/"
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-[#d8d1c2] bg-white px-3 text-sm font-semibold text-[#245a3d] transition hover:bg-[#fbfaf7]"
          >
            <ArrowLeft size={17} />
            Analyzer
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#c8d6c0] bg-[#edf5e8] px-3 py-1 text-sm font-medium text-[#315b34]">
                <BookOpen size={16} />
                Metrics guide
              </div>
              <h1 className="text-4xl font-semibold tracking-normal text-[#171713] sm:text-5xl">How The Motion Signals Work</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#5d594f]">
                These diagrams explain what the prototype measures locally before the OpenRouter coach diagnosis runs.
                Some values are direct computer-vision outputs, while others are simple proxies from body landmarks.
              </p>
            </div>
            <div className="rounded-lg border border-[#d8d1c2] bg-white p-4 text-sm leading-6 text-[#5d594f] shadow-sm md:max-w-sm">
              <div className="mb-2 flex items-center gap-2 font-semibold text-[#171713]">
                <ShieldCheck size={17} className="text-[#245a3d]" />
                Reliability rule
              </div>
              Treat these metrics as context for a coach model, not final proof. Video angle, lighting, frame sampling, and
              landmark confidence all change the numbers.
            </div>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-2">
          {metricGuideItems.map((item) => (
            <MetricGuideCard key={item.id} item={item} />
          ))}
        </section>

        <section className="rounded-lg border border-[#d8d1c2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Info size={18} className="text-[#c84f31]" />
            <h2 className="text-xl font-semibold text-[#171713]">How this connects to the AI diagnosis</h2>
          </div>
          <div className="grid gap-4 text-sm leading-6 text-[#5d594f] md:grid-cols-3">
            <div>
              <h3 className="font-semibold text-[#171713]">Measured</h3>
              <p>MediaPipe detects body landmarks and gives visibility/confidence signals.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#171713]">Derived</h3>
              <p>The app converts landmarks into simple normalized movement proxies like stance ratio and balance drift.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[#171713]">Interpreted</h3>
              <p>OpenRouter receives the video and metrics, then writes coaching feedback with confidence caveats.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricGuideCard({ item }: { item: MetricGuideItem }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[#d8d1c2] bg-white shadow-sm">
      <div className="border-b border-[#e5dfd3] bg-[#fbfaf7] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-[#edf5e8] px-3 py-1 text-xs font-semibold text-[#315b34]">
              {categoryCopy[item.category]}
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-[#171713]">{item.name}</h2>
          </div>
          <MetricIcon id={item.id} />
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_1.05fr]">
        <div className="border-b border-[#e5dfd3] bg-[#f6f4ee] p-4 md:border-b-0 md:border-r">
          <MetricDiagram id={item.id} />
        </div>
        <div className="space-y-4 p-4">
          <MetricText label="What it means" value={item.shortDefinition} />
          <MetricText label="Formula" value={item.formula} code />
          <MetricText label="How to read it" value={item.interpretation} />
          <MetricText label="Caveat" value={item.caveat} />
        </div>
      </div>
    </article>
  );
}

function MetricText({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-normal text-[#777064]">{label}</p>
      {code ? (
        <code className="mt-1 block rounded-md bg-[#171713] px-3 py-2 text-sm text-white">{value}</code>
      ) : (
        <p className="mt-1 text-sm leading-6 text-[#5d594f]">{value}</p>
      )}
    </div>
  );
}

function MetricIcon({ id }: { id: MetricGuideItem["id"] }) {
  const className = "mt-1 text-[#c84f31]";
  if (id === "poseVisibility") return <Eye className={className} size={26} />;
  if (id === "sampledFrames") return <Film className={className} size={26} />;
  if (id === "stanceRatio") return <Ruler className={className} size={26} />;
  if (id === "balanceDrift") return <MoveHorizontal className={className} size={26} />;
  return <MoveUpRight className={className} size={26} />;
}

function MetricDiagram({ id }: { id: MetricGuideItem["id"] }) {
  if (id === "poseVisibility") return <PoseVisibilityDiagram />;
  if (id === "sampledFrames") return <SampledFramesDiagram />;
  if (id === "stanceRatio") return <StanceRatioDiagram />;
  if (id === "balanceDrift") return <BalanceDriftDiagram />;
  return <FollowThroughDiagram />;
}

function DiagramFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 360 240" role="img" className="h-full min-h-56 w-full" aria-hidden="true">
      <rect x="1" y="1" width="358" height="238" rx="8" fill="#fffdf8" stroke="#d8d1c2" />
      {children}
    </svg>
  );
}

function StickFigure({ cx = 180, cy = 72, stroke = "#171713" }: { cx?: number; cy?: number; stroke?: string }) {
  return (
    <g fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="5">
      <circle cx={cx} cy={cy} r="13" fill="#fffdf8" />
      <path d={`M ${cx} ${cy + 15} L ${cx} ${cy + 70}`} />
      <path d={`M ${cx - 48} ${cy + 36} L ${cx + 48} ${cy + 36}`} />
      <path d={`M ${cx - 34} ${cy + 124} L ${cx} ${cy + 70} L ${cx + 34} ${cy + 124}`} />
    </g>
  );
}

function PoseVisibilityDiagram() {
  const points = [
    [180, 72, "#245a3d"],
    [132, 108, "#245a3d"],
    [228, 108, "#245a3d"],
    [180, 142, "#e0a327"],
    [146, 196, "#c84f31"],
    [214, 196, "#245a3d"],
  ] as const;

  return (
    <DiagramFrame>
      <StickFigure />
      {points.map(([x, y, color]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill={color} stroke="#fffdf8" strokeWidth="3" />
      ))}
      <text x="84" y="38" fill="#245a3d" fontSize="13" fontWeight="700">clear</text>
      <text x="154" y="38" fill="#9a6b0d" fontSize="13" fontWeight="700">partial</text>
      <text x="244" y="38" fill="#a94028" fontSize="13" fontWeight="700">uncertain</text>
    </DiagramFrame>
  );
}

function SampledFramesDiagram() {
  const dots = [42, 88, 134, 180, 226, 272, 318];

  return (
    <DiagramFrame>
      <rect x="36" y="70" width="288" height="102" rx="6" fill="#171713" />
      <path d="M 52 190 H 308" stroke="#777064" strokeWidth="4" strokeLinecap="round" />
      {dots.map((x, index) => (
        <g key={x}>
          <circle cx={x} cy="190" r="8" fill={index % 2 === 0 ? "#245a3d" : "#c84f31"} />
          <rect x={x - 15} y="92" width="30" height="44" rx="4" fill={index % 2 === 0 ? "#edf5e8" : "#f7ddd3"} />
        </g>
      ))}
      <text x="92" y="44" fill="#5d594f" fontSize="14" fontWeight="700">selected timestamps, not every frame</text>
    </DiagramFrame>
  );
}

function StanceRatioDiagram() {
  return (
    <DiagramFrame>
      <StickFigure cy={62} />
      <path d="M 132 108 H 228" stroke="#245a3d" strokeWidth="5" strokeLinecap="round" />
      <path d="M 112 196 H 248" stroke="#c84f31" strokeWidth="5" strokeLinecap="round" />
      <path d="M 132 96 V 120 M 228 96 V 120 M 112 184 V 208 M 248 184 V 208" stroke="#777064" strokeWidth="3" />
      <text x="132" y="91" fill="#245a3d" fontSize="13" fontWeight="700">shoulders</text>
      <text x="128" y="226" fill="#c84f31" fontSize="13" fontWeight="700">ankles / stance</text>
      <text x="74" y="40" fill="#5d594f" fontSize="14" fontWeight="700">stance width divided by shoulder width</text>
    </DiagramFrame>
  );
}

function BalanceDriftDiagram() {
  return (
    <DiagramFrame>
      <StickFigure cx={154} cy={62} stroke="#6b665a" />
      <StickFigure cx={206} cy={62} stroke="#171713" />
      <path d="M 154 132 C 170 118, 190 118, 206 132" fill="none" stroke="#c84f31" strokeWidth="5" strokeLinecap="round" />
      <circle cx="154" cy="132" r="8" fill="#245a3d" />
      <circle cx="206" cy="132" r="8" fill="#c84f31" />
      <path d="M 132 108 H 228" stroke="#245a3d" strokeWidth="4" strokeLinecap="round" />
      <text x="74" y="40" fill="#5d594f" fontSize="14" fontWeight="700">shoulder-center movement normalized by shoulder width</text>
      <text x="124" y="218" fill="#c84f31" fontSize="13" fontWeight="700">side-to-side drift</text>
    </DiagramFrame>
  );
}

function FollowThroughDiagram() {
  return (
    <DiagramFrame>
      <StickFigure cx={150} cy={64} />
      <path d="M 118 146 C 154 118, 190 92, 232 62" fill="none" stroke="#c84f31" strokeWidth="6" strokeLinecap="round" />
      <circle cx="118" cy="146" r="8" fill="#c84f31" />
      <circle cx="174" cy="104" r="8" fill="#e0a327" />
      <circle cx="232" cy="62" r="8" fill="#245a3d" />
      <path d="M 266 62 V 146" stroke="#245a3d" strokeWidth="4" strokeLinecap="round" />
      <path d="M 256 62 H 276 M 256 146 H 276" stroke="#245a3d" strokeWidth="4" strokeLinecap="round" />
      <text x="72" y="40" fill="#5d594f" fontSize="14" fontWeight="700">vertical wrist travel through the finish</text>
      <text x="244" y="112" fill="#245a3d" fontSize="13" fontWeight="700">height range</text>
    </DiagramFrame>
  );
}
