import { cn } from '@/shared/lib/cn'
import { REGIME_BG, REGIME_COLOR, REGIME_LABEL } from '@/shared/lib/snapshots'
import type { Regime } from '@/shared/lib/snapshots'
import { RegimeIcon } from '@/shared/ui/RegimeIcon'

/**
 * 레짐 배지 (돌파성공 / 돌파준비 / 돌파실패 / 하방이탈 / 방향미정).
 *
 * `SnapshotCard` 안에 인라인으로 있던 것을 그대로 뽑았다 — 두 화면 이상이 쓰게 되면
 * 공용이어야 한다. 색은 `REGIME_COLOR`, 바탕은 `REGIME_BG` 가 정한다. 임의로 다른
 * 색을 주지 않는다 — 레짐마다 색이 «정해져» 있고 그 색이 곧 규약이다.
 *
 * 아이콘과 글자가 같은 값을 두 번 지므로, 색이 무너져도 판정이 남는다 (디자인 2장 ⑨).
 */
export function RegimeBadge({
  regime,
  className,
}: {
  regime: Regime
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3 py-[5px] text-[12px] font-bold whitespace-nowrap',
        className,
      )}
      style={{
        color: REGIME_COLOR[regime],
        borderColor: REGIME_COLOR[regime],
        background: REGIME_BG[regime],
      }}
    >
      <RegimeIcon regime={regime} width={18} height={14} />
      {REGIME_LABEL[regime]}
    </span>
  )
}
