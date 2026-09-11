import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { cn } from '@/shared/lib/cn'
import { DateTimePicker } from '@/shared/ui/DateTimePicker'
import { fromServerJudgment, toServerJudgment } from '@/shared/lib/snapshots'
import {
  useCreateSnapshot,
  useSnapshotDetail,
  useUpdateSnapshot,
} from '@/entities/snapshot'
import { SnapshotChart } from './SnapshotChart'
import { pastSnapshots } from '../model/snapshotChart'
import './snapshot.css'

const MA_CHIPS = [
  { label: '50일', tone: 'green1' },
  { label: '150일', tone: 'green2' },
  { label: '200일', tone: 'green3' },
]

type Judgment = 'buy' | 'sell' | 'hold'
const ACT_LABEL: Record<Judgment, string> = {
  buy: '매수',
  sell: '매도',
  hold: '관망',
}

export type SnapshotMode = 'create' | 'edit'

const TEXTAREA_PLACEHOLDER =
  '이번 판단의 이유, 진입가/손절가, 다음 점검 시점을 기록하세요...\n예) 3/12 매도 후 50일선 회복 + 상승돌파 확인, 절반 추매. 손절 1,060,000, 1차 목표 1,250,000.'

type SnapshotPageProps = {
  mode: SnapshotMode
}

export function SnapshotPage({ mode }: SnapshotPageProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const isEdit = mode === 'edit'

  const [showSR, setShowSR] = useState(true)
  const [showMA, setShowMA] = useState(true)
  const [maOn, setMaOn] = useState([true, true, true])
  const maVisible = maOn.map((on) => on && showMA)
  const toggleMa = (i: number) =>
    setMaOn((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  // 과거 스냅샷: 클릭 = 지표 변화 비교 대상 / 체크 = 참조(차트 포인트 + 참고 스냅샷)
  const [activeIdx, setActiveIdx] = useState(1)
  const [checkedSnaps, setCheckedSnaps] = useState(() =>
    pastSnapshots.map(() => true),
  )
  const toggleSnap = (i: number) =>
    setCheckedSnaps((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  // 오늘의 판단 — 매수/매도/관망 단일 선택
  const [judgment, setJudgment] = useState<Judgment>('buy')

  // ── 백엔드 연동 ──
  const search = useSearch({ strict: false })
  const snapshotId = isEdit ? search.id : undefined
  const { data: detail } = useSnapshotDetail(snapshotId)

  // 회고 메모/판단 — edit 시 서버 값으로 prefill
  const [retrospective, setRetrospective] = useState('')
  useEffect(() => {
    if (detail) {
      setRetrospective(detail.retrospective)
      setJudgment(fromServerJudgment(detail.judgment))
    }
  }, [detail])

  const createSnapshot = useCreateSnapshot()
  const updateSnapshot = useUpdateSnapshot()
  const saving = createSnapshot.isPending || updateSnapshot.isPending
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = () => {
    setFormError(null)
    if (isEdit) {
      if (snapshotId == null) {
        setFormError('잘못된 접근입니다. (snapshotId 없음)')
        return
      }
      updateSnapshot.mutate(
        {
          snapshotId,
          judgment: toServerJudgment(judgment),
          // 상세에서 받은 참고 스냅샷을 보존(목업 체크박스는 실제 id가 아니므로 서버 값 유지)
          referenceSnapshotIds: detail?.referenceSnapshotIds ?? [],
          retrospective,
        },
        { onSuccess: () => navigate({ to: '/plans' }) },
      )
    } else {
      const stockCode = search.ticker
      if (!stockCode) {
        setFormError(
          '스냅샷을 생성하려면 종목 정보가 필요합니다. 종목 상세에서 진입해 주세요.',
        )
        return
      }
      createSnapshot.mutate(
        {
          stockCode,
          judgment: toServerJudgment(judgment),
          referenceSnapshotIds: [],
          retrospective,
        },
        { onSuccess: () => navigate({ to: '/plans' }) },
      )
    }
  }

  // 이전 회고 페이저 — 과거 스냅샷들을 넘겨봄
  const [noteIdx, setNoteIdx] = useState(0)
  // 목 상수 배열이고 인덱스는 화면이 잡아 늘 유효한데, 타입은 그것을 모른다.
  // 없으면 «그 칸을 안 그린다» — 화면이 조용히 빈 것이 예외보다 낫다
  const note = pastSnapshots[noteIdx]
  const moveNote = (delta: number) =>
    setNoteIdx((i) =>
      Math.min(pastSnapshots.length - 1, Math.max(0, i + delta)),
    )

  // 스냅샷 시점 — 우측 상단 날짜/시간 선택 (기본 현재)
  const [snapDt, setSnapDt] = useState(() => new Date())
  const [live, setLive] = useState(true)
  const pad = (n: number) => String(n).padStart(2, '0')
  const nowStr = `${snapDt.getFullYear()}.${pad(snapDt.getMonth() + 1)}.${pad(snapDt.getDate())} ${pad(snapDt.getHours())}:${pad(snapDt.getMinutes())}`

  return (
    <div className={cn('snapshot-page', isEdit && 'mode-edit')}>
      {/* ── Top bar ── */}
      <div className="topbar">
        <button
          className="back"
          type="button"
          onClick={() => router.history.back()}
        >
          <ChevronLeft size={22} strokeWidth={2} />
          돌아가기
        </button>
        <span className="crumb">
          {isEdit ? '내 스냅샷' : '관심 종목'}
          <span className="sep">›</span>
          {detail?.stockName ?? 'SK하이닉스'}
          <span className="sep">›</span>
          <span className="cur">
            {isEdit ? '2026.03.12 14:00 · 스냅샷 조회·수정' : '스냅샷 생성'}
          </span>
        </span>
      </div>

      <div className="layout">
        {/* ── Big chart card (with merged stock header) ── */}
        <div className="chartCard">
          <div className="stockHead">
            <div className="stockLeft">
              <div className="stockName">
                SK하이닉스 <span className="code">| 003680</span>
              </div>
              <div className="stockPrice">₩ 1,150,482</div>
              <span className="stockChg">
                +52,482 <span className="chgPct">+4.78%</span>
              </span>
            </div>
            <div className="stockRight">
              <DateTimePicker value={snapDt} onChange={setSnapDt} />
              {!isEdit && (
                <button
                  type="button"
                  className={cn('liveBtn', live && 'on')}
                  aria-pressed={live}
                  onClick={() => setLive((v) => !v)}
                >
                  {live ? (
                    <Pause size={13} strokeWidth={2.5} fill="currentColor" />
                  ) : (
                    <Play size={13} strokeWidth={2.5} fill="currentColor" />
                  )}
                  {live
                    ? '실시간 수신 중'
                    : `일시정지 · ${pad(snapDt.getHours())}:${pad(snapDt.getMinutes())}`}
                </button>
              )}
            </div>
          </div>

          <div className="chartTopRow">
            <div className="chartCtl">
              <div className="period">
                차트 기간{' '}
                <select defaultValue="50일">
                  <option>50일</option>
                  <option>100일</option>
                  <option>1년</option>
                </select>
              </div>
              <button
                type="button"
                className="toggle yellow"
                aria-pressed={showSR}
                onClick={() => setShowSR((v) => !v)}
              >
                지지선/저항선{' '}
                <span className={cn('switch yellow', !showSR && 'off')}>
                  <span className="thumb" />
                </span>
              </button>
              <button
                type="button"
                className="toggle green"
                aria-pressed={showMA}
                onClick={() => setShowMA((v) => !v)}
              >
                이동평균선{' '}
                <span className={cn('switch green', !showMA && 'off')}>
                  <span className="thumb" />
                </span>
              </button>
              <span className="maLegend">
                {MA_CHIPS.map((chip, i) => (
                  <button
                    key={chip.label}
                    type="button"
                    className={cn('maChip', chip.tone, maVisible[i] && 'on')}
                    aria-pressed={maVisible[i]}
                    onClick={() => toggleMa(i)}
                  >
                    <span className="maDot" />
                    {chip.label}
                  </button>
                ))}
              </span>
            </div>
          </div>

          <SnapshotChart
            showSR={showSR}
            maVisible={maVisible}
            markerVisible={checkedSnaps}
          />
        </div>

        {/* ── Compare panel (지표 디프) ── */}
        <div className="compare">
          <div className="compareHead">
            <span>
              지표 변화 · {pastSnapshots[activeIdx]?.dt.split(' · ')[0]} → 지금
            </span>
            <span className="cnt">
              <b>7</b> 변경 · 1 유지
            </span>
          </div>
          <div className="strip">
            <div className="chip">
              <span className="cLbl">주식 레짐</span>
              <div className="cMain">
                <span className="cVal regime">상승돌파</span>
                <span className="cD tag">전환</span>
              </div>
              <span className="cFrom">이전 돌파실패</span>
            </div>
            <div className="chip">
              <span className="cLbl">돌파시점</span>
              <div className="cMain">
                <span className="cVal">+13%</span>
                <span className="cD up">▲ 5%p</span>
              </div>
              <span className="cFrom">이전 +8%</span>
            </div>
            <div className="chip">
              <span className="cLbl">1년 모멘텀</span>
              <div className="cMain">
                <span className="cVal">+31.2%</span>
                <span className="cD up">▲ 2.8%p</span>
              </div>
              <span className="cFrom">이전 +28.4%</span>
            </div>
            <div className="chip">
              <span className="cLbl">흐름 안정도</span>
              <div className="cMain">
                <span className="cVal gold">0.43</span>
                <span className="cD gold">▼ 0.08</span>
              </div>
              <span className="cFrom">이전 0.51</span>
            </div>
            <div className="chip">
              <span className="cLbl">거래량</span>
              <div className="cMain">
                <span className="cVal">42M</span>
                <span className="cD up">▲ 3M</span>
              </div>
              <span className="cFrom">이전 39M</span>
            </div>
            <div className="chip">
              <span className="cLbl">EPS(YOY)</span>
              <div className="cMain">
                <span className="cVal">+31.2%</span>
                <span className="cD up">▲ 2.8%p</span>
              </div>
              <span className="cFrom">이전 +28.4%</span>
            </div>
            <div className="chip">
              <span className="cLbl">RS</span>
              <div className="cMain">
                <span className="cVal">82</span>
                <span className="cD up">▲ 2</span>
              </div>
              <span className="cFrom">이전 80</span>
            </div>
            <div className="chip">
              <span className="cLbl">이평선 정배열</span>
              <div className="cMain">
                <span className="cVal">3/3</span>
                <span className="cD flat">유지</span>
              </div>
              <span className="cFrom">이전 3/3</span>
            </div>
          </div>
        </div>

        {/* ── Bottom 3 columns ── */}
        <div className="bottom">
          {/* Past snapshots list */}
          <div className="bCard">
            <div className="bHead">
              과거 스냅샷{' '}
              <span className="countChip">총 {pastSnapshots.length}개</span>
            </div>
            <div className="snapList">
              {pastSnapshots.map((snap, i) => (
                <div
                  key={snap.dt}
                  className={cn(
                    'snapItem',
                    activeIdx === i && 'active',
                    checkedSnaps[i] && 'checked',
                  )}
                  onClick={() => setActiveIdx(i)}
                >
                  <button
                    type="button"
                    className="snapCheck"
                    aria-label="참조 토글"
                    aria-pressed={checkedSnaps[i]}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSnap(i)
                    }}
                  >
                    <Check size={11} strokeWidth={3} color="#fff" />
                  </button>
                  <div className="snapMeta">
                    <span className="top">
                      {snap.dt}{' '}
                      <span className={`tag ${snap.tagCls}`}>{snap.tag}</span>
                    </span>
                    <span className="price">{snap.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past note (이전 회고) */}
          <div className="bCard">
            <div className="bHead">
              <span>이전 회고</span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  color: 'rgba(255,255,255,.5)',
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {note?.dt} · {note?.tag} 시점
              </span>
            </div>
            <div className="noteMeta">
              <span>{note?.price}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{note?.meta}</span>
            </div>
            <div className="noteBody">{note?.memo}</div>
            <div className="noteFoot">
              <span>
                {noteIdx + 1} / {pastSnapshots.length}
              </span>
              <div className="nav">
                <button
                  className="navBtn"
                  type="button"
                  aria-label="이전 회고"
                  disabled={noteIdx === 0}
                  onClick={() => moveNote(-1)}
                >
                  <ChevronLeft size={12} strokeWidth={2.5} />
                </button>
                <button
                  className="navBtn"
                  type="button"
                  aria-label="다음 회고"
                  disabled={noteIdx === pastSnapshots.length - 1}
                  onClick={() => moveNote(1)}
                >
                  <ChevronRight size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Current judgment */}
          <div className="bCard">
            <div className="cjHead">
              <div className="cjTitle">
                <span className="nowDot" />
                {isEdit
                  ? '판단 기록 · 2026.03.12 14:00'
                  : `오늘의 판단 · ${nowStr}`}
              </div>
              <div className="actBtns">
                {(['buy', 'sell', 'hold'] as Judgment[]).map((j) => (
                  <button
                    key={j}
                    type="button"
                    className={cn('actBtn', j, judgment === j && 'on')}
                    aria-pressed={judgment === j}
                    onClick={() => setJudgment(j)}
                  >
                    {ACT_LABEL[j]}
                  </button>
                ))}
              </div>
            </div>
            <div className="refSection">
              <div className="refLabel">
                <span>참고 스냅샷</span>
                <span className="count">
                  {checkedSnaps.filter(Boolean).length}개 · 과거 스냅샷에서 선택
                </span>
              </div>
              <div className="refRow">
                {checkedSnaps.some(Boolean) ? (
                  pastSnapshots.map((snap, i) =>
                    checkedSnaps[i] ? (
                      <span key={snap.dt} className="refChip">
                        {snap.dt.replace(' · ', ' ')}{' '}
                        <span className="pillSmall">{snap.tag}</span>
                      </span>
                    ) : null,
                  )
                ) : (
                  <span className="refEmpty">
                    왼쪽 과거 스냅샷을 체크해 선택하세요
                  </span>
                )}
              </div>
            </div>
            <textarea
              className="cjTextarea"
              placeholder={TEXTAREA_PLACEHOLDER}
              value={retrospective}
              onChange={(e) => setRetrospective(e.target.value)}
            />
            {formError && (
              <p
                style={{
                  color: 'var(--color-brand-red, #FF3636)',
                  fontSize: 12,
                  margin: '4px 0 0',
                }}
              >
                {formError}
              </p>
            )}
            <div className="cjFooter">
              <button
                className="recordBtn"
                type="button"
                disabled={saving}
                onClick={handleSubmit}
              >
                {saving ? '저장 중…' : isEdit ? '수정 하기' : '스냅샷 생성하기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
