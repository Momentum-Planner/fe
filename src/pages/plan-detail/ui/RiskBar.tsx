import { cn } from '@/shared/lib/cn'

/**
 * 계좌 총 위험노출 막대 — 이 화면의 «결론»이다.
 *
 * ⚠️ **계획 하나의 값이 아니라 계좌 전체의 값이다.** 그래서 맨 위에 선다 —
 *    계획이 들어갈 «자리»를 말하는 값이지 계획의 결과가 아니다.
 *
 * 왜 숫자 둘을 화살표로 잇지 않고 막대인가 —
 * *"막대만 있으면 잴 상대가 없어 판정이 안 된다. 참조선을 그으면 막대 끝과
 *   선의 위아래가 곧 판정"* (디자인 4장 ①). 「3.65%」는 그 자체로 높은지 낮은지
 * 말하지 않는다. 1% · 2.5% 를 그어야 말한다.
 *
 * ⚠️ **폭은 필요 없다.** 한때 이걸 전폭으로 뒀는데 4장 ①을 잘못 읽은 것이었다 —
 *    폭이 판정을 정확하게 만드는 것은 «막대가 여럿»이거나 «눈금이 촘촘할» 때다.
 *    여기는 막대 하나에 눈금 둘이라 좌우 관계만 보이면 끝난다.
 *
 * 구조는 4장 ④의 목표 일정 차트를 그대로 옮긴 것이다 —
 *   막대(지금)  +  연장분(이 계획이 얹는 몫)  +  선 둘(구간 경계)
 *
 * **막대가 하나인 이유** — 종목의 「지금」과 계획의 「후」가 같은 축 위의 값이라
 * 카드를 둘로 나누면 «같은 축»을 두 번 그리게 된다. 하나가 둘 다 진다.
 *
 * 색만으로 판정하지 않는다 — 2.5 를 넘으면 ⚠ 가 붙는다 (2장 ⑨).
 */

/** 구간 경계 (④-1-3). 넷 다 2.5% 이상 안 건다 */
const WARN = 2.5
const MID = 1

/** 축의 오른쪽 끝. 값이 커지면 따라 늘어나되 경계 둘은 «항상» 화면에 남는다 */
const axisMax = (v: number) =>
  Math.max(WARN * 1.35, Math.ceil(v * 1.25 * 2) / 2)

export function RiskBar({ before, after }: { before: number; after: number }) {
  const max = axisMax(Math.max(before, after))
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`

  // 매도 계획이면 위험이 «줄어든다». 늘어나는 쪽과 색이 달라야 방향이 읽힌다
  const grew = after >= before
  const solid = grew ? before : after
  const ghostFrom = grew ? before : after
  const ghostTo = grew ? after : before
  const over = after > WARN

  return (
    <div>
      {/* 숫자가 «먼저» 온다 — 결론이고, 막대는 그 결론이 어디쯤인지를 말하는 근거다
          (디자인 9장 ⑨ — 행 왼쪽의 콜아웃) */}
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold text-white/55">
          계좌 총 위험노출
        </span>
        <span className="font-number ml-auto flex items-baseline gap-1.5 text-[15px]">
          <span className="text-white/45">{before.toFixed(2)}%</span>
          <span className="text-white/25">→</span>
          <span
            className={cn('font-bold', over ? 'text-brand-red' : 'text-white')}
          >
            {after.toFixed(2)}%
          </span>
        </span>
      </div>

      {/* 막대는 «얇다». 두께가 정확도를 만들지 않는다 — 막대 끝과 선의 좌우 관계가
          판정이고(4장 ①), 스티븐 퓨의 불릿 차트도 원래 가는 띠다 (1장 ⑥) */}
      <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {/* 연장분(또는 감소분)을 «먼저» 깐다. 진한 막대가 그 위에 올라탄다 */}
        <div
          className={cn(
            'absolute inset-y-0',
            grew
              ? over
                ? 'bg-brand-red/40'
                : 'bg-white/25'
              : 'bg-brand-blue/25',
          )}
          style={{ left: pct(ghostFrom), width: pct(ghostTo - ghostFrom) }}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0',
            over && grew ? 'bg-brand-red' : 'bg-white/50',
          )}
          style={{ width: pct(solid) }}
        />
        {/* 참조선 둘. 이것이 없으면 막대 길이는 아무 말도 안 한다 */}
        <Tick at={pct(MID)} />
        <Tick at={pct(WARN)} strong />
      </div>

      <div className="relative mt-1 h-3">
        <Label at={pct(MID)}>1%</Label>
        <Label at={pct(WARN)} strong>
          2.5%
        </Label>
        {over && (
          <span className="text-brand-red absolute right-0 text-[11px]">
            ⚠ 2.5% 초과
          </span>
        )}
      </div>
    </div>
  )
}

const Tick = ({ at, strong }: { at: string; strong?: boolean }) => (
  <div
    aria-hidden
    className={cn(
      'absolute inset-y-0 w-px',
      strong ? 'bg-white/45' : 'bg-white/20',
    )}
    style={{ left: at }}
  />
)

const Label = ({
  at,
  strong,
  children,
}: {
  at: string
  strong?: boolean
  children: React.ReactNode
}) => (
  <span
    className={cn(
      'font-number absolute -translate-x-1/2 text-[10px]',
      strong ? 'text-white/45' : 'text-white/25',
    )}
    style={{ left: at }}
  >
    {children}
  </span>
)
