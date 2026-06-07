/**
 * The 2×4 item-card grid below the stock-detail chart. Each card is a faithful
 * port of a design preview (preview/item-*.html). Styles live in stock-detail.css
 * (scoped per card via .sdCard--<type>).
 */
import { RegimeItemCard } from '@/shared/ui/RegimeItemCard'
import './stock-detail.css'

/* 2 · 이동평균선 */
export function MovelineCard() {
  return (
    <article className="sdCard sdCard--moveline">
      <div className="title">이동평균선 (vs 현재가)</div>
      <div className="sub">
        오늘의 가격과 오늘 이동평균선들의 위치를 비교합니다.
      </div>

      <div className="body">
        <div className="chartArea">
          <svg viewBox="0 0 260 130">
            <g>
              <line
                x1="20"
                x2="20"
                y1="64"
                y2="92"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="14" y="66" width="12" height="22" fill="#FF3636" />
              <line
                x1="42"
                x2="42"
                y1="62"
                y2="100"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="36" y="74" width="12" height="22" fill="#FF3636" />
              <line
                x1="64"
                x2="64"
                y1="80"
                y2="106"
                stroke="#34ADE4"
                strokeWidth="1"
              />
              <rect x="58" y="86" width="12" height="14" fill="#34ADE4" />
              <line
                x1="86"
                x2="86"
                y1="72"
                y2="98"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="80" y="76" width="12" height="18" fill="#FF3636" />
              <line
                x1="108"
                x2="108"
                y1="58"
                y2="84"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="102" y="62" width="12" height="18" fill="#FF3636" />
              <line
                x1="130"
                x2="130"
                y1="50"
                y2="72"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="124" y="52" width="12" height="16" fill="#FF3636" />
              <line
                x1="152"
                x2="152"
                y1="42"
                y2="68"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="146" y="46" width="12" height="18" fill="#FF3636" />
              <line
                x1="174"
                x2="174"
                y1="36"
                y2="58"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="168" y="38" width="12" height="14" fill="#FF3636" />
              <line
                x1="196"
                x2="196"
                y1="20"
                y2="50"
                stroke="#FF3636"
                strokeWidth="1"
              />
              <rect x="190" y="22" width="12" height="22" fill="#FF3636" />
            </g>
            <path
              d="M5 78 C 30 76 50 76 75 80 C 100 84 140 60 175 48 C 195 41 215 38 240 38"
              stroke="#2BDCC0"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M5 86 C 30 84 50 86 75 88 C 100 90 140 70 175 60 C 195 54 215 50 240 50"
              stroke="#6BDE39"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M5 92 C 30 92 50 94 75 94 C 100 94 140 78 175 70 C 195 65 215 60 240 58"
              stroke="#6BDE39"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              opacity=".55"
            />
            <circle cx="240" cy="38" r="5" fill="#2BDCC0" />
            <circle cx="240" cy="50" r="5" fill="#6BDE39" />
            <circle cx="240" cy="58" r="5" fill="#6BDE39" opacity=".7" />
          </svg>
        </div>

        <div className="pillCol">
          <span className="legendPill pillRed">오늘 가격</span>
          <span className="legendPill pillCyan">50일</span>
          <span className="legendPill pillGreen">150일 / 200일</span>
        </div>

        <div className="ratio">
          <span className="ratioLabel">현재가 &gt; 이동평균선</span>
          <span className="stat">
            <span className="a">3</span>
            <span className="slash">/</span>
            <span className="b">3</span>
          </span>
        </div>
      </div>

      <div className="foot">
        <span className="desc">상승의 흐름을 뒷받침하는 정배합입니다</span>
        <span className="dots">
          <span className="d cyan" />
          <span className="d grey" />
          <span className="d green" />
        </span>
      </div>
    </article>
  )
}

/* 3 · 1년 모멘텀 */
export function MomentumItemCard() {
  return (
    <article className="sdCard sdCard--metric">
      <div className="title">1년 모멘텀</div>
      <div className="sub">약 1년기간의 주식 가격 상승폭을 의미합니다.</div>
      <div className="body">
        <div>
          <div className="priceRow">
            <span className="pillOut">₩ 52,000</span>
            <span className="arrow" />
            <span className="pillRed">₩ 67,000</span>
          </div>
          <div className="dateRow">
            <span>25.03.13</span>
            <span>26.03.14</span>
          </div>
        </div>
        <div className="stat">
          +28.4<span className="pct">%</span>
        </div>
      </div>
      <div className="foot">
        <span className="desc">완만한 상승 흐름을 보입니다.</span>
        <span className="rank">
          해당 기간 중 상위<b>12%</b>
        </span>
      </div>
    </article>
  )
}

/* 4 · 현재 거래량 */
export function VolumeCard() {
  return (
    <article className="sdCard sdCard--volume">
      <div className="title">현재 거래량</div>
      <div className="sub">
        베이스라인 동안의 거래량과 현재 거래량을 비교합니다.
      </div>
      <div className="body">
        <div className="chart">
          <svg viewBox="0 0 360 120">
            <g>
              <rect x="6" y="38" width="18" height="74" fill="#3D5F6E" />
              <rect x="30" y="20" width="18" height="92" fill="#3D5F6E" />
              <rect x="54" y="26" width="18" height="86" fill="#8B2828" />
              <rect x="78" y="46" width="18" height="66" fill="#8B2828" />
              <rect x="102" y="58" width="18" height="54" fill="#3D5F6E" />
              <rect x="126" y="68" width="18" height="44" fill="#8B2828" />
              <rect x="150" y="84" width="18" height="28" fill="#3D5F6E" />
              <rect x="174" y="32" width="18" height="80" fill="#8B2828" />
              <rect x="198" y="42" width="18" height="70" fill="#3D5F6E" />
              <rect x="222" y="58" width="18" height="54" fill="#8B2828" />
              <rect x="246" y="64" width="18" height="48" fill="#3D5F6E" />
              <rect x="270" y="40" width="18" height="72" fill="#8B2828" />
              <rect x="294" y="32" width="18" height="80" fill="#8B2828" />
              <rect x="324" y="14" width="22" height="98" fill="#FF3636" />
            </g>
            <line
              x1="0"
              y1="50"
              x2="354"
              y2="50"
              stroke="#EEB82D"
              strokeWidth="2"
              strokeDasharray="10 8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="stats">
          <div className="row1">
            <span className="label">베이스 평균</span>
            <span className="num gold">32M</span>
          </div>
          <div className="row2">
            <span className="label">현재</span>
            <span className="num red">39M</span>
          </div>
        </div>
      </div>
      <div className="foot">
        <span className="desc">거래량이 가격 움직임을 뒷받침합니다.</span>
        <span className="ratio">
          현재 베이스 대비<b>1.12배</b>
        </span>
      </div>
    </article>
  )
}

/* 5 · 흐름안정도 */
export function StabilityItemCard() {
  return (
    <article className="sdCard sdCard--metric">
      <div className="title">흐름안정도</div>
      <div className="sub">모멘텀 흐름이 얼마나 꾸준했는지 나타냅니다.</div>
      <div className="body">
        <svg
          width="240"
          height="100"
          viewBox="0 0 244 148"
          style={{ maxHeight: 'none' }}
        >
          <path
            d="M 42 102 A 80 80 0 0 1 171.3 38.96"
            fill="none"
            stroke="#FF3636"
            strokeWidth="44"
            strokeLinecap="butt"
          />
          <path
            d="M 171.3 38.96 A 80 80 0 0 1 202 102"
            fill="none"
            stroke="#34ADE4"
            strokeWidth="44"
            strokeLinecap="butt"
          />
          <text
            x="42"
            y="128"
            textAnchor="middle"
            fontFamily="DM Sans"
            fontWeight="500"
            fontSize="18"
            fill="#FF3636"
          >
            180
          </text>
          <text
            x="42"
            y="144"
            textAnchor="middle"
            fontFamily="Pretendard, sans-serif"
            fontSize="11"
            fill="#FF3636"
          >
            상승 일 수
          </text>
          <text
            x="202"
            y="128"
            textAnchor="middle"
            fontFamily="DM Sans"
            fontWeight="500"
            fontSize="18"
            fill="#34ADE4"
          >
            72
          </text>
          <text
            x="202"
            y="144"
            textAnchor="middle"
            fontFamily="Pretendard, sans-serif"
            fontSize="11"
            fill="#34ADE4"
          >
            하락 일 수
          </text>
        </svg>
        <div className="stat">0.43</div>
      </div>
      <div className="foot">
        <span className="desc">
          1년간, 상승일 비중이 높아 상승 흐름이 비교적 일관됩니다.
        </span>
        <span className="rank">
          해당 기간 중 상위<b>12%</b>
        </span>
      </div>
    </article>
  )
}

/* 6 · RS */
export function RsItemCard({ stock = 'SK하이닉스' }: { stock?: string } = {}) {
  return (
    <article className="sdCard sdCard--metric">
      <div className="title">RS</div>
      <div className="sub">
        KOSPI 대비 얼마나 더 성과가 있는지를 의미합니다.
      </div>
      <div className="legend">
        <span>
          <span className="dot" style={{ background: '#9380F7' }} />
          {stock}
        </span>
        <span>
          <span
            className="dot"
            style={{ background: 'linear-gradient(135deg,#FFCB94,#EEB8ED)' }}
          />
          KOSPI
        </span>
      </div>
      <div className="body">
        <div style={{ flex: 1 }}>
          <div style={{ width: '60%' }}>
            <svg
              viewBox="0 0 220 60"
              width="100%"
              height="34"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="rsfillItem" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,147,100,.42)" />
                  <stop offset="100%" stopColor="rgba(242,95,51,0)" />
                </linearGradient>
              </defs>
              <path
                d="M0,40 C20,34 36,32 60,38 C84,46 110,22 134,24 C158,26 182,32 220,12 L220,60 L0,60 Z"
                fill="url(#rsfillItem)"
              />
              <path
                d="M0,40 C20,34 36,32 60,38 C84,46 110,22 134,24 C158,26 182,32 220,12"
                stroke="#F25F33"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M0,48 C30,40 60,32 100,28 C140,24 170,16 200,12 C214,10 218,8 220,8"
                stroke="#9380F7"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
        </div>
        <div className="stat">
          +12<span className="pct">%</span>
        </div>
      </div>
      <div className="foot">
        <span className="desc">KOSPI를 일관되게 상회하고 있습니다.</span>
        <span className="rank">
          해당 기간 중 상위<b>8%</b>
        </span>
      </div>
    </article>
  )
}

/* 7 · EPS */
export function EpsCard() {
  return (
    <article className="sdCard sdCard--metric">
      <div className="title">EPS</div>
      <div className="sub">분기별 주당순이익(EPS) 추이를 의미합니다.</div>
      <div className="body">
        <svg
          width="240"
          height="100"
          viewBox="0 0 240 100"
          style={{ flexShrink: 0 }}
        >
          <line
            x1="10"
            y1="68"
            x2="230"
            y2="68"
            stroke="rgba(255,255,255,.06)"
            strokeDasharray="2 4"
          />
          <line
            x1="10"
            y1="40"
            x2="230"
            y2="40"
            stroke="rgba(255,255,255,.06)"
            strokeDasharray="2 4"
          />
          <line
            x1="10"
            y1="16"
            x2="230"
            y2="16"
            stroke="rgba(255,255,255,.06)"
            strokeDasharray="2 4"
          />
          <g>
            <circle cx="30" cy="64" r="10" fill="#FF3636" opacity=".22" />
            <circle cx="30" cy="64" r="6" fill="#FF3636" />
            <circle cx="80" cy="50" r="10" fill="#FF3636" opacity=".22" />
            <circle cx="80" cy="50" r="6" fill="#FF3636" />
            <circle cx="125" cy="56" r="10" fill="#34ADE4" opacity=".22" />
            <circle cx="125" cy="56" r="6" fill="#34ADE4" />
            <circle cx="170" cy="30" r="10" fill="#FF3636" opacity=".22" />
            <circle cx="170" cy="30" r="6" fill="#FF3636" />
            <circle cx="215" cy="18" r="10" fill="#FF3636" opacity=".22" />
            <circle cx="215" cy="18" r="6" fill="#FF3636" />
          </g>
          <g
            fontFamily="DM Sans, sans-serif"
            fontSize="9"
            fill="rgba(255,255,255,.5)"
            textAnchor="middle"
          >
            <text x="30" y="94">
              25 Q1
            </text>
            <text x="80" y="94">
              25 Q2
            </text>
            <text x="125" y="94">
              25 Q3
            </text>
            <text x="170" y="94">
              25 Q4
            </text>
            <text x="215" y="94">
              26 Q1
            </text>
          </g>
        </svg>
        <div className="stat">
          +50.3<span className="pct">%</span>
        </div>
      </div>
      <div className="foot">
        <span className="desc">EPS가 안정적인 상승세를 보입니다.</span>
        <span className="rank">
          해당 기간 중 상위<b>36%</b>
        </span>
      </div>
    </article>
  )
}

/* 8 · 베이스 단계 */
export function BaseStageCard({
  stage = 'early',
}: {
  stage?: 'early' | 'late'
} = {}) {
  const late = stage === 'late'
  return (
    <article className="sdCard sdCard--base">
      <div className="titleRow">
        <span className="title">베이스 단계</span>
      </div>
      <div className="sub">현재 주가가 어떤 구간에 있는지 나타냅니다.</div>
      <div className="body">
        <div className="left">
          <div className="chart">
            {late ? (
              <svg viewBox="0 0 320 130">
                <line
                  x1="0"
                  y1="86"
                  x2="108"
                  y2="86"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <line
                  x1="0"
                  y1="116"
                  x2="108"
                  y2="116"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <rect
                  x="0"
                  y="86"
                  width="108"
                  height="30"
                  fill="rgba(238,184,45,0.08)"
                />
                <line
                  x1="116"
                  y1="54"
                  x2="216"
                  y2="54"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <line
                  x1="116"
                  y1="82"
                  x2="216"
                  y2="82"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <rect
                  x="116"
                  y="54"
                  width="100"
                  height="28"
                  fill="rgba(238,184,45,0.08)"
                />
                <line
                  x1="224"
                  y1="20"
                  x2="320"
                  y2="20"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <line
                  x1="224"
                  y1="48"
                  x2="320"
                  y2="48"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <rect
                  x="224"
                  y="20"
                  width="96"
                  height="28"
                  fill="rgba(238,184,45,0.08)"
                />
                <g>
                  <line
                    x1="10"
                    x2="10"
                    y1="100"
                    y2="112"
                    stroke="#2D5A6A"
                    strokeWidth="1.4"
                  />
                  <rect x="5" y="104" width="10" height="6" fill="#2D5A6A" />
                  <line
                    x1="26"
                    x2="26"
                    y1="98"
                    y2="110"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="21" y="100" width="10" height="8" fill="#8B2828" />
                  <line
                    x1="42"
                    x2="42"
                    y1="96"
                    y2="108"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="37" y="98" width="10" height="8" fill="#8B2828" />
                  <line
                    x1="58"
                    x2="58"
                    y1="92"
                    y2="104"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="53" y="94" width="10" height="8" fill="#8B2828" />
                  <line
                    x1="74"
                    x2="74"
                    y1="90"
                    y2="100"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="69" y="92" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="90"
                    x2="90"
                    y1="86"
                    y2="96"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="85" y="88" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="106"
                    x2="106"
                    y1="78"
                    y2="88"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="101" y="80" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="122"
                    x2="122"
                    y1="72"
                    y2="82"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="117" y="74" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="138"
                    x2="138"
                    y1="68"
                    y2="78"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="133" y="70" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="154"
                    x2="154"
                    y1="66"
                    y2="76"
                    stroke="#2D5A6A"
                    strokeWidth="1.4"
                  />
                  <rect x="149" y="68" width="10" height="6" fill="#2D5A6A" />
                  <line
                    x1="170"
                    x2="170"
                    y1="62"
                    y2="74"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="165" y="64" width="10" height="8" fill="#FF3636" />
                  <line
                    x1="186"
                    x2="186"
                    y1="60"
                    y2="70"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="181" y="62" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="202"
                    x2="202"
                    y1="58"
                    y2="68"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="197" y="60" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="218"
                    x2="218"
                    y1="50"
                    y2="60"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="213" y="52" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="234"
                    x2="234"
                    y1="42"
                    y2="52"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="229" y="44" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="250"
                    x2="250"
                    y1="36"
                    y2="46"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="245" y="38" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="266"
                    x2="266"
                    y1="34"
                    y2="44"
                    stroke="#2D5A6A"
                    strokeWidth="1.4"
                  />
                  <rect x="261" y="36" width="10" height="6" fill="#2D5A6A" />
                  <line
                    x1="282"
                    x2="282"
                    y1="32"
                    y2="42"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="277" y="34" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="298"
                    x2="298"
                    y1="28"
                    y2="38"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="293" y="30" width="10" height="6" fill="#FF3636" />
                  <line
                    x1="314"
                    x2="314"
                    y1="26"
                    y2="36"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="309" y="28" width="10" height="6" fill="#FF3636" />
                </g>
              </svg>
            ) : (
              <svg viewBox="0 0 320 130">
                <line
                  x1="0"
                  y1="22"
                  x2="300"
                  y2="22"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <line
                  x1="0"
                  y1="110"
                  x2="300"
                  y2="110"
                  stroke="#EEB82D"
                  strokeWidth="1.5"
                />
                <rect
                  x="0"
                  y="22"
                  width="300"
                  height="88"
                  fill="rgba(238,184,45,0.08)"
                />
                <g>
                  <line
                    x1="24"
                    x2="24"
                    y1="56"
                    y2="92"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="18" y="62" width="12" height="22" fill="#8B2828" />
                  <line
                    x1="48"
                    x2="48"
                    y1="64"
                    y2="96"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="42" y="68" width="12" height="22" fill="#8B2828" />
                  <line
                    x1="72"
                    x2="72"
                    y1="78"
                    y2="104"
                    stroke="#2D5A6A"
                    strokeWidth="1.4"
                  />
                  <rect x="66" y="82" width="12" height="18" fill="#2D5A6A" />
                  <line
                    x1="96"
                    x2="96"
                    y1="64"
                    y2="92"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="90" y="70" width="12" height="18" fill="#8B2828" />
                  <line
                    x1="120"
                    x2="120"
                    y1="56"
                    y2="84"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="114" y="62" width="12" height="18" fill="#8B2828" />
                  <line
                    x1="144"
                    x2="144"
                    y1="68"
                    y2="92"
                    stroke="#2D5A6A"
                    strokeWidth="1.4"
                  />
                  <rect x="138" y="72" width="12" height="14" fill="#2D5A6A" />
                  <line
                    x1="168"
                    x2="168"
                    y1="50"
                    y2="78"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="162" y="56" width="12" height="18" fill="#8B2828" />
                  <line
                    x1="192"
                    x2="192"
                    y1="42"
                    y2="72"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="186" y="46" width="12" height="22" fill="#8B2828" />
                  <line
                    x1="216"
                    x2="216"
                    y1="38"
                    y2="66"
                    stroke="#8B2828"
                    strokeWidth="1.4"
                  />
                  <rect x="210" y="42" width="12" height="20" fill="#8B2828" />
                  <line
                    x1="240"
                    x2="240"
                    y1="32"
                    y2="58"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="234" y="36" width="12" height="20" fill="#FF3636" />
                  <line
                    x1="264"
                    x2="264"
                    y1="28"
                    y2="54"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="258" y="32" width="12" height="20" fill="#FF3636" />
                  <line
                    x1="288"
                    x2="288"
                    y1="26"
                    y2="52"
                    stroke="#FF3636"
                    strokeWidth="1.4"
                  />
                  <rect x="282" y="30" width="12" height="20" fill="#FF3636" />
                </g>
              </svg>
            )}
          </div>
          <span className="desc">
            {late
              ? '강한 시세 분출이 예상됩니다'
              : '초기 상승 흐름이 예상 됩니다'}
          </span>
        </div>
        <div className="right">
          <span className={late ? 'stage red' : 'stage yellow'}>
            {late ? '3단계' : '2단계'}
          </span>
        </div>
      </div>
      <span className="botSub">
        {late ? '시세 분출 구간, 매도 준비 필요' : '초기 상승 구간, 매수 적합'}
      </span>
    </article>
  )
}

export function ItemGrid({ stock = 'SK하이닉스' }: { stock?: string } = {}) {
  return (
    <div className="itemGrid">
      <RegimeItemCard regime="start" />
      <MovelineCard />
      <MomentumItemCard />
      <VolumeCard />
      <StabilityItemCard />
      <RsItemCard stock={stock} />
      <EpsCard />
      <BaseStageCard />
    </div>
  )
}
