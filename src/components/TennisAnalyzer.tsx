"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Brain,
  ClipboardList,
  Dumbbell,
  Gauge,
  Loader2,
  Play,
  Upload,
  Video,
} from "lucide-react";
import { extractPoseSummary } from "@/lib/analysis/pose-extraction";
import type { AnalyzeApiError, AnalyzeApiSuccess, DiagnosisResult, PoseSummary } from "@/lib/analysis/types";
import { validateVideoFile } from "@/lib/analysis/validation";

type Status = "idle" | "ready" | "extracting" | "analyzing" | "complete" | "error";

const statusCopy: Record<Status, string> = {
  idle: "Upload a swing clip",
  ready: "Ready to analyze",
  extracting: "Reading body motion",
  analyzing: "Asking the AI coach",
  complete: "Diagnosis ready",
  error: "Needs attention",
};

export function TennisAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [poseSummary, setPoseSummary] = useState<PoseSummary | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validation = useMemo(() => validateVideoFile(file), [file]);
  const isBusy = status === "extracting" || status === "analyzing";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onFileChange(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
    setPoseSummary(null);
    setResult(null);
    setError("");
    setProgress("");
    setStatus(nextFile ? "ready" : "idle");
  }

  async function analyze() {
    if (!file) return;
    const fileValidation = validateVideoFile(file);
    if (!fileValidation.valid) {
      setError(fileValidation.message || "The uploaded video is invalid.");
      setStatus("error");
      return;
    }

    try {
      setError("");
      setResult(null);
      setStatus("extracting");
      const summary = await extractPoseSummary(file, setProgress);
      setPoseSummary(summary);

      setStatus("analyzing");
      setProgress("Sending video and motion metrics to OpenRouter");
      const formData = new FormData();
      formData.append("video", file);
      formData.append("poseSummary", JSON.stringify(summary));

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as AnalyzeApiSuccess | AnalyzeApiError;

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Analysis failed.");
      }

      setResult(payload.result);
      setStatus("complete");
      setProgress("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
      setStatus("error");
      setProgress("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f4ee] text-[#171713]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#d8d1c2] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#c8d6c0] bg-[#edf5e8] px-3 py-1 text-sm font-medium text-[#315b34]">
              <Brain size={16} />
              OpenRouter + MediaPipe prototype
            </div>
            <h1 className="text-4xl font-semibold tracking-normal text-[#171713] sm:text-5xl">Virtual Tennis Coach</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#5d594f]">
              Upload a short forehand or backhand clip. The app detects the stroke, reads body-motion signals, and returns
              a focused technique diagnosis.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#171713] px-4 py-2 text-sm font-medium text-white">
            <Activity size={16} />
            {statusCopy[status]}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-[#d8d1c2] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#171713]">Video</h2>
                  <p className="text-sm text-[#6b665a]">MP4, MOV, or WebM. Keep the clip under 25MB.</p>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#245a3d] px-4 text-sm font-semibold text-white transition hover:bg-[#1b4830]"
                >
                  <Upload size={17} />
                  Choose
                </button>
              </div>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />

              <div className="mt-4 overflow-hidden rounded-md border border-[#d8d1c2] bg-[#111]">
                {previewUrl ? (
                  <video className="aspect-video w-full bg-black object-contain" controls src={previewUrl} />
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-[#d8d1c2] transition hover:bg-[#181818]"
                  >
                    <Video size={42} />
                    <span className="text-sm font-medium">Drop in a swing clip</span>
                  </button>
                )}
              </div>

              {file ? (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#171713]">{file.name}</p>
                    <p className="text-sm text-[#6b665a]">{(file.size / 1024 / 1024).toFixed(1)}MB</p>
                  </div>
                  <button
                    type="button"
                    disabled={!validation.valid || isBusy}
                    onClick={analyze}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#c84f31] px-5 text-sm font-semibold text-white transition hover:bg-[#a94028] disabled:cursor-not-allowed disabled:bg-[#b9b3a6]"
                  >
                    {isBusy ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                    Analyze
                  </button>
                </div>
              ) : null}

              {!validation.valid && file ? <InlineWarning message={validation.message || "Invalid video."} /> : null}
              {progress ? <ProgressMessage message={progress} /> : null}
              {error ? <InlineWarning message={error} /> : null}
            </div>

            {poseSummary ? <PoseSignals summary={poseSummary} /> : null}
          </div>

          <ResultPanel result={result} status={status} />
        </section>
      </div>
    </main>
  );
}

function InlineWarning({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-[#e6b4a3] bg-[#fff1ec] px-3 py-2 text-sm text-[#82331f]">
      <AlertCircle className="mt-0.5 shrink-0" size={16} />
      <span>{message}</span>
    </div>
  );
}

function ProgressMessage({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-center gap-2 rounded-md border border-[#c8d6c0] bg-[#f3f8ef] px-3 py-2 text-sm text-[#315b34]">
      <Loader2 className="animate-spin" size={16} />
      <span>{message}</span>
    </div>
  );
}

function PoseSignals({ summary }: { summary: PoseSummary }) {
  const metrics = [
    ["Pose visibility", `${Math.round(summary.confidence.averageVisibility * 100)}%`],
    ["Sampled frames", summary.video.sampledFrames.toString()],
    ["Stance ratio", formatMetric(summary.metrics.stanceWidthRatio.value)],
    ["Balance drift", formatMetric(summary.metrics.balanceDriftRatio.value)],
  ];

  return (
    <div className="rounded-lg border border-[#d8d1c2] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Gauge size={18} className="text-[#245a3d]" />
        <h2 className="text-lg font-semibold text-[#171713]">Motion Signals</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[#e5dfd3] bg-[#fbfaf7] p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-[#777064]">{label}</p>
            <p className="mt-1 text-xl font-semibold text-[#171713]">{value}</p>
          </div>
        ))}
      </div>
      {summary.observations.length ? (
        <ul className="mt-4 space-y-2 text-sm text-[#5d594f]">
          {summary.observations.map((observation) => (
            <li key={observation} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#245a3d]" />
              <span>{observation}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ResultPanel({ result, status }: { result: DiagnosisResult | null; status: Status }) {
  if (!result) {
    return (
      <aside className="rounded-lg border border-[#d8d1c2] bg-white p-5 shadow-sm">
        <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 text-center">
          <ClipboardList size={46} className="text-[#9a8f7d]" />
          <div>
            <h2 className="text-xl font-semibold text-[#171713]">Technique diagnosis appears here</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#6b665a]">
              {status === "idle"
                ? "Upload a clip to let the coach detect the stroke and critique the movement."
                : "The analysis will include stroke detection, confidence, phase feedback, issues, cues, and drills."}
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-[#d8d1c2] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e5dfd3] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#edf5e8] px-3 py-1 text-sm font-semibold text-[#315b34]">
            <BadgeCheck size={16} />
            Detected: {titleCase(result.classification.strokeType)}
          </div>
          <h2 className="text-2xl font-semibold text-[#171713]">Coach Diagnosis</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d594f]">{result.summary}</p>
        </div>
        <div className="rounded-md bg-[#171713] px-4 py-3 text-center text-white">
          <p className="text-xs font-medium text-[#d8d1c2]">Score</p>
          <p className="text-3xl font-semibold">{result.overallScore}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultStat label="Confidence" value={titleCase(result.classification.confidence)} />
        <ResultStat label="Handedness" value={titleCase(result.classification.handedness)} />
        <ResultStat label="Camera" value={titleCase(result.classification.orientation)} />
      </div>

      {result.classification.reasons.length ? (
        <Section title="Why the coach thinks so" icon={<Brain size={18} />}>
          <ul className="space-y-2 text-sm text-[#5d594f]">
            {result.classification.reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#245a3d]" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Top issues" icon={<AlertCircle size={18} />}>
        <div className="space-y-3">
          {result.topIssues.map((issue) => (
            <div key={issue.title} className="rounded-md border border-[#e5dfd3] bg-[#fbfaf7] p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#171713]">{issue.title}</h3>
                <span className="rounded-full bg-[#f0e5d1] px-2 py-1 text-xs font-semibold text-[#6c4b1b]">
                  {issue.priority}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#5d594f]">{issue.evidence}</p>
              <p className="mt-2 text-sm font-medium text-[#245a3d]">{issue.correction}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Phase breakdown" icon={<Activity size={18} />}>
        <div className="space-y-3">
          {result.phaseBreakdown.map((phase) => (
            <div key={phase.phase} className="grid gap-2 rounded-md border border-[#e5dfd3] p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#171713]">{titleCase(phase.phase)}</h3>
                <span className="text-xs font-semibold uppercase tracking-normal text-[#777064]">{phase.rating}</span>
              </div>
              <p className="text-sm text-[#5d594f]">{phase.diagnosis}</p>
              <p className="text-sm font-medium text-[#245a3d]">{phase.improvementCue}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Drills" icon={<Dumbbell size={18} />}>
        <div className="space-y-3">
          {result.drills.map((drill) => (
            <div key={drill.name} className="rounded-md border border-[#e5dfd3] bg-[#fbfaf7] p-3">
              <h3 className="font-semibold text-[#171713]">{drill.name}</h3>
              <p className="mt-1 text-sm text-[#5d594f]">{drill.purpose}</p>
              <p className="mt-2 text-sm font-medium text-[#245a3d]">{drill.instructions}</p>
            </div>
          ))}
        </div>
      </Section>

      {result.timestampedObservations.length ? (
        <Section title="Timestamped notes" icon={<Video size={18} />}>
          <div className="space-y-2">
            {result.timestampedObservations.map((observation) => (
              <div key={`${observation.time}-${observation.observation}`} className="flex gap-3 text-sm">
                <span className="font-semibold text-[#c84f31]">{observation.time}</span>
                <span className="text-[#5d594f]">{observation.observation}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {result.safetyNote ? <InlineWarning message={result.safetyNote} /> : null}
    </aside>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e5dfd3] bg-[#fbfaf7] p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-[#777064]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#171713]">{value}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-[#e5dfd3] pt-4">
      <div className="mb-3 flex items-center gap-2 text-[#245a3d]">
        {icon}
        <h2 className="text-lg font-semibold text-[#171713]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function titleCase(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

function formatMetric(value: number | null) {
  return value === null ? "n/a" : value.toFixed(2);
}
