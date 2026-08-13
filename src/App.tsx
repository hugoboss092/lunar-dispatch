import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BatteryCharging,
  Box,
  Check,
  ChevronRight,
  Clock3,
  Coins,
  Crosshair,
  Flag,
  Gauge,
  RotateCcw,
  Route,
  ShieldAlert,
  Star,
  Truck,
  Weight,
  Wrench,
  Zap,
} from 'lucide-react'
import {
  calculateMission,
  canLaunchMission,
  launchMission,
  progressGame,
  rechargeFleet,
  type GameState,
  type Order,
  type RiskLevel,
  type Rover,
} from './game/game'
import { clearGame, loadGame, saveGame } from './game/storage'

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'низкий',
  medium: 'средний',
  high: 'высокий',
}

const BASE = { x: 48, y: 50 }

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value)
}

function StatusDot({ status }: { status: Rover['status'] }) {
  return <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
}

function Battery({ value }: { value: number }) {
  return (
    <div className="battery" title={`Заряд ${value}%`}>
      <span className="battery__track"><span style={{ width: `${value}%` }} /></span>
      <strong>{value}%</strong>
    </div>
  )
}

function LunarMap({ game, selectedOrderId, onSelectOrder }: {
  game: GameState
  selectedOrderId: string
  onSelectOrder: (id: string) => void
}) {
  const activeDeliveries = game.deliveries.filter((item) => item.status === 'en-route')

  return (
    <section className="map-panel" aria-label="Тактическая карта Луны">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">СЕКТОР 4-A / ЮЖНЫЙ ПОЛЮС</span>
          <h2>Карта операций</h2>
        </div>
        <div className="map-legend">
          <span><i className="legend-dot legend-dot--safe" /> безопасно</span>
          <span><i className="legend-dot legend-dot--risk" /> опасная зона</span>
        </div>
      </div>

      <div className="moon-map">
        <div className="map-grid" />
        <div className="terrain terrain--mare" />
        <div className="terrain terrain--ridge" />
        <div className="terrain terrain--crater" />
        <div className="crater crater--one" />
        <div className="crater crater--two" />
        <div className="crater crater--three" />
        <div className="crater crater--four" />

        <span className="zone-label zone-label--mare">МОРЕ<br />СПОКОЙСТВИЯ</span>
        <span className="zone-label zone-label--ridge">ХРЕБЕТ<br />МАЛАПЕРТ</span>
        <span className="zone-label zone-label--crater">КРАТЕР<br />ШЕКЛТОН</span>

        <svg className="routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {game.orders.map((order) => (
            <line
              key={order.id}
              className={`route-line ${order.id === selectedOrderId ? 'route-line--selected' : ''} ${order.status === 'delivered' ? 'route-line--done' : ''}`}
              x1={BASE.x} y1={BASE.y} x2={order.position.x} y2={order.position.y}
            />
          ))}
        </svg>

        <div className="base-marker" style={{ left: `${BASE.x}%`, top: `${BASE.y}%` }}>
          <span className="base-marker__pulse" />
          <span className="base-marker__core"><Crosshair size={21} /></span>
          <b>БАЗА АРТЕМИДА</b>
        </div>

        {game.orders.map((order) => (
          <button
            key={order.id}
            className={`map-order map-order--${order.risk} ${selectedOrderId === order.id ? 'is-selected' : ''} map-order--${order.status}`}
            style={{ left: `${order.position.x}%`, top: `${order.position.y}%` }}
            onClick={() => onSelectOrder(order.id)}
            aria-label={`${order.title}, ${order.station}`}
          >
            <span className="map-order__pin">{order.status === 'delivered' ? <Check size={16} /> : order.weight}</span>
            <span className="map-order__label">{order.station.replace(/[«»]/g, '')}</span>
          </button>
        ))}

        {activeDeliveries.map((delivery) => {
          const order = game.orders.find((item) => item.id === delivery.orderId)!
          const rover = game.rovers.find((item) => item.id === delivery.roverId)!
          const x = BASE.x + (order.position.x - BASE.x) * (delivery.progress / 100)
          const y = BASE.y + (order.position.y - BASE.y) * (delivery.progress / 100)
          return (
            <div className="moving-rover" key={delivery.id} style={{ left: `${x}%`, top: `${y}%`, '--rover-color': rover.color } as React.CSSProperties}>
              <Truck size={17} />
              <span>{delivery.progress}%</span>
            </div>
          )
        })}

        <div className="map-coordinate">88.4°S&nbsp;&nbsp; 15.0°W</div>
      </div>
    </section>
  )
}

function OrderCard({ order, selected, onSelect }: { order: Order; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`order-card ${selected ? 'is-selected' : ''} order-card--${order.status}`} onClick={onSelect} aria-label={`${order.title}, ${order.station}`}>
      <span className="order-card__topline">
        <span className={`risk risk--${order.risk}`}>{RISK_LABELS[order.risk]} риск</span>
        <strong>{formatNumber(order.reward)} <small>кр.</small></strong>
      </span>
      <span className="order-card__title">{order.title}</span>
      <span className="order-card__station">{order.station}</span>
      <span className="order-card__meta">
        <span><Weight size={13} /> {order.weight} кг</span>
        <span><Route size={13} /> {order.distance} км</span>
        <span><Clock3 size={13} /> {order.urgency} ч</span>
      </span>
      {order.status !== 'available' ? <span className={`order-state order-state--${order.status}`}>{order.status === 'in-transit' ? 'В ПУТИ' : order.status === 'delivered' ? 'ДОСТАВЛЕН' : 'ПОТЕРЯН'}</span> : null}
    </button>
  )
}

function RoverCard({ rover, selected, compatible, reason, onSelect }: {
  rover: Rover
  selected: boolean
  compatible: boolean
  reason?: string
  onSelect: () => void
}) {
  return (
    <button className={`rover-card ${selected ? 'is-selected' : ''} ${!compatible ? 'is-incompatible' : ''}`} onClick={onSelect} aria-label={`${rover.name}, ${rover.model}`}>
      <span className="rover-card__icon" style={{ '--rover-color': rover.color } as React.CSSProperties}><Truck size={20} /></span>
      <span className="rover-card__body">
        <span className="rover-card__name"><StatusDot status={rover.status} /><strong>{rover.name}</strong><small>{rover.model}</small></span>
        <span className="rover-card__stats">
          <Battery value={rover.battery} />
          <span><Box size={13} /> {rover.capacity} кг</span>
        </span>
        {!compatible && reason ? <span className="rover-card__warning">{reason}</span> : null}
      </span>
      <ChevronRight size={17} />
    </button>
  )
}

function App() {
  const [game, setGame] = useState<GameState>(() => loadGame())
  const [selectedOrderId, setSelectedOrderId] = useState(() => game.orders.find((item) => item.status === 'available')?.id ?? game.orders[0].id)
  const [selectedRoverId, setSelectedRoverId] = useState(() => game.rovers.find((item) => item.status === 'available')?.id ?? game.rovers[0].id)
  const [showBriefing, setShowBriefing] = useState(true)

  const selectedOrder = game.orders.find((item) => item.id === selectedOrderId) ?? game.orders[0]
  const selectedRover = game.rovers.find((item) => item.id === selectedRoverId) ?? game.rovers[0]
  const launchCheck = useMemo(
    () => canLaunchMission(game, selectedRover.id, selectedOrder.id),
    [game, selectedOrder.id, selectedRover.id],
  )
  const estimate = useMemo(
    () => calculateMission(selectedRover, selectedOrder, game.zones),
    [game.zones, selectedOrder, selectedRover],
  )
  const currentZone = game.zones.find((item) => item.id === selectedOrder.zoneId)!
  const deliveredCount = game.orders.filter((item) => item.status === 'delivered').length
  const activeCount = game.deliveries.filter((item) => item.status === 'en-route').length
  const gameOver = game.day > game.maxDays || game.rating <= 0
  const goalReached = game.credits >= game.targetCredits

  useEffect(() => saveGame(game), [game])

  useEffect(() => {
    if (!game.deliveries.some((item) => item.status === 'en-route')) return
    const timer = window.setInterval(() => setGame((current) => progressGame(current)), 500)
    return () => window.clearInterval(timer)
  }, [game.deliveries])

  const selectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId)
  }, [])

  function handleLaunch() {
    if (!launchCheck.ok) return
    setGame((current) => launchMission(current, selectedRover.id, selectedOrder.id))
  }

  function handleNextDay() {
    if (activeCount > 0 || gameOver) return
    setGame((current) => rechargeFleet(current))
  }

  function handleReset() {
    const fresh = clearGame()
    setGame(fresh)
    setSelectedOrderId(fresh.orders[0].id)
    setSelectedRoverId(fresh.rovers[0].id)
    setShowBriefing(true)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark"><span /></span>
          <div><span className="eyebrow">ARTEMIS BASE / OPS CONSOLE</span><h1>LUNAR DISPATCH</h1></div>
        </div>
        <div className="mission-clock">
          <span>СОЛ <strong>{String(game.day).padStart(2, '0')}</strong> / {String(game.maxDays).padStart(2, '0')}</span>
          <span className="live"><i /> связь стабильна</span>
        </div>
        <div className="top-stats">
          <div><Coins size={17} /><span>БАЛАНС<strong>{formatNumber(game.credits)} кр.</strong></span></div>
          <div><Star size={17} /><span>СЧЁТ<strong>{formatNumber(game.score)}</strong></span></div>
          <div><Gauge size={17} /><span>РЕЙТИНГ<strong>{game.rating}%</strong></span></div>
        </div>
        <button className="icon-button" onClick={handleReset} title="Начать заново" aria-label="Начать заново"><RotateCcw size={17} /></button>
      </header>

      <section className="goal-strip">
        <span><Flag size={15} /> ЦЕЛЬ ЭКСПЕДИЦИИ</span>
        <p>Накопите <strong>{formatNumber(game.targetCredits)} кредитов</strong> за 7 лунных смен. Берегите рейтинг базы.</p>
        <div className="goal-progress"><span style={{ width: `${Math.min(100, (game.credits / game.targetCredits) * 100)}%` }} /></div>
        <b>{Math.round((game.credits / game.targetCredits) * 100)}%</b>
      </section>

      {(gameOver || goalReached) && (
        <section className={`game-banner ${goalReached ? 'game-banner--success' : ''}`}>
          <div>{goalReached ? <Star /> : <AlertTriangle />}<span><strong>{goalReached ? 'Цель достигнута' : 'Экспедиция завершена'}</strong>{goalReached ? 'База обеспечена. Можно продолжить ради рекорда.' : `Итоговый счёт: ${formatNumber(game.score)}`}</span></div>
          <button onClick={handleReset}>Новая экспедиция</button>
        </section>
      )}

      <div className="workspace">
        <LunarMap game={game} selectedOrderId={selectedOrderId} onSelectOrder={selectOrder} />

        <aside className="dispatch-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">ДИСПЕТЧЕРСКАЯ</span><h2>План доставки</h2></div>
            <span className="step-count">01—03</span>
          </div>

          <section className="panel-section">
            <div className="section-title"><span>01</span><h3>Выберите заказ</h3><small>{game.orders.filter((item) => item.status === 'available').length} доступно</small></div>
            <div className="orders-list">
              {game.orders.map((order) => <OrderCard key={order.id} order={order} selected={selectedOrderId === order.id} onSelect={() => selectOrder(order.id)} />)}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title"><span>02</span><h3>Назначьте ровер</h3><small>{game.rovers.filter((item) => item.status === 'available').length} свободно</small></div>
            <div className="rovers-list">
              {game.rovers.map((rover) => {
                const compatibility = canLaunchMission(game, rover.id, selectedOrder.id)
                return <RoverCard key={rover.id} rover={rover} selected={selectedRoverId === rover.id} compatible={compatibility.ok} reason={compatibility.ok ? undefined : compatibility.reason} onSelect={() => setSelectedRoverId(rover.id)} />
              })}
            </div>
          </section>

          <section className="route-calculation">
            <div className="section-title"><span>03</span><h3>Расчёт маршрута</h3></div>
            <div className="route-summary">
              <div><Route /><span>ДИСТАНЦИЯ<strong>{selectedOrder.distance} км</strong></span></div>
              <div><BatteryCharging /><span>РАСХОД<strong>{estimate.energyCost}%</strong></span></div>
              <div><Clock3 /><span>ВРЕМЯ<strong>{estimate.duration} сек</strong></span></div>
              <div><ShieldAlert /><span>РИСК<strong>{estimate.risk}%</strong></span></div>
            </div>
            <div className="terrain-note"><span style={{ background: currentZone.color }} /><p><strong>{currentZone.name}</strong>{currentZone.label}: скорость ×{currentZone.speedMultiplier}, расход ×{currentZone.energyMultiplier}</p></div>

            {!launchCheck.ok ? (
              <div className="launch-warning"><AlertTriangle size={18} /><span><strong>Маршрут заблокирован</strong>{launchCheck.reason}</span></div>
            ) : (
              <div className="launch-ready"><Zap size={17} /><span>Ровер вернётся с зарядом {selectedRover.battery - launchCheck.estimate.energyCost}%</span></div>
            )}

            <button className="launch-button" disabled={!launchCheck.ok || gameOver} onClick={handleLaunch}>
              {launchCheck.ok ? <><span>Запустить доставку</span><ChevronRight /></> : <><span>Маршрут невозможен</span><AlertTriangle /></>}
            </button>
          </section>
        </aside>
      </div>

      <section className="operations-footer">
        <div className="delivery-board">
          <div className="footer-title"><span><Truck size={16} /> АКТИВНЫЕ ДОСТАВКИ</span><b>{activeCount}</b></div>
          {activeCount === 0 ? <p className="empty-state">Нет роверов на маршруте. Выберите заказ на карте.</p> : game.deliveries.filter((item) => item.status === 'en-route').map((delivery) => {
            const rover = game.rovers.find((item) => item.id === delivery.roverId)!
            const order = game.orders.find((item) => item.id === delivery.orderId)!
            return <div className="active-delivery" key={delivery.id}><span style={{ '--rover-color': rover.color } as React.CSSProperties}><Truck size={18} /></span><div><strong>{rover.name} → {order.station}</strong><small>в пути · риск {delivery.risk}%</small><div><i style={{ width: `${delivery.progress}%` }} /></div></div><b>{delivery.progress}%</b></div>
          })}
        </div>

        <div className="event-log">
          <div className="footer-title"><span>ЖУРНАЛ БАЗЫ</span><b>{deliveredCount}/{game.orders.length}</b></div>
          <div className="event-list">
            {game.events.slice(0, 4).map((item) => <div className={`event event--${item.kind}`} key={item.id}><time>{item.time}</time><i /><p>{item.message}</p></div>)}
          </div>
        </div>

        <div className="day-control">
          <span className="eyebrow">ЦИКЛ ЭКСПЕДИЦИИ</span>
          <strong>Смена {game.day} из {game.maxDays}</strong>
          <p>Следующая смена: +38% заряда, ремонт повреждений, сервис −120 кр.</p>
          <button disabled={activeCount > 0 || gameOver} onClick={handleNextDay}><Wrench size={16} /> Завершить смену</button>
        </div>
      </section>

      {showBriefing && (
        <div className="briefing-backdrop" role="presentation">
          <section className="briefing" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
            <span className="briefing__orbit"><i /><i /><i /></span>
            <span className="eyebrow">ПЕРЕДАЧА / 001</span>
            <h2 id="briefing-title">Добро пожаловать<br />на смену, диспетчер.</h2>
            <p>Колонисты ждут пайки. Выберите заказ на карте, назначьте подходящий ровер и оцените маршрут. Тяжёлый груз расходует больше энергии и замедляет движение.</p>
            <div className="briefing__rules">
              <span><Weight />Не превышайте грузоподъёмность</span>
              <span><BatteryCharging />Оставляйте запас батареи</span>
              <span><ShieldAlert />Риск может повредить ровер</span>
            </div>
            <button onClick={() => setShowBriefing(false)}>Принять смену <ChevronRight /></button>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
