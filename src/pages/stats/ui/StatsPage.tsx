/**
 * 거래 통계 — ⑨ 지표 + ⑧ 그룹별 성과 + ⑦ 거래 목록을 한 화면에 둔다 (Q1).
 *
 * ⑧은 화면이 아니라 「과정 · 단건」이라 독립 화면을 안 만든다 — ⑦과 ⑨를 잇는
 * 연산이므로 둘 사이에 놓는다. 그룹을 누르면 그 그룹의 거래만 걸러진다.
 *
 * ⚠️ TradeStats · Trade API가 아직 없다. 자리만 잡아 둔 것이다.
 */

function Section({
  no,
  title,
  desc,
  children,
}: {
  no: string
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <section className="card flex flex-col gap-3 px-6 py-5">
      <header className="flex flex-wrap items-baseline gap-2.5">
        <span className="font-number text-[13px] text-white/35">{no}</span>
        <h2 className="t-h3 m-0 text-white">{title}</h2>
        <span className="text-[12px] text-white/35">{desc}</span>
      </header>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 py-8 text-center text-[13px] text-white/35">{children}</p>
  )
}

const GROUPS = [
  { d: '계획', labels: ['계획 있음', '임의 진입', '계획 없음'] },
  { d: '베이스 번호', labels: ['1~2번째', '3~4번째', '5번째+'] },
  { d: '트렌드 템플릿', labels: ['8/8', '6~7', '그 이하'] },
  { d: '위험노출', labels: ['1% 미만', '1~2%', '2% 초과'] },
]

export function StatsPage() {
  return (
    <main className="flex flex-col gap-4 px-6 pt-6 pb-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="t-h1 m-0 text-white">거래 통계</h1>
        <p className="m-0 text-[13px] text-white/45">
          내 기록으로 규칙의 가치를 증명하는 자리입니다 — 계획을 지킨 거래와
          어긴 거래를 갈라서 봅니다.
        </p>
      </header>

      <Section no="⑨" title="지표" desc="승률 · 평균수익 · 손익비 · 기대값">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {['승률', '평균 수익', '손익비', '기대값'].map((l) => (
            <div
              key={l}
              className="flex flex-col gap-1.5 rounded-[10px] border border-white/[0.07] px-4 py-3"
            >
              <span className="text-[12px] text-white/40">{l}</span>
              <span className="font-number text-[22px] font-bold text-white/25">
                —
              </span>
            </div>
          ))}
        </div>
        <Empty>거래가 쌓이면 여기에 나옵니다.</Empty>
      </Section>

      <Section
        no="⑧"
        title="그룹별 성과"
        desc="꼬리표로 갈라서 본다 · 누르면 아래 목록이 걸러집니다"
      >
        <div className="flex flex-col gap-3">
          {GROUPS.map((g) => (
            <div key={g.d} className="flex flex-wrap items-center gap-2">
              <span className="w-[104px] shrink-0 text-[12px] text-white/40">
                {g.d}
              </span>
              {g.labels.map((l) => (
                <span
                  key={l}
                  className="rounded-full border border-white/12 px-3 py-1 text-[12px] text-white/40"
                >
                  {l}
                  <span className="font-number ml-1.5 text-white/25">—</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section no="⑦" title="거래 목록" desc="진입가 · 매도가 · 수량 · 매도일">
        <Empty>기록된 거래가 없습니다.</Empty>
      </Section>

      <Section
        no="⑩"
        title="계획으로 되돌리기"
        desc="통계가 계획의 다섯 값을 계산해 돌려준다"
      >
        <div className="flex flex-wrap gap-2">
          {[
            '손절폭',
            '손익비 목표',
            '위험노출%',
            '포지션%',
            '최대 보유 종목 수',
          ].map((l) => (
            <span
              key={l}
              className="rounded-full border border-white/12 px-3 py-1 text-[12px] text-white/40"
            >
              {l}
              <span className="font-number ml-1.5 text-white/25">—</span>
            </span>
          ))}
        </div>
      </Section>
    </main>
  )
}
