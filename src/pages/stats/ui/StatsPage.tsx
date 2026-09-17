/**
 * ⑦ 거래 통계.
 *
 * ```text
 * ① 월별 손익 워터폴 (왼쪽)      +  요약 (오른쪽)     한 판에 같이 선다
 *   └ 최대 수익 · 최대 손실           성과 넷 · 위험 넷
 * ② 거래 기록                    ← 기간 선택에 안 걸린다. 자기 필터가 있다
 * ```
 *
 * 💀 **셋이 남았다** (2026-09-13). 최대 둘 · 요약 지표 · 종형 곡선이 ① 로
 * 합쳐졌고, **그룹별 성과(축 여덟 · 22행 × 3열)는 통째로 뺐다** —
 * *「이건 구현 세부사항에 가깝다」*. 무엇을 축으로 삼을지(훼손 0~2냐 0~5냐 ·
 * 베이스를 몇으로 묶냐 · 계획 상태를 넣냐)가 아직 안 정해졌는데 화면이 먼저
 * 서 있었다. **⑧ 피드백이 어떤 값을 되돌려 줄지 정해진 뒤에** 다시 세운다.
 *
 * ⚠️ 설계 문서의 여섯 블록과 대조 —
 *
 * ```text
 * 문서                    지금
 * ① 최대 수익 · 최대 손실  →  ① 안의 첫 층
 * ② 워터폴               →  ②   (자리만 아래로)
 * ③ 요약 지표            →  ① 안의 「성과」 + 「위험」
 * ④ 종형 곡선            →  ① 의 「벽 왼쪽」 한 칸  (F1 · Q9)
 * ⑤ 그룹별 성과          →  —   (뺐다)
 * ⑥ 거래 기록 목록        →  ③
 * ```
 *
 * **표본 경계**
 *
 * ```text
 * ① 의 최대 둘 · 세는 칸 셋 · ② · ③   1건~   사실이라 항상 나온다
 * ① 의 성과 넷 · 평균 위험노출        5건~   값을 흐리게 + 「표본 N건」
 * ```
 *
 * 💀 **필터를 걸수록 흐려지는 칸이 늘어난다.** *「기간을 걸었을 때 표본이
 * 적으면 적다고 함께 적는다」* 가 화면 «동작»이 된 것이다. 모델은 24장 ④ 의
 * 액션 필터 — 거기서도 선택은 워터폴과 스파크바에만 걸렸고 세부사항 표는
 * 그대로 있었다.
 *
 * ⚠️ **분기 추이는 따로 두지 않는다.** ② 의 기간 선택이 그 역할을 겸한다.
 */

import { useMemo, useState } from 'react'
import { useTradeList } from '@/entities/tradeRecord'
import {
  inPeriod,
  isClosed,
  monthlyFlow,
  recordRows,
  riskStat,
  summarize,
} from '../model/aggregate'
import type { Period } from '../model/aggregate'
import { Overview } from './Overview'
import { RecordList } from './RecordList'

export function StatsPage() {
  const { data: records, isError } = useTradeList()
  const [period, setPeriod] = useState<Period | null>(null)

  /** **세는 단위는 매도 기록 하나다** (⑥) */
  const closed = useMemo(() => (records ?? []).filter(isClosed), [records])
  /** ① 이 보는 집합. ② ③ 은 위의 `closed` 를 그대로 본다 */
  const picked = useMemo(
    () => closed.filter((r) => inPeriod(r, period)),
    [closed, period],
  )

  const flow = useMemo(() => monthlyFlow(closed), [closed])
  const rows = useMemo(() => recordRows(records ?? []), [records])
  const sum = useMemo(() => summarize(picked), [picked])
  const risk = useMemo(() => riskStat(picked), [picked])

  if (isError)
    return (
      <Shell>
        <p className="card m-0 px-5 py-6 text-[13px] text-white/45">
          거래 기록을 불러오지 못했습니다.
        </p>
      </Shell>
    )

  if (!records)
    return (
      <Shell>
        <p className="card m-0 px-5 py-6 text-[13px] text-white/35">
          쌓인 것을 세고 있습니다…
        </p>
      </Shell>
    )

  if (closed.length === 0)
    return (
      <Shell>
        <p className="card m-0 px-5 py-6 text-[13px] leading-relaxed text-white/45">
          매도한 거래가 아직 없습니다. 체결을 기록하면 여기부터 채워집니다 (⑥).
        </p>
      </Shell>
    )

  return (
    <Shell>
      {/**
       * ① 요약 판 — 성과 넷 · 차트 + 위험 · 최대 둘이 **네 칸 그리드 하나**에 선다
       * (Q15). 기간을 고르는 손과 값이 바뀌는 자리가 한 판에 있다.
       */}
      <Overview
        flow={flow}
        period={period}
        onPeriod={setPeriod}
        sells={closed.length}
        picked={picked}
        sum={sum}
        risk={risk}
      />

      <RecordList rows={rows} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-col gap-4 px-6 pt-6 pb-16">{children}</main>
}
