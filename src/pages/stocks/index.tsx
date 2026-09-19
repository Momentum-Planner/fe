/**
 * ⚠️ **지울 것.** 이 슬라이스는 2026-09-11 부터 «아무도 안 부른다** —
 * `/stocks/:ticker` 가 계획 화면(`pages/plan-detail`)으로 바뀌면서 종목 상세가
 * 그쪽에 흡수됐다. `StockDetailPage` 도 `ItemCards`(994줄)도 죽은 코드다.
 *
 * ```text
 * 지금 이 슬라이스를 참조하는 것   없다
 * 마지막으로 끊은 의존            snapshots → stockChart  (2026-09-11)
 * ```
 *
 * **지금 안 지우는 이유** — 종목 화면을 다시 만들 때 여기 있는 카드·차트 구성이
 * 재료가 된다. 계획 화면이 정말 그 자리를 다 하는지 한 바퀴 써 보고 지운다.
 *
 * ⚠️ 리팩토링 목록 ⑤(지울 것 지우기)의 **첫 항목**이다. `lightweight-charts` 도
 *    이것과 `snapshots` 만 쓰므로 같이 빠질 수 있다.
 */
export { StockDetailPage } from './ui/StockDetailPage'
