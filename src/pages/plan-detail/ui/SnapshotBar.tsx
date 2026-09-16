import type { PlanSnapshot } from '@/entities/plan'
import { cn } from '@/shared/lib/cn'
import { GATE_BG, GATE_COLOR, entryGate } from '@/shared/lib/snapshots'

/**
 * ④-0 진입 시점 스냅샷 — **사후에 못 만든다** (F1 목록의 F4).
 *
 * 왜 «차트 위»인가 —
 *   ⓐ 보조지표 패널은 차트 헤더에서 «아래로» 열리는 560px 팝오버다. 스냅샷을
 *      차트 밑에 두면 지표를 만질 때마다 그 팝오버가 스냅샷을 덮는다.
 *      트렌드 8조건을 «눈으로» 확인하려고 지표를 켜는 것인데, 가려지는 것이
 *      바로 그 답을 든 줄이다 (교재 9장 패턴 64 — 창이 그래픽을 가리면 안 된다).
 *   ⓑ 하단 지표(RSI·MACD)를 켜면 차트가 아래로 자란다. 밑에 두면 지표 하나
 *      켤 때마다 스냅샷이 밀려 내려간다. 사슬을 차트 «위»에 둔 것과 같은 이유다.
 *
 * ⚠️ 여기 있는 것은 **계획 하나의 값이 아니라 그날 종목의 값**이다. 그래서
 *    계획 레일이 아니라 차트 쪽(좌측)에 선다 — 후보 선이 종목의 값인 것과 같다.
 *    좌측이 「집중하기」(종목 하나), 우측이 「수행하기」(계획)로 갈린다 (교재 2장).
 *
 * **부호화** — 정상값은 눈에 안 띄게, 어긋난 것만 튀게 (교재 9장 「전주의적 변수」).
 * 8/8 통과·훼손 0 이면 한 줄로 조용히 끝나고, 어긋난 것에만 색조와 ⚠ 가 붙는다.
 * 항목이 열다섯으로 보이던 것은 개수가 아니라 부호화가 없어서였다.
 */
/**
 * 툴팁 문안 — **한두 줄을 넘기지 않는다.** 넘어가면 전체를 무시하게 된다
 * (교재 10장 패턴 73). 여기 있는 것은 «용어의 뜻»이고, 방법론 자체(돌파·베이스·
 * VCP·R)는 이 화면이 가르칠 것이 아니다 — 계획 세부는 「수행하기」 화면이라
 * 여기서 트레이딩을 가르치면 계획도 못 세우고 배우지도 못한다 (교재 2장).
 *
 * ⚠️ 문안은 **CLAUDE.md 궤적과 타입 주석에서만** 옮겼다. 지어낸 정의가 없다.
 *    모자란 것은 아래 「아직 못 쓴 것」에 남겼다.
 */
const HINT = {
  snapshot:
    '계획을 세운 날의 배치 판정. 그날 값 그대로 남아 나중에 안 변한다 — 사후에는 못 만든다.',
  gate: '지금 살 수 있는가, 살 수 있다면 어떤 진입인가 — 조기 · 돌파 · 눌림. 못 사면 그 뒤가 못 사는 까닭이다.',
  entryPosition: '피봇 대비 지금 가격이 어디 있는가. 위면 +, 아래면 −.',
  fundamental:
    '펀더멘털 점수 0~7. 수준 · 방향 · 동반 셋을 본다. 후보를 줄 세우는 값이다.',
  trend:
    '트렌드 템플릿 8조건 중 통과한 개수. 스크리너 게이트가 8/8 을 요구한다.',
  damage:
    '추세 훼손 신호 — 0~2. 장중에 «올라가기만» 한다. 이 값만 마감 후 배치가 아니라 실시간으로 찍힌다.',
} as const

export function SnapshotBar({ snap }: { snap: PlanSnapshot }) {
  const trendOff = snap.trendFailed.length > 0
  const hurt = snap.damageScore > 0
  const gate = entryGate(snap.entryState, snap.regime)

  return (
    <div className="mb-2.5 border-b border-white/[0.06] px-1 pb-2.5">
      {/* 고정 항목 여덟이 앞줄, 길이를 모르는 「어긋난 조건 이름」만 뒤로 내린다.
          💀 앞줄을 `whitespace-nowrap` 으로 한 줄에 묶었더니 폭이 모자라
             트렌드·훼손이 «잘려» 사라졌다. 감출 값이 아니다 — 접게 둔다.
          접히는 자리는 항목이 고정이라 계획을 바꿔도 안 변한다. 계획마다
          길이가 달라지던 것은 조건 이름뿐이고 그건 아래로 뺐다. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {/* 제목을 붙인 섹션 (교재 4장 패턴 29) — 제목이 「그날의 판정」임을 말한다.
          날짜가 제목에 붙는 이유: 이 값들이 «오늘»이 아니라 그날 배치의 것이다 */}
        <Hint text={HINT.snapshot}>
          <span className="text-[11px] font-bold tracking-wide text-white/45">
            진입 시점
          </span>
        </Hint>
        <span className="font-number text-[11px] text-white/35">
          {snap.date} 판정
        </span>

        {/* ── 진입 관문 — **레짐과 진입 상태를 한 뱃지로 섞었다** ────────
            섞는 규칙은 `entryGate` 에 있다. 「살 수 있나」가 앞에 서고
            「어떤 진입인가 / 왜 못 사나」가 뒤에 온다 — 읽는 순서가 판단 순서다.
            앞머리는 흐리게, 뒤가 진하다: 앞은 어느 쪽인지만 말하고
            «무엇인지»를 말하는 것은 뒤다. */}
        <Hint text={HINT.gate}>
          <span
            className="rounded-pill px-2 py-0.5 text-[11px] font-bold"
            style={{
              background: gate.ok ? GATE_BG.ok : GATE_BG.no,
              color: gate.ok ? GATE_COLOR.ok : GATE_COLOR.no,
            }}
          >
            <span className="font-normal opacity-60">{gate.head}</span>
            <span className="opacity-40"> · </span>
            {gate.detail}
          </span>
        </Hint>

        <Cell label="진입 위치" hint={HINT.entryPosition}>
          {snap.entryPosition > 0 ? '+' : ''}
          {snap.entryPosition.toFixed(1)}%
        </Cell>

        {/* 0~7. 상한이 어디인지는 아직 «안 정한» 값이라 분모만 적는다 */}
        <Cell label="펀더멘털" hint={HINT.fundamental}>
          {snap.fundamentalScore}
          <span className="text-white/30">/7</span>
        </Cell>

        {/* 트렌드 8조건 — 8/8 이면 여기서 끝난다. 어긋난 것만 «이름»으로 잇는다.
          8칸 도트를 안 쓰는 이유는 타입 주석에 있다 (「세 번째 칸이 왜 비었나」) */}
        <Cell
          label="트렌드"
          hint={HINT.trend}
          tone={trendOff ? 'warn' : undefined}
        >
          {trendOff && <span aria-hidden>⚠ </span>}
          {snap.trendPassed}
          <span className={trendOff ? 'text-warning/50' : 'text-white/30'}>
            /8
          </span>
        </Cell>

        {/* 훼손 점수 0~2. ⚠️ **이 값만 출처가 다르다** — ⑤-3 가 장중 실시간으로
          찍는다. 그래서 «시각»이 붙는다. 날짜가 다른 값에만 날짜를 붙인다.

          💀 **분모를 뗐다.** 「0/2」로 쓰면 옆의 「5/7」·「8/8」과 형식이 같아
             방향까지 같다고 읽힌다 — 펀더멘털·트렌드는 «높을수록», 훼손은
             «낮을수록» 좋은데 화면은 셋을 똑같이 생긴 분수로 내놓고 있었다.
             용어를 몰라서가 아니라 부호화가 거짓말을 한 것이다.
             0 이면 「없음」이라는 «말»로 끝낸다 — 분수가 아니면 견주지 않는다. */}
        <Cell label="훼손" hint={HINT.damage} tone={hurt ? 'bad' : undefined}>
          {hurt ? (
            <>
              <span aria-hidden>⚠ </span>
              {snap.damageScore === 2 ? '둘 다' : '하나'}
              <span className="ml-1.5 text-[11px] font-normal text-white/45">
                {snap.damageAt}
              </span>
            </>
          ) : (
            <span className="font-text text-white/45">없음</span>
          )}
        </Cell>
      </div>

      {/* 둘째 줄 — 어긋난 조건의 «이름». 8/8 이면 이 줄 자체가 없다 */}
      {trendOff && (
        <div className="text-warning mt-1 truncate pl-1 text-[11px]">
          {snap.trendFailed.join(' · ')}
        </div>
      )}
    </div>
  )
}

/** 값 한 칸 — 레이블은 작고 흐리게, 값이 그 옆에 붙는다 (근접성) */
function Cell({
  label,
  hint,
  tone,
  children,
}: {
  label: string
  hint?: string
  tone?: 'warn' | 'bad'
  children: React.ReactNode
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <Hint text={hint}>
        <span className="text-[11px] text-white/35">{label}</span>
      </Hint>
      <span
        className={cn(
          'font-number text-[12px] font-bold tabular-nums',
          tone === 'warn' && 'text-warning',
          tone === 'bad' && 'text-brand-red',
          !tone && 'text-white/80',
        )}
      >
        {children}
      </span>
    </span>
  )
}

/**
 * 용어 힌트 — **레이블에만 붙는다.** 값에 붙이면 매번 읽히지만 레이블은 한 번
 * 배우면 안 읽는다 (교재 1장 — 기초를 빠르게 습득하고 그 뒤로는 학습하지 않는다).
 *
 * 점선 밑줄이 「여기 뭔가 더 있다」를 말한다. 아이콘을 쓰지 않은 이유 — 칸이
 * 여섯이라 물음표를 여섯 개 달면 그게 화면의 중심점이 된다 (교재 4장).
 *
 * ⚠️ **접히는 패널 안에 넣지 않는다** — 패널을 인지 못 한 사용자는 그 안의
 *    도움말도 못 본다 (교재 2장 패턴 11).
 * ⚠️ 모바일에 호버가 없다. 탭으로 바꾸는 것은 «아직 안 정했다».
 */
function Hint({
  text,
  children,
}: {
  text?: string
  children: React.ReactNode
}) {
  if (!text) return <>{children}</>
  return (
    <span className="group relative inline-flex">
      <span className="cursor-help border-b border-dotted border-white/25">
        {children}
      </span>
      <span
        role="tooltip"
        className="shadow-pop pointer-events-none absolute top-full left-0 z-50 mt-1.5 hidden w-[230px] rounded-lg border border-white/10 bg-[#141414] px-2.5 py-2 text-[11px] leading-[1.5] font-normal text-white/70 group-hover:block"
      >
        {text}
      </span>
    </span>
  )
}
