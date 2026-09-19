import type { KLineData } from 'klinecharts'

/**
 * 틱 피드 시뮬레이터. 실제 서비스에서 WebSocket 이 할 일을 대신한다 —
 * 봉 하나를 흔들다가 주기가 끝나면 다음 봉으로 넘어간다.
 */
export type Tick = { bar: KLineData; isNewBar: boolean }

export class LiveFeed {
  private timer: number | null = null
  private current: KLineData
  private ticksInBar = 0

  constructor(
    private readonly last: KLineData,
    private readonly stepMs: number,
    /** 봉 하나가 확정되기까지 받을 틱 수 */
    private readonly ticksPerBar = 20,
  ) {
    this.current = { ...last }
  }

  /** hz = 초당 틱 수. */
  start(hz: number, onTick: (t: Tick) => void) {
    this.stop()
    let n = 0
    this.timer = window.setInterval(() => {
      const drift = Math.sin(n / 5) * this.last.close * 0.0015
      const close = Math.round(this.current.close + drift)
      let isNewBar = false

      if (++this.ticksInBar >= this.ticksPerBar) {
        // 봉 확정 → 다음 봉 시작
        this.ticksInBar = 0
        isNewBar = true
        this.current = {
          timestamp: this.current.timestamp + this.stepMs,
          open: close,
          high: close,
          low: close,
          close,
          volume: 0,
        }
      } else {
        this.current = {
          ...this.current,
          close,
          high: Math.max(this.current.high, close),
          low: Math.min(this.current.low, close),
          volume: (this.current.volume ?? 0) + 5_000,
        }
      }
      n++
      onTick({ bar: { ...this.current }, isNewBar })
    }, 1000 / hz)
  }

  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

/** 실측 FPS/드롭 계산기 — 틱이 들어온 시각 간격을 본다. */
export class TickMeter {
  private times: number[] = []
  private lastPaint = performance.now()

  mark() {
    const now = performance.now()
    this.times.push(now - this.lastPaint)
    this.lastPaint = now
    if (this.times.length > 60) this.times.shift()
  }

  read() {
    if (this.times.length < 5) return null
    const sorted = [...this.times].sort((a, b) => a - b)
    // 위에서 5개 미만은 이미 나갔으므로 둘 다 있다. 타입만 그것을 모른다
    const median = sorted[Math.floor(sorted.length / 2)]
    const worst = sorted.at(-1)
    if (median === undefined || worst === undefined) return null
    return {
      medianMs: +median.toFixed(1),
      worstMs: +worst.toFixed(1),
      fps: +(1000 / median).toFixed(0),
    }
  }
}
