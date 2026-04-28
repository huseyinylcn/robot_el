"use client";

export type RobotPose =
  | "idle"
  | "merhaba"
  | "bozkurt"
  | "yumruk"
  | "bir"
  | "iki"
  | "uc"
  | "dort";

type Props = {
  pose: RobotPose;
  className?: string;
};

/** Sağ el, avuç izleyiciye dönük: 0 serçe … 3 işaret, 4 başparmak (sağ kenar). */
const KNUCKLE_Y = 118;
const FINGER_BASE = [
  { x: 46, maxLen: 62, w: 13 },
  { x: 69, maxLen: 72, w: 14 },
  { x: 92, maxLen: 78, w: 15 },
  { x: 115, maxLen: 74, w: 14 },
] as const;

const THUMB = {
  cx: 154,
  cy: 156,
  maxLen: 52,
  w: 17,
  spreadDeg: 38,
};

export function RobotHandPreview({ pose, className = "" }: Props) {
  const wave = pose === "merhaba" || pose === "yumruk";

  return (
    <div
      className={`relative flex flex-col items-center justify-center ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/15 to-violet-600/20 blur-2xl" />
      <div
        className={`relative z-10 rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md sm:p-8 ${wave ? "animate-hand-wave" : ""}`}
      >
        <svg
          viewBox="0 0 200 268"
          className="h-52 w-44 sm:h-60 sm:w-52"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="skinMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94d8e8" />
              <stop offset="35%" stopColor="#67d4ee" />
              <stop offset="100%" stopColor="#7c86f9" />
            </linearGradient>
            <linearGradient id="palmShade" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
            </linearGradient>
            <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Başlık */}
          <rect
            x="14"
            y="10"
            width="172"
            height="32"
            rx="9"
            fill="url(#skinMetal)"
            opacity="0.28"
          />
          <text
            x="100"
            y="31"
            textAnchor="middle"
            fill="#e2e8f0"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}
          >
            ROBOT EL ÖNİZLEME
          </text>

          {/* Bilek — elin altı */}
          <path
            d="M 76 228 Q 100 222 124 228 L 118 258 Q 100 262 82 258 Z"
            fill="url(#skinMetal)"
            opacity="0.78"
            filter="url(#softGlow)"
          />

          {/* Avuç — parmaklar ÜSTTE bitecek */}
          <path
            d="M 38 128 
               C 38 118 44 108 54 102 
               Q 100 92 146 102 
               C 156 108 162 118 162 128
               L 158 212 
               Q 100 228 42 212 
               Z"
            fill="url(#skinMetal)"
            opacity="0.95"
            filter="url(#softGlow)"
          />
          <path
            d="M 38 128 
               C 38 118 44 108 54 102 
               Q 100 92 146 102 
               C 156 108 162 128 
               L 158 212 
               Q 100 228 42 212 
               Z"
            fill="url(#palmShade)"
            opacity="0.35"
          />

          {/* Parmak arası gölgeler (knuckle hattı) */}
          <line
            x1="56"
            y1={KNUCKLE_Y}
            x2="144"
            y2={KNUCKLE_Y}
            stroke="#0f172a"
            strokeOpacity="0.2"
            strokeWidth="1"
          />

          {/* Serçe … işaret */}
          {FINGER_BASE.map((f, i) => (
            <FourFinger
              key={i}
              baseX={f.x}
              maxLen={f.maxLen}
              width={f.w}
              pose={pose}
              index={i}
            />
          ))}

          {/* Başparmak — avuç kenarından dışa */}
          <Thumb pose={pose} />

          {/* LED */}
          <ellipse
            cx="100"
            cy="168"
            rx="5"
            ry="4"
            fill="#22d3ee"
            className="animate-pulse"
            opacity="0.9"
          />
        </svg>
        <p className="mt-3 text-center text-xs font-medium text-slate-400">
          {labelForPose(pose)}
        </p>
      </div>
    </div>
  );
}

function labelForPose(pose: RobotPose): string {
  const m: Record<RobotPose, string> = {
    idle: "Hazır — parmaklar açık",
    merhaba: "Merhaba",
    bozkurt: "Bozkurt",
    yumruk: "Yumruk (görsel: merhaba dalgası)",
    bir: "Bir",
    iki: "İki",
    uc: "Üç",
    dort: "Dört",
  };
  return m[pose];
}

function FourFinger({
  baseX,
  maxLen,
  width,
  pose,
  index,
}: {
  baseX: number;
  maxLen: number;
  width: number;
  pose: RobotPose;
  index: number;
}) {
  const raised = isFingerRaised(pose, index);
  const curled =
    !raised && pose !== "idle" && pose !== "merhaba" && pose !== "yumruk";

  let len = maxLen * 0.92;
  let tilt = (index - 1.5) * 4;

  if (curled) {
    len = maxLen * 0.32;
    tilt += 22;
  } else if (!raised && pose !== "idle" && pose !== "merhaba" && pose !== "yumruk") {
    len = maxLen * 0.38;
    tilt += 18;
  }

  const opacity =
    raised || pose === "idle" || pose === "merhaba" || pose === "yumruk"
      ? 1
      : 0.58;

  return (
    <g
      transform={`rotate(${tilt}, ${baseX}, ${KNUCKLE_Y})`}
      className="transition-all duration-300 ease-out"
    >
      <rect
        x={baseX - width / 2}
        y={KNUCKLE_Y - len}
        width={width}
        height={len}
        rx={width / 2}
        fill="url(#skinMetal)"
        opacity={opacity}
        filter="url(#softGlow)"
      />
    </g>
  );
}

function Thumb({ pose }: { pose: RobotPose }) {
  const raised = isFingerRaised(pose, 4);
  const curled =
    !raised && pose !== "idle" && pose !== "merhaba" && pose !== "yumruk";

  let len = THUMB.maxLen * 0.88;
  let ang = THUMB.spreadDeg;

  if (curled) {
    len = THUMB.maxLen * 0.35;
    ang = 12;
  } else if (!raised && pose !== "idle" && pose !== "merhaba" && pose !== "yumruk") {
    len = THUMB.maxLen * 0.4;
    ang = 18;
  }

  const opacity =
    raised || pose === "idle" || pose === "merhaba" || pose === "yumruk"
      ? 1
      : 0.58;

  return (
    <g
      transform={`rotate(${ang}, ${THUMB.cx}, ${THUMB.cy})`}
      className="transition-all duration-300 ease-out"
    >
      <rect
        x={THUMB.cx - THUMB.w / 2}
        y={THUMB.cy - len}
        width={THUMB.w}
        height={len}
        rx={THUMB.w / 2}
        fill="url(#skinMetal)"
        opacity={opacity}
        filter="url(#softGlow)"
      />
    </g>
  );
}

function isFingerRaised(pose: RobotPose, index: number): boolean {
  if (pose === "idle" || pose === "merhaba" || pose === "yumruk") return true;
  if (pose === "bozkurt") return index === 0 || index === 4;
  if (pose === "bir") return index === 3;
  if (pose === "iki") return index === 2 || index === 3;
  if (pose === "uc") return index === 1 || index === 2 || index === 3;
  if (pose === "dort") return index <= 3;
  return true;
}
