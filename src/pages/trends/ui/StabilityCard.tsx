/** 흐름 안정도 — consistency of momentum, shown as a 180° up/down gauge. */
export function StabilityCard() {
  return (
    <article className="card flex h-[350px] w-full flex-col px-[22px] py-5">
      <h3 className="text-[length:var(--mc-title)] font-bold text-white">
        흐름 안정도
      </h3>
      <p className="mt-2.5 text-[length:var(--mc-sub)] text-white/55 before:content-['·_']">
        모멘텀이 얼마나 일관성있었는지를 의미합니다
      </p>
      <div className="font-number text-brand-red mt-3.5 pr-1.5 text-right text-[length:var(--mc-stat)] leading-none font-medium tracking-[-0.02em]">
        0.43
      </div>

      <svg
        className="mx-auto mt-3.5 block w-full max-w-[340px]"
        viewBox="0 0 244 148"
        aria-hidden="true"
      >
        <path
          d="M 42 102 A 80 80 0 0 1 171.3 38.96"
          fill="none"
          stroke="#FF3636"
          strokeWidth="44"
        />
        <path
          d="M 171.3 38.96 A 80 80 0 0 1 202 102"
          fill="none"
          stroke="#34ADE4"
          strokeWidth="44"
        />
        <text
          x="42"
          y="128"
          textAnchor="middle"
          fontFamily="DM Sans"
          fontWeight="500"
          fontSize="18"
          fill="#FF3636"
        >
          180
        </text>
        <text
          x="42"
          y="144"
          textAnchor="middle"
          fontFamily="Pretendard, sans-serif"
          fontSize="11"
          fill="#FF3636"
        >
          상승 일 수
        </text>
        <text
          x="202"
          y="128"
          textAnchor="middle"
          fontFamily="DM Sans"
          fontWeight="500"
          fontSize="18"
          fill="#34ADE4"
        >
          72
        </text>
        <text
          x="202"
          y="144"
          textAnchor="middle"
          fontFamily="Pretendard, sans-serif"
          fontSize="11"
          fill="#34ADE4"
        >
          하락 일 수
        </text>
      </svg>

      <div className="mt-auto flex items-baseline justify-end gap-2 pt-3.5 text-[length:var(--mc-foot)] text-white/60">
        해당 기간 중 상위
        <b className="font-number ml-1.5 text-[length:var(--mc-foot-strong)] font-bold text-white">
          12%
        </b>
      </div>
    </article>
  )
}
