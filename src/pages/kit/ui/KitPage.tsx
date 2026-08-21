import { useState } from 'react'
import { MomentumLogo } from '@/shared/ui/MomentumLogo'
import { Pill } from '@/shared/ui/Pill'
import { RegimeIcon } from '@/shared/ui/RegimeIcon'
import { RegimeItemCard } from '@/shared/ui/RegimeItemCard'
import { SearchBar } from '@/shared/ui/SearchBar'
import { SnapshotCard } from '@/shared/ui/SnapshotCard'
import { UnderlineTabs } from '@/shared/ui/UnderlineTabs'
import {
  BaseStageCard,
  EpsCard,
  MomentumItemCard,
  MovelineCard,
  RsItemCard,
  StabilityItemCard,
  VolumeCard,
} from '@/pages/stocks/ui/ItemCards'
import { MomentumCard } from '@/pages/trends/ui/MomentumCard'
import { StabilityCard } from '@/pages/trends/ui/StabilityCard'
import { RsCard } from '@/pages/trends/ui/RsCard'
import { RankingList } from '@/pages/trends/ui/RankingList'
import {
  JUDGMENTS,
  JUDGMENT_LABEL,
  JUDGMENT_STYLE,
  REGIMES,
  REGIME_BG,
  REGIME_COLOR,
  REGIME_LABEL,
} from '@/shared/lib/snapshots'
import type { Judgment, Regime, Snapshot } from '@/shared/lib/snapshots'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="card flex flex-col gap-4 p-6">
      <h2 className="text-[16px] font-bold text-white">{title}</h2>
      {children}
    </section>
  )
}

function RegimePill({ regime }: { regime: Regime }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-[5px] text-[12px] font-bold whitespace-nowrap"
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

function JudgmentPill({ judgment }: { judgment: Judgment }) {
  const j = JUDGMENT_STYLE[judgment]
  return (
    <span
      className="rounded-full border-[1.5px] px-3.5 py-1 text-[13px] font-bold whitespace-nowrap"
      style={{ color: j.text, background: j.bg, borderColor: j.border }}
    >
      {JUDGMENT_LABEL[judgment]}
    </span>
  )
}

const COLORS: { name: string; value: string }[] = [
  { name: 'brand-red', value: '#FF3636' },
  { name: 'brand-red-hi', value: '#FF367C' },
  { name: 'brand-blue', value: '#34ADE4' },
  { name: 'brand-yellow', value: '#EEB82D' },
  { name: 'brand-orange', value: '#F46B1A' },
  { name: 'brand-violet', value: '#7936FF' },
  { name: 'success', value: '#2DDA81' },
]

const GRADIENTS: { name: string; value: string }[] = [
  { name: 'grad-red', value: 'var(--grad-red)' },
  { name: 'grad-blue', value: 'var(--grad-blue)' },
  { name: 'grad-yellow', value: 'var(--grad-yellow)' },
]

const sampleCards: Snapshot[] = REGIMES.map((regime, i) => ({
  stock: 'SK하이닉스',
  regime,
  judgment: JUDGMENTS[i % JUDGMENTS.length],
  date: '2026.03.12. 14:00',
  price: '₩1,150,000',
  memo: '베이스 돌파를 거래량 동반으로 확인하고 분할 매수 진행.',
}))

export function KitPage() {
  const [tab, setTab] = useState('success')

  return (
    <main className="flex flex-col gap-5 px-6 pt-9 pb-12">
      <div className="flex items-center gap-2">
        <MomentumLogo size={22} />
        <h1 className="t-h1 text-white">Design Kit · 컴포넌트</h1>
      </div>

      <Section title="주식 레짐 (5)">
        <div className="flex flex-wrap gap-3">
          {REGIMES.map((r) => (
            <RegimePill key={r} regime={r} />
          ))}
        </div>
      </Section>

      <Section title="판단 · 매수/매도/관망">
        <div className="flex flex-wrap gap-3">
          {JUDGMENTS.map((j) => (
            <JudgmentPill key={j} judgment={j} />
          ))}
        </div>
      </Section>

      <Section title="Pill">
        <div className="flex flex-wrap gap-3">
          <Pill variant="outline">₩ 52,000</Pill>
          <Pill variant="red">₩ 67,000</Pill>
          <Pill variant="blue">파랑</Pill>
          <Pill variant="yellow">노랑</Pill>
        </div>
      </Section>

      <Section title="언더라인 탭">
        <UnderlineTabs
          className="max-w-[420px]"
          tabs={[
            { id: 'success', label: '돌파 성공', count: 24 },
            {
              id: 'prep',
              label: '돌파 준비',
              count: 12,
              activeColor: '#F46B1A',
            },
          ]}
          value={tab}
          onChange={setTab}
        />
      </Section>

      <Section title="검색바">
        <div className="max-w-[520px]">
          <SearchBar />
        </div>
      </Section>

      <Section title="레짐 아이템 카드 (5)">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(534px,1fr))] gap-4">
          {REGIMES.map((r) => (
            <RegimeItemCard key={r} regime={r} />
          ))}
        </div>
      </Section>

      <Section title="종목 상세 아이템 카드">
        <div
          className="stock-detail"
          style={{ padding: 0, gap: 0, display: 'block' }}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(534px,1fr))] gap-4">
            <MovelineCard />
            <MomentumItemCard />
            <VolumeCard />
            <StabilityItemCard />
            <RsItemCard />
            <EpsCard />
            <BaseStageCard b={{ stageLevel: 2 }} />
            <BaseStageCard b={{ stageLevel: 3 }} />
          </div>
        </div>
      </Section>

      <Section title="스냅샷 카드 (레짐별)">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {sampleCards.map((snap) => (
            <SnapshotCard key={snap.regime} snap={snap} />
          ))}
        </div>
      </Section>

      <Section title="메인 대시보드 카드">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          <MomentumCard />
          <StabilityCard />
          <RsCard />
        </div>
        <div className="mt-2 max-w-[640px]">
          <RankingList />
        </div>
      </Section>

      <Section title="색상 토큰">
        <div className="flex flex-wrap gap-4">
          {COLORS.map((c) => (
            <div key={c.name} className="flex flex-col items-center gap-1.5">
              <div
                className="h-14 w-14 rounded-xl"
                style={{ background: c.value }}
              />
              <span className="text-[11px] text-white/60">{c.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-4">
          {GRADIENTS.map((g) => (
            <div key={g.name} className="flex flex-col items-center gap-1.5">
              <div
                className="h-14 w-24 rounded-xl"
                style={{ background: g.value }}
              />
              <span className="text-[11px] text-white/60">{g.name}</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  )
}
