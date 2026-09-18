import { useState } from 'react'
import type { PlanRecord } from '@/entities/plan'
import { useDeleteRecord, useUpdateRecord } from '@/entities/tradeRecord'
import { cn } from '@/shared/lib/cn'
import { Pair, won } from './planParts'

/**
 * 체결 한 줄 — **고치기 · 지우기** (Q23 · 8장 ⑤ 실행 후 되돌릴 길).
 *
 * 💀 잘못 적은 체결을 되돌릴 길이 없었다. 책 — 「파일 · 데이터베이스를 바꾸는 모든 동작은
 * 되돌릴 수 있어야 한다」. 고치거나 지우면 그 계획의 상태가 체결에서 다시 나온다(목 `settle`).
 *
 * 지우기는 **소프트 삭제**다 (Q3) — 목록 · 통계에서 빠지고 기록은 남는다. 한 번 더 묻는다.
 */
export function FillRow({ r }: { r: PlanRecord }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view')
  const [price, setPrice] = useState(r.price)
  const [qty, setQty] = useState(r.quantity)
  const [date, setDate] = useState(r.filledAt.slice(0, 10))
  const update = useUpdateRecord()
  const remove = useDeleteRecord()

  if (mode === 'edit')
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1.5 text-[12px]">
        <span className="text-white/55">
          {r.side === 'BUY' ? '매수' : '매도'}
        </span>
        <input
          type="date"
          aria-label="체결일 고치기"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-bg-input font-number rounded-sm px-1.5 py-0.5 text-[12px] text-white [color-scheme:dark]"
        />
        <Num label="가격 고치기" value={price} onChange={setPrice} unit="원" />
        <Num label="수량 고치기" value={qty} onChange={setQty} unit="주" />
        <span className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setMode('view')}
            className="px-1.5 text-[11px] text-white/45 hover:text-white/75"
          >
            취소
          </button>
          <button
            type="button"
            disabled={update.isPending || price <= 0 || qty <= 0}
            onClick={() =>
              update.mutate(
                {
                  recordId: r.recordId,
                  patch: { price, quantity: qty, filledAt: date },
                },
                { onSuccess: () => setMode('view') },
              )
            }
            className="text-fg-inverse rounded-sm bg-white px-2 py-0.5 text-[11px] font-bold disabled:opacity-40"
          >
            저장
          </button>
        </span>
      </div>
    )

  return (
    <div className="group flex items-center gap-2">
      <Pair
        className="font-number flex-1 py-0.5 text-[12px]"
        left={
          <div className="flex justify-between">
            <span className="text-white/40">{r.filledAt.slice(5)}</span>
            <span className="text-white/55">
              {r.side === 'BUY' ? '매수' : '매도'}
            </span>
          </div>
        }
        right={
          <div className="flex justify-between">
            <span className="text-white/85">{won(r.price)}</span>
            <span className="text-white/55">{r.quantity}주</span>
          </div>
        }
      />
      {mode === 'confirm' ? (
        <span className="flex items-center gap-1 text-[11px]">
          <span className="text-white/55">지울까?</span>
          <button
            type="button"
            onClick={() => setMode('view')}
            className="px-1 text-white/45 hover:text-white/75"
          >
            아니오
          </button>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(r.recordId)}
            className="text-brand-red px-1 font-bold"
          >
            지운다
          </button>
        </span>
      ) : (
        <span className="flex gap-1 text-[11px] text-white/40">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="px-1 hover:text-white/80"
          >
            고치기
          </button>
          <button
            type="button"
            onClick={() => setMode('confirm')}
            className="px-1 hover:text-white/80"
          >
            지우기
          </button>
        </span>
      )}
    </div>
  )
}

function Num({
  label,
  value,
  unit,
  onChange,
}: {
  label: string
  value: number
  unit: string
  onChange: (n: number) => void
}) {
  return (
    <span className="relative">
      <input
        aria-label={label}
        value={value ? won(value) : ''}
        inputMode="numeric"
        onChange={(e) =>
          onChange(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)
        }
        className={cn(
          'bg-bg-input font-number w-24 rounded-sm px-1.5 py-0.5 pr-5 text-right text-[12px] text-white',
        )}
      />
      <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px] text-white/35">
        {unit}
      </span>
    </span>
  )
}
