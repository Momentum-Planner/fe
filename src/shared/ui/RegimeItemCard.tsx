import type { Regime } from '@/shared/lib/snapshots'
import { REGIME_COLOR } from '@/shared/lib/snapshots'
import { RegimeIcon } from '@/shared/ui/RegimeIcon'
import './regime-item-card.css'

/**
 * 주식 레짐 아이템 카드 — full card with mini candle chart per regime
 * (돌파성공 / 돌파준비 / 돌파실패 / 하방이탈 / 방향미정). Ported from the design's
 * preview/regime-*.html. Self-contained; usable anywhere.
 */
export function RegimeItemCard({ regime }: { regime: Regime }) {
  return <article className="ri">{CONTENT[regime]}</article>
}

const CONTENT: Record<Regime, React.ReactNode> = {
  start: (
    <>
      <div className="titleRow">
        <span className="icon">
          <RegimeIcon
            regime="start"
            width={40}
            height={32}
            style={{ color: REGIME_COLOR.start }}
          />
        </span>
        <span className="title red">돌파성공</span>
      </div>
      <div className="sub">
        베이스의 저항선을 뚫고 상승하기 시작한 상태입니다.
      </div>
      <div className="body">
        <div className="chart">
          <svg viewBox="0 0 360 160">
            <line
              x1="0"
              y1="42"
              x2="320"
              y2="42"
              stroke="#EEB82D"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="142"
              x2="320"
              y2="142"
              stroke="#EEB82D"
              strokeWidth="1.5"
            />
            <rect
              x="0"
              y="42"
              width="320"
              height="100"
              fill="rgba(238,184,45,0.10)"
            />
            <g>
              <line
                x1="32"
                x2="32"
                y1="74"
                y2="118"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="24" y="82" width="16" height="26" fill="#FF3636" />
              <line
                x1="58"
                x2="58"
                y1="78"
                y2="128"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="50" y="92" width="16" height="24" fill="#FF3636" />
              <line
                x1="84"
                x2="84"
                y1="98"
                y2="138"
                stroke="#34ADE4"
                strokeWidth="1.2"
              />
              <rect x="76" y="104" width="16" height="22" fill="#34ADE4" />
              <line
                x1="110"
                x2="110"
                y1="90"
                y2="120"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="102" y="96" width="16" height="20" fill="#FF3636" />
              <line
                x1="136"
                x2="136"
                y1="76"
                y2="110"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="128" y="82" width="16" height="20" fill="#FF3636" />
              <line
                x1="162"
                x2="162"
                y1="82"
                y2="104"
                stroke="#34ADE4"
                strokeWidth="1.2"
              />
              <rect x="154" y="86" width="16" height="14" fill="#34ADE4" />
              <line
                x1="188"
                x2="188"
                y1="68"
                y2="98"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="180" y="74" width="16" height="18" fill="#FF3636" />
              <line
                x1="214"
                x2="214"
                y1="60"
                y2="84"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="206" y="64" width="16" height="16" fill="#FF3636" />
              <line
                x1="240"
                x2="240"
                y1="52"
                y2="76"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="232" y="56" width="16" height="16" fill="#FF3636" />
              <line
                x1="266"
                x2="266"
                y1="46"
                y2="68"
                stroke="#FF3636"
                strokeWidth="1.2"
              />
              <rect x="258" y="48" width="16" height="16" fill="#FF3636" />
              <line
                x1="292"
                x2="292"
                y1="14"
                y2="62"
                stroke="#FF3636"
                strokeWidth="1.5"
              />
              <rect x="284" y="20" width="18" height="38" fill="#FF3636" />
            </g>
          </svg>
        </div>
        <div className="pillCol">
          <div className="pRow">
            <span className="lhs">
              <span className="dot today-red" />
              오늘 가격
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow">
            <span className="lhs">
              <span className="dot resist" />
              저항선
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow">
            <span className="lhs">
              <span className="dot support" />
              지지선
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
        </div>
      </div>
      <div className="foot">
        <span className="desc">저항선 대비 오늘 가격</span>
        <span className="pct red">+13%</span>
      </div>
    </>
  ),

  prep: (
    <>
      <div className="titleRow">
        <span className="icon">
          <RegimeIcon
            regime="prep"
            width={40}
            height={32}
            style={{ color: REGIME_COLOR.prep }}
          />
        </span>
        <span className="title orange">돌파준비</span>
      </div>
      <div className="sub">베이스 내에서 돌파 준비 중인 상태 입니다.</div>
      <div className="body">
        <div className="chart">
          <svg viewBox="0 0 360 160">
            <line
              x1="0"
              y1="22"
              x2="320"
              y2="22"
              stroke="#EEB82D"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="138"
              x2="320"
              y2="138"
              stroke="#EEB82D"
              strokeWidth="1.5"
            />
            <rect
              x="0"
              y="22"
              width="320"
              height="116"
              fill="rgba(238,184,45,0.06)"
            />
            <g>
              <line
                x1="32"
                x2="32"
                y1="32"
                y2="80"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="24" y="38" width="16" height="38" fill="#8B2828" />
              <line
                x1="64"
                x2="64"
                y1="50"
                y2="102"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="56" y="58" width="16" height="38" fill="#8B2828" />
              <line
                x1="96"
                x2="96"
                y1="82"
                y2="120"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="88" y="88" width="16" height="24" fill="#2D5A6A" />
              <line
                x1="128"
                x2="128"
                y1="100"
                y2="130"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="120" y="106" width="16" height="18" fill="#2D5A6A" />
              <line
                x1="160"
                x2="160"
                y1="90"
                y2="120"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="152" y="96" width="16" height="20" fill="#2D5A6A" />
              <line
                x1="192"
                x2="192"
                y1="56"
                y2="100"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="184" y="62" width="16" height="32" fill="#8B2828" />
              <line
                x1="224"
                x2="224"
                y1="70"
                y2="100"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="216" y="76" width="16" height="20" fill="#2D5A6A" />
              <line
                x1="256"
                x2="256"
                y1="50"
                y2="86"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="248" y="56" width="16" height="26" fill="#8B2828" />
              <line
                x1="288"
                x2="288"
                y1="38"
                y2="68"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="280" y="44" width="16" height="20" fill="#8B2828" />
              <line
                x1="320"
                x2="320"
                y1="32"
                y2="80"
                stroke="#FF3636"
                strokeWidth="1.6"
              />
              <rect x="310" y="38" width="20" height="38" fill="#FF3636" />
            </g>
          </svg>
        </div>
        <div className="pillCol">
          <div className="pRow">
            <span className="lhs">
              <span className="dot resist" />
              저항선
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow">
            <span className="lhs">
              <span className="dot today-red" />
              오늘 가격
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow">
            <span className="lhs">
              <span className="dot support" />
              지지선
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
        </div>
      </div>
      <div className="foot">
        <span className="desc">저항선 대비 오늘 가격</span>
        <span className="pct red">+64%</span>
      </div>
    </>
  ),

  fail: (
    <>
      <div className="titleRow">
        <span className="icon">
          <RegimeIcon
            regime="fail"
            width={40}
            height={32}
            style={{ color: REGIME_COLOR.fail }}
          />
        </span>
        <span className="title blue">돌파실패</span>
      </div>
      <div className="sub">베이스의 저항선과 부딪히고 하락하는 상태입니다.</div>
      <div className="body">
        <div className="chart">
          <svg viewBox="0 0 360 160">
            <line
              x1="0"
              y1="18"
              x2="320"
              y2="18"
              stroke="#EEB82D"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="142"
              x2="320"
              y2="142"
              stroke="#EEB82D"
              strokeWidth="1.5"
            />
            <rect
              x="0"
              y="18"
              width="320"
              height="124"
              fill="rgba(238,184,45,0.06)"
            />
            <g>
              <line
                x1="30"
                x2="30"
                y1="104"
                y2="130"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="22" y="110" width="16" height="18" fill="#8B2828" />
              <line
                x1="60"
                x2="60"
                y1="62"
                y2="120"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="52" y="70" width="16" height="44" fill="#8B2828" />
              <line
                x1="90"
                x2="90"
                y1="74"
                y2="102"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="82" y="80" width="16" height="18" fill="#2D5A6A" />
              <line
                x1="120"
                x2="120"
                y1="48"
                y2="100"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="112" y="56" width="16" height="38" fill="#8B2828" />
              <line
                x1="150"
                x2="150"
                y1="58"
                y2="88"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="142" y="64" width="16" height="20" fill="#2D5A6A" />
              <line
                x1="180"
                x2="180"
                y1="32"
                y2="92"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="172" y="40" width="16" height="46" fill="#8B2828" />
              <line
                x1="210"
                x2="210"
                y1="56"
                y2="88"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="202" y="62" width="16" height="22" fill="#2D5A6A" />
              <line
                x1="240"
                x2="240"
                y1="46"
                y2="94"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="232" y="52" width="16" height="36" fill="#8B2828" />
              <line
                x1="270"
                x2="270"
                y1="76"
                y2="102"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="262" y="82" width="16" height="18" fill="#2D5A6A" />
              <line
                x1="300"
                x2="300"
                y1="92"
                y2="124"
                stroke="#34ADE4"
                strokeWidth="1.6"
              />
              <rect x="290" y="98" width="20" height="22" fill="#34ADE4" />
            </g>
          </svg>
        </div>
        <div className="pillCol">
          <div className="pRow">
            <span className="lhs">
              <span className="dot resist" />
              저항선
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow">
            <span className="lhs">
              <span className="dot today-blue" />
              오늘 가격
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow">
            <span className="lhs">
              <span className="dot support" />
              지지선
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
        </div>
      </div>
      <div className="foot">
        <span className="desc">저항선 대비 오늘 가격</span>
        <span className="pct blue">-66%</span>
      </div>
    </>
  ),

  drop: (
    <>
      <div className="titleRow">
        <span className="icon">
          <RegimeIcon
            regime="drop"
            width={40}
            height={32}
            style={{ color: REGIME_COLOR.drop }}
          />
        </span>
        <span className="title violet">하방이탈</span>
      </div>
      <div className="sub">최근 베이스의 지지선보다 하락하는 상태입니다.</div>
      <div className="body">
        <div className="chart">
          <svg viewBox="0 0 360 160">
            <line
              x1="0"
              y1="32"
              x2="340"
              y2="32"
              stroke="#EEB82D"
              strokeWidth="1.5"
            />
            <g>
              <line
                x1="35"
                x2="35"
                y1="18"
                y2="50"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="25" y="22" width="20" height="20" fill="#2D5A6A" />
              <line
                x1="75"
                x2="75"
                y1="42"
                y2="84"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="65" y="48" width="20" height="30" fill="#2D5A6A" />
              <line
                x1="115"
                x2="115"
                y1="62"
                y2="92"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="105" y="68" width="20" height="18" fill="#2D5A6A" />
              <line
                x1="155"
                x2="155"
                y1="58"
                y2="92"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="145" y="64" width="20" height="22" fill="#8B2828" />
              <line
                x1="195"
                x2="195"
                y1="80"
                y2="106"
                stroke="#2D5A6A"
                strokeWidth="1.5"
              />
              <rect x="185" y="86" width="20" height="14" fill="#2D5A6A" />
              <line
                x1="235"
                x2="235"
                y1="76"
                y2="108"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="225" y="82" width="20" height="22" fill="#8B2828" />
              <line
                x1="275"
                x2="275"
                y1="88"
                y2="124"
                stroke="#8B2828"
                strokeWidth="1.5"
              />
              <rect x="265" y="94" width="20" height="26" fill="#8B2828" />
              <line
                x1="315"
                x2="315"
                y1="110"
                y2="136"
                stroke="#34ADE4"
                strokeWidth="1.6"
              />
              <rect x="305" y="116" width="20" height="14" fill="#34ADE4" />
            </g>
          </svg>
        </div>
        <div className="pillCol">
          <div className="pRow">
            <span className="lhs">
              <span className="dot support" />
              지지선
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow">
            <span className="lhs">
              <span className="dot today-blue" />
              오늘 가격
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
        </div>
      </div>
      <div className="foot">
        <span className="desc">지지선 대비 오늘 가격</span>
        <span className="pct blue">-44%</span>
      </div>
    </>
  ),

  none: (
    <>
      <div className="titleRow">
        <span className="icon">
          <RegimeIcon
            regime="none"
            width={40}
            height={32}
            style={{ color: REGIME_COLOR.none }}
          />
        </span>
        <span className="title grey">방향미정</span>
      </div>
      <div className="sub">방향이 정해지지 않은 상태입니다.</div>
      <div className="body">
        <div className="chart">
          <svg viewBox="0 0 360 160">
            <rect x="0" y="0" width="360" height="160" fill="transparent" />
            <line
              x1="20"
              y1="84"
              x2="212"
              y2="84"
              stroke="rgba(255,255,255,.35)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="pillCol">
          <div className="pRow">
            <span className="lhs">
              <span className="dot" style={{ background: '#fff' }} />
              오늘 가격
            </span>
            <span className="val">₩ 65,2400</span>
          </div>
          <div className="pRow grey">
            <span className="lhs">
              <span className="dot grey" />
              저항선
            </span>
            <span className="val">---</span>
          </div>
          <div className="pRow grey">
            <span className="lhs">
              <span className="dot grey" />
              지지선
            </span>
            <span className="val">---</span>
          </div>
        </div>
      </div>
    </>
  ),
}
