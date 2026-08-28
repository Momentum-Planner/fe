import { registerOverlay } from 'klinecharts'

export const BASE_BOX = 'baseBox'

/**
 * 베이스 박스 오버레이 — 지금 StockChart.tsx 가 DOM div 로 그리는 지지/저항 상자를
 * 차트 캔버스 안으로 옮긴 것.
 *
 * 지금 방식과 무엇이 다른가
 *   ✕ timeToCoordinate/priceToCoordinate 로 픽셀 직접 계산 → innerHTML 조립
 *     + subscribeVisibleLogicalRangeChange · ResizeObserver 로 매번 다시 그림 (약 25줄)
 *   ✔ 두 점을 timestamp/value 로 주면 좌표 변환도 스크롤 추적도 라이브러리가 한다
 *
 * ⚠️ 내장 오버레이 목록에 rect 는 없다 — 있는 건 선 종류들뿐이고,
 *    rect 는 figure(그리기 원시 타입)다. 그래서 이 등록 한 번이 필요하다.
 */
export function registerBaseBox() {
  registerOverlay({
    name: BASE_BOX,
    // ① totalStep 2 — 점 두 개(좌상·우하)면 완성. points 를 다 채워 createOverlay 하면
    //    마우스로 그리는 단계를 건너뛰고 바로 그려진다
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    styles: {
      rect: {
        style: 'stroke_fill',
        color: 'rgba(238,184,45,0.10)',
        borderColor: '#EEB82D',
        borderSize: 1.5,
      },
    },
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return []
      const [a, b] = coordinates
      // ② 좌표는 이미 픽셀이다 — 스크롤·줌·리사이즈가 나면 라이브러리가 다시 불러준다
      const x = Math.min(a.x, b.x)
      const y = Math.min(a.y, b.y)
      return [
        {
          type: 'rect',
          attrs: {
            x,
            y,
            width: Math.abs(b.x - a.x),
            height: Math.abs(b.y - a.y),
          },
        },
      ]
    },
  })
}
