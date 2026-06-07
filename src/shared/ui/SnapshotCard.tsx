import { Link } from '@tanstack/react-router'
import {
  JUDGMENT_LABEL,
  JUDGMENT_STYLE,
  REGIME_BG,
  REGIME_COLOR,
  REGIME_LABEL,
} from '@/shared/lib/snapshots'
import type { Snapshot } from '@/shared/lib/snapshots'
import { RegimeIcon } from '@/shared/ui/RegimeIcon'

/**
 * A saved-snapshot card (내 스냅샷 / 종목 상세 지난 스냅샷). Clicking opens the edit view.
 */
export function SnapshotCard({ snap }: { snap: Snapshot }) {
  const j = JUDGMENT_STYLE[snap.judgment]
  return (
    <Link
      to="/snapshots/edit"
      className="flex h-[176px] shrink-0 flex-col justify-between gap-4 rounded-[14px] border-[1.5px] border-transparent bg-[#181818] px-[22px] py-5 transition hover:-translate-y-0.5 hover:border-white/[0.12]"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="truncate text-[22px] leading-tight font-bold text-white">
            {snap.stock}
          </div>
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3 py-[5px] text-[12px] font-bold whitespace-nowrap"
            style={{
              color: REGIME_COLOR[snap.regime],
              borderColor: REGIME_COLOR[snap.regime],
              background: REGIME_BG[snap.regime],
            }}
          >
            <RegimeIcon regime={snap.regime} width={18} height={14} />
            {REGIME_LABEL[snap.regime]}
          </span>
        </div>
        <span
          className="shrink-0 rounded-full border-[1.5px] px-3.5 py-1 text-[13px] font-bold whitespace-nowrap"
          style={{ color: j.text, background: j.bg, borderColor: j.border }}
        >
          {JUDGMENT_LABEL[snap.judgment]}
        </span>
      </div>
      <p className="m-0 line-clamp-2 text-[12px] leading-relaxed text-white/55">
        {snap.memo}
      </p>
      <div className="flex items-center justify-between gap-3.5">
        <span className="font-number text-[14px] font-medium whitespace-nowrap text-white/50">
          {snap.date}
        </span>
        <div
          className="font-number text-[30px] leading-none font-bold tracking-[-0.02em]"
          style={{ color: j.text }}
        >
          {snap.price}
        </div>
      </div>
    </Link>
  )
}
