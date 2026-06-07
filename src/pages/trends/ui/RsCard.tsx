/** RS — relative strength vs KOSPI, as two overlaid trend lines. */
export function RsCard() {
  return (
    <article className="card flex h-[350px] w-full flex-col px-[22px] py-5">
      <h3 className="text-[length:var(--mc-title)] font-bold text-white">RS</h3>
      <p className="mt-2.5 text-[length:var(--mc-sub)] text-white/55 before:content-['·_']">
        KOSPI 대비 얼마나 더 성과가 있는지를 의미합니다
      </p>

      <div className="mt-3.5 grid grid-cols-[auto_1fr] items-start gap-[18px]">
        <div className="flex flex-col gap-1.5 text-[length:var(--mc-label)] font-semibold">
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full border-2 border-white shadow-[0_3px_8px_rgba(0,0,0,0.4)]"
              style={{ background: '#9380F7' }}
            />
            SK하이닉스
          </span>
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full border-2 border-white shadow-[0_3px_8px_rgba(0,0,0,0.4)]"
              style={{ background: '#F25F33' }}
            />
            KOSPI
          </span>
        </div>
        <div className="font-number text-brand-red text-right text-[length:var(--mc-stat)] leading-none font-medium tracking-[-0.02em]">
          +12<span className="text-[length:var(--mc-stat-unit)]">%</span>
        </div>
      </div>

      <svg
        className="mt-2 block w-full"
        viewBox="0 0 720 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="rsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(242,95,51,0.45)" />
            <stop offset="100%" stopColor="rgba(242,95,51,0)" />
          </linearGradient>
        </defs>
        <path
          d="M0,150 C40,140 80,142 120,148 C160,153 200,148 240,128 C280,108 320,75 360,82 C400,92 440,115 480,118 C520,122 560,115 600,135 C640,153 680,153 720,140 L720,220 L0,220 Z"
          fill="url(#rsFill)"
        />
        <path
          d="M0,150 C40,140 80,142 120,148 C160,153 200,148 240,128 C280,108 320,75 360,82 C400,92 440,115 480,118 C520,122 560,115 600,135 C640,153 680,153 720,140"
          stroke="#F25F33"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M0,150 C30,124 60,108 100,98 C140,90 175,98 215,118 C250,134 280,110 320,75 C355,46 390,68 420,75 C455,86 490,68 525,60 C560,57 590,74 625,92 C660,108 685,114 720,108"
          stroke="#9380F7"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-auto flex items-baseline justify-end gap-2.5 pt-3.5">
        <span className="text-[length:var(--mc-label)] text-white/70">
          해당 기간 중 상위
        </span>
        <span className="font-number text-[length:var(--mc-foot-strong)] font-bold tracking-[-0.01em] text-white">
          8%
        </span>
      </div>
    </article>
  )
}
