import { cn } from '@/shared/lib/cn'
import { RiskBar } from './RiskBar'
import { clampExposure, needCash, ownRisk, stopWidthPct } from '@/entities/plan'
import type { PlanDefaults } from '@/entities/plan'
import type { useNewPlan } from './useNewPlan'

/**
 * 새 계획을 쓰는 자리 — **세부가 서 있던 그 칸을 그대로 쓴다.**
 *
 * 💀 처음엔 세부 «위에» 칸을 하나 덧붙였다. 이 열이 392px 이라 6칸짜리 폼이
 * 눌려서 제대로 안 보였고, 아래 내용을 밀어내는 바람에 **쓰는 동안 정작 근거가
 * 화면 밖으로** 나갔다. 한 자리에 하나만 세우면 둘 다 없어진다.
 *
 * 그리고 **쓰는 모양이 곧 될 모양이다** — 세부의 1층과 같은 두 칸 격자를 쓰므로
 * 세우고 나서 배울 것이 없다.
 *
 * ⚠️ 위험노출은 **여기서도 계산된다** (④-1). 수량을 넣는 동안 그 수량이 계좌를
 *    몇 % 거는지가 같이 움직여야 «보고 정한다»가 성립한다 (디자인 9장 ④).
 *    다만 실행 «전» 값은 부모 계획의 것을 쓴다 — 아직 내 스냅샷이 없다.
 */
const won = (n: number) => n.toLocaleString('ko-KR')

export function NewPlanForm({
  born,
  defaults,
  picking,
  onPicking,
}: {
  born: ReturnType<typeof useNewPlan>
  /**
   * 계좌 · 통계 · 종목에서 오는 값들.
   *
   * 💀 이걸 «이어받는 계획»에서 읽고 있었다. 그러면 계획이 하나도 없는 종목에서
   * 계획을 못 세운다 — 첫 계획이 제일 필요한 자리인데. 셋 다 원래 계획의 값이
   * 아니다(계좌 총액은 계좌가, 상한은 ⑦ 통계가, 후보 선은 종목이 든다).
   */
  defaults: PlanDefaults
  /** 지금 차트에서 집는 중인 칸 */
  picking: 'entry' | 'stop' | null
  onPicking: (v: 'entry' | 'stop' | null) => void
}) {
  const d = born.draft
  if (!d) return null

  const width = stopWidthPct(d.entryPrice, d.stopPrice)
  const cash = needCash(d.entryPrice, d.quantity)
  const own = ownRisk(
    d.entryPrice,
    d.stopPrice,
    d.quantity,
    defaults.accountTotal,
  )
  // 위험노출에 음수가 없다 — 0 이 바닥이다 (③-2 를 한 칸 뒤집는다)
  const after = clampExposure(defaults.riskBefore + own)
  // 매수로 고정이라 현금 검사는 늘 돈다 (④-1-3)
  const overCash = cash > defaults.accountCash

  return (
    <section className="card min-w-0 px-5 py-4">
      {/* 머리줄 — 세부와 «같은 자리»에 같은 모양으로 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="bg-brand-blue/15 text-brand-blue rounded-md px-2 py-0.5 text-[11px] font-bold">
          새 계획
        </span>
        <input
          value={d.title}
          onChange={(e) => born.set('title', e.target.value)}
          autoFocus
          placeholder="계획 이름"
          className="bg-bg-input w-[200px] rounded-md px-2 py-0.5 text-[15px] font-bold text-white outline-none placeholder:font-normal placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Btn onClick={born.submit} disabled={!born.ready || born.pending} go>
            {born.pending ? '만드는 중…' : '생성'}
          </Btn>
          <Btn onClick={born.cancel}>취소</Btn>
        </div>
      </div>

      {/* ⚠️ 「무엇을 이어받는다」를 **글로 안 적는다.** 사슬이 그 일을 이미
          하고 있다 — 새 마디가 «어디에 붙는지»가 자리로 보이고, 쓰는 동안
          그 자리가 「쓰는 중」으로 켜진다. 글로 또 적으면 같은 말이 두 번이고,
          칸의 맨 위(제일 먼저 읽히는 자리)를 설명이 먹는다. */}

      {/* ── 위험노출 — **맨 위, 오른쪽.** ────────────────────────────────
          아래에서 무엇을 넣든 «결과»가 여기로 온다. 결론이 먼저 오고 근거가
          따라오는 순서다 (디자인 9장 ⑨ — 행 왼쪽의 콜아웃).
          입력 밑에 두면 수량을 고치는 동안 눈이 위아래로 오간다. */}
      <div className="mt-2.5 rounded-[10px] bg-white/[0.04] px-3.5 py-3">
        <RiskBar before={defaults.riskBefore} after={after} />
      </div>

      {/* ── 「얼마에 얼마나」 — 한 줄 ────────────────────────────────────
          진입가와 수량은 **같은 판단의 두 쪽**이다. 얼마에 사느냐가 정해져야
          몇 주가 얼마인지 나오고, 둘이 곱해져 필요 현금이 된다.
          스톱가격은 «다른 판단»이라 아래로 뗀다 — 그건 「어디서 자를까」다. */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field
          label="진입 예상가"
          hint="차트를 눌러서 집는다"
          num={d.entryPrice}
          onNum={(n) => born.set('entryPrice', n)}
          picking={picking === 'entry'}
          onPick={() => onPicking(picking === 'entry' ? null : 'entry')}
        />
        <Field
          label="수량"
          hint={cash > 0 ? `필요 현금 ${won(cash)}` : '버림 — 상한을 안 넘는다'}
          num={d.quantity}
          onNum={(n) => born.set('quantity', n)}
          block={
            overCash
              ? `✕ 현금 ${won(defaults.accountCash)} 보다 ${won(cash - defaults.accountCash)} 크다`
              : undefined
          }
        />
      </div>

      {/* ── 스톱가격 — **따로 선다** ────────────────────────────────────
          「어디서 자를까」는 「얼마에 얼마나」와 다른 판단이고, 고를 후보가
          딸려 있어 칸 하나로 안 끝난다 (④-1-1-2). */}
      <div className="mt-2 rounded-[10px] bg-white/[0.04] px-3 py-2.5">
        <div className="grid grid-cols-2 items-end gap-2">
          <Field
            label="스톱가격"
            hint={
              d.entryPrice > 0 && d.stopPrice > 0
                ? `1R ${won(d.entryPrice - d.stopPrice)} · ${width.toFixed(2)}%`
                : '진입가 아래 어느 선에'
            }
            num={d.stopPrice}
            onNum={(n) => born.set('stopPrice', n)}
            picking={picking === 'stop'}
            onPick={() => onPicking(picking === 'stop' ? null : 'stop')}
            warn={
              width > defaults.stopLimit
                ? `⚠ 상한 ${defaults.stopLimit}% 초과`
                : undefined
            }
          />
          {/**
           * 손절폭 상한 — **생성과 수정에서만 뜬다.** 읽는 화면에는 없다.
           *
           * 고를 때 쓰는 선이다 (④-1-1-2 — `min(평균수익 ÷ 손익비, 10%)`).
           * 정하는 것이 차트가 아니라 **내 평균 수익**이라, 어디까지 내려갈 수
           * 있는지를 «지금 정하는 사람»만 알면 된다. 이미 정해진 값을 보는
           * 자리에서는 상한이 아무 일도 안 한다.
           */}
          <div className="pb-1 text-right text-[10px] leading-tight">
            <span className="text-white/45">상한 {defaults.stopLimit}%</span>
            <div className="text-white/25">
              {defaults.stopLimitBasis
                ? `평균수익 ${defaults.stopLimitBasis.avgWin}% ÷ 손익비 ${defaults.stopLimitBasis.targetRR}`
                : '통계 없음 — 10%'}
            </div>
          </div>
        </div>

        {/* 후보 선 — **서비스가 하나를 정해 주지 않는다.** 늘어놓고 고르게 한다.
            ⚠️ 새 계획은 아직 스냅샷이 없어 «이어받는 계획»의 후보를 쓴다 —
               후보는 이동평균선·저항선이라 계획이 아니라 «종목»의 값이다

            💀 상한 초과를 «흐림»으로 말했었다. 그런데 이 앱에서 흐림은 이미
               「못 누른다」다 (아래 `Btn` 의 `disabled:opacity-40`). 같은 변수가
               한 화면에서 두 뜻을 지면 관례가 이긴다 — 넘는 선이 «막힌» 것처럼
               읽혔다. 막지 않는 것이 이 서비스의 전제이므로 흐림을 걷고
               **색조 + ⚠** 로 옮겼다 (교재 9장 「전주의적 변수」).
               색만으로 판정하지 않는다 — `RiskBar` 가 2.5% 에 ⚠ 를 붙이는 것과 같다. */}
        <div className="mt-1.5 flex flex-col gap-0.5 border-t border-white/[0.06] pt-1.5">
          {defaults.stopCandidates
            // 이어받는 계획이 «직접 넣은 값»을 썼으면 그건 그 계획의 선택이지
            // 이 종목의 선이 아니다 — 새 계획의 후보로 내려오면 안 된다
            // ⚠️ 「스톱 하한 N%」는 N 이 사용자마다 달라 이름이 고정이 아니다
            .filter(
              (c) =>
                c.label !== '직접 넣은 값' && !c.label.startsWith('스톱 하한'),
            )
            .map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => born.set('stopPrice', c.price)}
                aria-label={`${c.label} ${won(c.price)} 손절폭 ${c.width}%${
                  c.overLimit ? ' · 상한 초과' : ''
                }`}
                className={cn(
                  'grid grid-cols-[110px_1fr_64px] items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] hover:bg-white/[0.10]',
                  c.price === d.stopPrice && 'bg-white/[0.09]',
                )}
              >
                <span
                  className={
                    c.price === d.stopPrice ? 'text-white' : 'text-white/50'
                  }
                >
                  {c.label}
                </span>
                <span className="font-number text-right text-white/80 tabular-nums">
                  {won(c.price)}
                </span>
                <span
                  className={cn(
                    'font-number flex items-center justify-end gap-0.5 tabular-nums',
                    c.overLimit ? 'text-warning' : 'text-white/40',
                  )}
                >
                  {c.overLimit && <span aria-hidden>⚠</span>}−{c.width}%
                </span>
              </button>
            ))}
        </div>

        {/**
         * 스톱 갱신 규칙 셋 — **스톱가격과 같이 선다**. 세부 화면과 같은 자리다.
         *
         * ④-1-4 가 *「직전 값이 채워져 있다. 안 고치면 그대로 유지된다」* 라
         * **이어받아 오되 고칠 수 있다.** 진입가·스톱가격·수량과 반대다 —
         * 그쪽은 «판단»이라 매번 새로 하고, 이쪽은 «규칙»이라 이어진다.
         *
         * **꺼둔 규칙도 자리를 지킨다** (③-3-1) — 무엇을 껐는지가 사라지면 잊는다.
         */}
        <div className="mt-2 border-t border-white/[0.06] pt-2">
          <div className="mb-1.5 text-[10px] text-white/40">
            스톱 갱신 규칙{' '}
            <span className="text-white/25">— 이어받은 값. 고칠 수 있다</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 스톱 상향은 «임계 R» 을 같이 고른다 — 켬/끔만으로는 안 된다 */}
            <Sw
              on={d.raiseAtR != null}
              onClick={() =>
                born.set('raiseAtR', d.raiseAtR == null ? 2 : null)
              }
            >
              스톱 상향
            </Sw>
            {d.raiseAtR != null &&
              [2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => born.set('raiseAtR', r)}
                  className={cn(
                    'font-number rounded-md px-2 py-0.5 text-[11px]',
                    d.raiseAtR === r
                      ? 'bg-white/[0.14] text-white'
                      : 'bg-white/[0.04] text-white/40 hover:text-white/70',
                  )}
                >
                  {r}R
                </button>
              ))}
            <Sw on={d.trail50} onClick={() => born.set('trail50', !d.trail50)}>
              50일선 트레일링
            </Sw>
            <Sw
              on={d.backstop}
              onClick={() => born.set('backstop', !d.backstop)}
            >
              백스톱
            </Sw>
          </div>
        </div>
      </div>

      {/* ⚠️ **근거 날짜를 «안 묻는다».** 계획은 자율적으로 세운다 — 진입가·
          스톱가격·수량이면 계획이 성립한다 (④-1). 고르게 하려면 그날의 트렌드
          8조건·펀더 세 축·VCP·RS 를 다 보여줘야 하는데, 근거가 25개 값이라
          계획을 «세우는» 칸이 그걸 못 진다.
          스냅샷은 서버가 그 시점 판정을 붙인다 (F4). 고르는 길은 **계획 갱신**을
          만들 때 다시 본다 — 「무엇을 보여줘야 개선이 되는가」가 그때의 질문이다. */}

      <textarea
        value={d.memo}
        onChange={(e) => born.set('memo', e.target.value)}
        rows={3}
        placeholder="왜 여기서 사려는가"
        className="bg-bg-input mt-2 w-full resize-y rounded-md px-2.5 py-2 text-[12px] leading-relaxed text-white outline-none placeholder:text-white/25 focus:ring-1 focus:ring-white/30"
      />

      {!born.ready && (
        <div className="mt-2 text-[11px] text-white/35">
          이름 · 진입가 · 스톱가격 · 수량이 있어야 계획이다
        </div>
      )}
    </section>
  )
}

/**
 * 새 계획 칸 하나.
 *
 * 세부 1층의 `Cell` 과 다른 것은 **비어 있는 채로 시작한다**는 점이다 —
 * 그쪽은 이미 정해진 값을 보여주다 고치는 자리고, 여기는 처음부터 채우는 자리다.
 * `hint` 가 「무엇을 넣는 칸인가」를 말한다. 값을 제시하지는 않는다.
 *
 * 경고가 두 종인 것도 `Cell` 과 같다 — `warn` 은 넘어도 가는 것(⚠),
 * `block` 은 막는 것(✕). 기호가 형태로 갈리므로 색이 무너져도 남는다.
 */
function Field({
  label,
  hint,
  warn,
  block,
  num,
  onNum,
  text,
  onText,
  placeholder,
  picking,
  onPick,
}: {
  label: string
  hint?: string
  warn?: string
  block?: string
  num?: number
  onNum?: (n: number) => void
  text?: string
  onText?: (v: string) => void
  placeholder?: string
  /** 이 칸을 차트에서 집는 중이다 */
  picking?: boolean
  onPick?: () => void
}) {
  /**
   * ⚠️ `<label>` 로 감싸지 «않는다». 안에 버튼을 두면 그 버튼을 눌러도 라벨이
   *    딸린 입력칸이 같이 반응한다 — 집기를 켜려는 클릭이 입력칸 포커스까지
   *    끌고 간다. 이름은 `aria-label` 이 이미 지고 있으므로 감쌀 이유가 없다.
   */
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-[10px] text-white/40">
        {label}
        {/* ④-1-1-1 의 📦 자료가 「차트」다 — 숫자를 쓰는 것보다 그 «자리»를
            짚는 것이 실제 동작이다. 켜 두면 차트 커서가 십자가 된다 */}
        {onPick && (
          <button
            type="button"
            onClick={onPick}
            className={cn(
              'rounded-full px-1.5 py-[1px] text-[9px] transition-colors',
              picking
                ? 'bg-brand-blue/25 text-brand-blue'
                : 'bg-white/[0.06] text-white/35 hover:text-white/70',
            )}
          >
            {picking ? '차트에서 집는 중' : '차트에서 집기'}
          </button>
        )}
      </span>
      <input
        /**
         * ⚠️ `aria-label` 을 «따로» 건다. `<label>` 이 힌트와 경고까지 감싸고
         *    있어서, 그것만 믿으면 접근성 이름이 「진입 예상가차트를 보고
         *    넣는다」가 된다 — 읽는 쪽에서 칸 이름과 설명이 안 갈린다.
         */
        aria-label={label}
        value={onNum ? num || '' : text}
        onChange={(e) =>
          onNum
            ? onNum(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
            : onText?.(e.target.value)
        }
        inputMode={onNum ? 'numeric' : undefined}
        placeholder={placeholder}
        className={cn(
          'bg-bg-input font-number rounded-md px-2 py-1 text-[14px] text-white outline-none placeholder:text-white/20 focus:ring-1 focus:ring-white/30',
          block && 'ring-brand-red/50 ring-1',
          picking && 'ring-brand-blue/60 ring-1',
        )}
      />
      {block ? (
        <span className="text-brand-red text-[10px]">{block}</span>
      ) : warn ? (
        <span className="text-warning text-[10px]">{warn}</span>
      ) : (
        hint && <span className="text-[10px] text-white/25">{hint}</span>
      )}
    </div>
  )
}

/** 켬/끔 하나. 세부 화면의 `Toggle` 과 같은 모양이다 */
const Sw = ({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] transition-colors',
      on
        ? 'bg-white/[0.12] text-white/85'
        : 'bg-white/[0.03] text-white/35 hover:text-white/60',
    )}
  >
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        on ? 'bg-brand-red' : 'bg-white/20',
      )}
    />
    {children}
  </button>
)

const Btn = ({
  children,
  onClick,
  disabled,
  go,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  go?: boolean
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'rounded-full px-3 py-1 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
      go
        ? 'bg-brand-red/85 hover:bg-brand-red text-white'
        : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white',
    )}
  >
    {children}
  </button>
)
