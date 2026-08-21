import { Pill } from '@/shared/ui/Pill'

/** 모멘텀 — ~1y price-rise headline stat with from→to price pills. */
export function MomentumCard() {
  return (
    <article className="card flex h-[350px] w-full flex-col px-[22px] py-5">
      <h3 className="text-[length:var(--mc-title)] font-bold text-white">
        모멘텀
      </h3>
      <p className="mt-2.5 text-[length:var(--mc-sub)] text-white/55 before:content-['·_']">
        약 1년기간의 주식 가격 상승폭을 의미합니다.
      </p>
      <div className="font-number text-brand-red mt-10 pr-1.5 text-right text-[length:var(--mc-stat)] leading-none font-medium tracking-[-0.02em]">
        +28.4<span className="text-[length:var(--mc-stat-unit)]">%</span>
      </div>

      <div className="mt-auto flex items-center gap-2.5">
        <Pill variant="outline">₩ 52,000</Pill>
        <span className="relative h-px max-w-10 flex-1 bg-white/55 after:absolute after:-top-1 after:right-[-1px] after:border-[5px] after:border-transparent after:border-l-white/55 after:content-['']" />
        <Pill variant="red">₩ 67,000</Pill>
      </div>
      <div className="font-number mt-1.5 flex max-w-[200px] justify-between text-[length:var(--mc-date)] text-white/50">
        <span>25.03.13</span>
        <span>26.03.14</span>
      </div>
      <p className="mt-3.5 text-[length:var(--mc-foot)] text-white">
        &ldquo;지난 1년간 강한 가격 상승이 나타났습니다&rdquo;
      </p>

      <div className="mt-auto flex items-baseline justify-end gap-2 pt-3.5 text-[length:var(--mc-foot)] text-white/60">
        해당 기간 중 상위
        <b className="font-number ml-1.5 text-[length:var(--mc-foot-strong)] font-bold text-white">
          12%
        </b>
      </div>
    </article>
  )
}
