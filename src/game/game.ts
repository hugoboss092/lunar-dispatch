export type RoverStatus = 'available' | 'en-route' | 'damaged'
export type OrderStatus = 'available' | 'in-transit' | 'delivered' | 'failed'
export type DeliveryStatus = 'en-route' | 'success' | 'failed'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface MapPoint {
  x: number
  y: number
}

export interface Rover {
  id: string
  name: string
  model: string
  battery: number
  capacity: number
  status: RoverStatus
  color: string
}

export interface Order {
  id: string
  title: string
  station: string
  cargo: string
  weight: number
  reward: number
  urgency: number
  risk: RiskLevel
  zoneId: string
  distance: number
  position: MapPoint
  status: OrderStatus
}

export interface Zone {
  id: string
  name: string
  label: string
  speedMultiplier: number
  energyMultiplier: number
  riskBonus: number
  color: string
}

export interface Delivery {
  id: string
  roverId: string
  orderId: string
  status: DeliveryStatus
  progress: number
  startedAt: number
  duration: number
  energyCost: number
  risk: number
}

export interface GameEvent {
  id: string
  day: number
  time: string
  kind: 'info' | 'success' | 'warning' | 'danger'
  message: string
}

export interface GameState {
  version: 1
  day: number
  maxDays: number
  credits: number
  score: number
  rating: number
  targetCredits: number
  rovers: Rover[]
  orders: Order[]
  deliveries: Delivery[]
  events: GameEvent[]
  zones: Zone[]
}

export interface MissionEstimate {
  energyCost: number
  duration: number
  risk: number
  loadRatio: number
}

export type LaunchCheck = { ok: true; estimate: MissionEstimate } | { ok: false; reason: string }

const RISK_VALUES: Record<RiskLevel, number> = {
  low: 4,
  medium: 10,
  high: 18,
}

const INITIAL_ZONES: Zone[] = [
  {
    id: 'mare',
    name: 'Море Спокойствия',
    label: 'Ровный реголит',
    speedMultiplier: 0.85,
    energyMultiplier: 0.9,
    riskBonus: 2,
    color: '#9db2b1',
  },
  {
    id: 'ridge',
    name: 'Хребет Малаперт',
    label: 'Каменистый склон',
    speedMultiplier: 1.45,
    energyMultiplier: 1.3,
    riskBonus: 9,
    color: '#d69055',
  },
  {
    id: 'crater',
    name: 'Кратер Шеклтон',
    label: 'Теневая низина',
    speedMultiplier: 1.2,
    energyMultiplier: 1.18,
    riskBonus: 6,
    color: '#7d8a93',
  },
]

const INITIAL_ROVERS: Rover[] = [
  { id: 'rover-atlas', name: 'АТЛАС-07', model: 'Тягач', battery: 88, capacity: 42, status: 'available', color: '#f3bb62' },
  { id: 'rover-scout', name: 'ИСКРА-12', model: 'Разведчик', battery: 96, capacity: 12, status: 'available', color: '#9fd4ce' },
  { id: 'rover-mule', name: 'МУЛ-03', model: 'Грузовой', battery: 61, capacity: 68, status: 'available', color: '#d68d68' },
]

const INITIAL_ORDERS: Order[] = [
  {
    id: 'order-shackleton', title: 'Медицинский рацион', station: 'Модуль «Шеклтон»', cargo: 'Пайки + электролиты',
    weight: 8, reward: 420, urgency: 5, risk: 'low', zoneId: 'mare', distance: 5.2,
    position: { x: 34, y: 31 }, status: 'available',
  },
  {
    id: 'order-peak', title: 'Аварийный резерв', station: 'Пик вечного света', cargo: '72-часовой резерв',
    weight: 19, reward: 910, urgency: 2, risk: 'high', zoneId: 'ridge', distance: 12.8,
    position: { x: 79, y: 20 }, status: 'available',
  },
  {
    id: 'order-tycho', title: 'Смена геологов', station: 'Лагерь «Тихо»', cargo: 'Рационы на 14 суток',
    weight: 26, reward: 680, urgency: 4, risk: 'medium', zoneId: 'crater', distance: 9.4,
    position: { x: 67, y: 72 }, status: 'available',
  },
  {
    id: 'order-horizon', title: 'Праздничный комплект', station: 'Ретранслятор «Горизонт»', cargo: 'Пайки + кофе',
    weight: 11, reward: 510, urgency: 3, risk: 'medium', zoneId: 'ridge', distance: 8.1,
    position: { x: 20, y: 73 }, status: 'available',
  },
  {
    id: 'order-impossible', title: 'Контейнер резерва', station: 'Склад «Кеплер»', cargo: 'Месячный запас базы',
    weight: 82, reward: 1600, urgency: 6, risk: 'high', zoneId: 'crater', distance: 14.6,
    position: { x: 88, y: 52 }, status: 'available',
  },
]

function clone<T>(value: T): T {
  return structuredClone(value)
}

function event(day: number, kind: GameEvent['kind'], message: string): GameEvent {
  return {
    id: `event-${day}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    day,
    time: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date()),
    kind,
    message,
  }
}

export function createInitialGame(): GameState {
  return {
    version: 1,
    day: 1,
    maxDays: 7,
    credits: 400,
    score: 0,
    rating: 100,
    targetCredits: 2600,
    rovers: clone(INITIAL_ROVERS),
    orders: clone(INITIAL_ORDERS),
    deliveries: [],
    events: [event(1, 'info', 'Смена началась. Выберите заказ и назначьте ровер.')],
    zones: clone(INITIAL_ZONES),
  }
}

export function calculateMission(rover: Rover, order: Order, zones: Zone[]): MissionEstimate {
  const zone = zones.find((item) => item.id === order.zoneId)
  if (!zone) throw new Error(`Unknown zone: ${order.zoneId}`)

  const loadRatio = order.weight / rover.capacity
  const weightPenalty = 1 + loadRatio * 0.72
  const energyCost = Math.ceil(order.distance * zone.energyMultiplier * weightPenalty * 2.15)
  const duration = Math.ceil(order.distance * zone.speedMultiplier * (1 + loadRatio * 0.58))
  const risk = Math.min(85, Math.round(RISK_VALUES[order.risk] + zone.riskBonus + loadRatio * 10))

  return { energyCost, duration, risk, loadRatio }
}

export function canLaunchMission(game: GameState, roverId: string, orderId: string): LaunchCheck {
  const rover = game.rovers.find((item) => item.id === roverId)
  const order = game.orders.find((item) => item.id === orderId)

  if (!rover) return { ok: false, reason: 'Ровер не найден' }
  if (!order) return { ok: false, reason: 'Заказ не найден' }
  if (game.day > game.maxDays) return { ok: false, reason: 'Экспедиция завершена' }
  if (rover.status !== 'available') return { ok: false, reason: 'Ровер сейчас недоступен' }
  if (order.status !== 'available') return { ok: false, reason: 'Заказ уже взят в работу' }
  if (order.weight > rover.capacity) {
    return { ok: false, reason: `Груз тяжелее лимита ровера на ${order.weight - rover.capacity} кг` }
  }

  const estimate = calculateMission(rover, order, game.zones)
  if (estimate.energyCost > rover.battery) {
    return { ok: false, reason: `Нужно ${estimate.energyCost}% заряда, доступно ${rover.battery}%` }
  }

  return { ok: true, estimate }
}

export function launchMission(game: GameState, roverId: string, orderId: string, now = Date.now()): GameState {
  const check = canLaunchMission(game, roverId, orderId)
  if (!check.ok) throw new Error(check.reason)

  const next = clone(game)
  const rover = next.rovers.find((item) => item.id === roverId)!
  const order = next.orders.find((item) => item.id === orderId)!
  rover.status = 'en-route'
  order.status = 'in-transit'
  next.deliveries.unshift({
    id: `delivery-${now}-${roverId}`,
    roverId,
    orderId,
    status: 'en-route',
    progress: 0,
    startedAt: now,
    duration: check.estimate.duration,
    energyCost: check.estimate.energyCost,
    risk: check.estimate.risk,
  })
  next.events.unshift(event(next.day, 'info', `${rover.name} вышел к точке «${order.station}».`))
  return next
}

export function completeMission(game: GameState, delivery: Delivery, randomValue = Math.random()): GameState {
  const next = clone(game)
  const rover = next.rovers.find((item) => item.id === delivery.roverId)
  const order = next.orders.find((item) => item.id === delivery.orderId)
  const storedDelivery = next.deliveries.find((item) => item.id === delivery.id)
  if (!rover || !order) return next

  rover.battery = Math.max(0, rover.battery - delivery.energyCost)
  const failed = randomValue * 100 < delivery.risk

  if (storedDelivery) {
    storedDelivery.progress = 100
    storedDelivery.status = failed ? 'failed' : 'success'
  }

  if (failed) {
    rover.status = 'damaged'
    order.status = 'failed'
    next.rating = Math.max(0, next.rating - 9)
    next.score = Math.max(0, next.score - 80)
    next.events.unshift(event(next.day, 'danger', `${rover.name}: доставка сорвана — повреждение на маршруте. Рейтинг базы −9.`))
  } else {
    rover.status = 'available'
    order.status = 'delivered'
    next.credits += order.reward
    next.score += order.reward + order.urgency * 35
    next.rating = Math.min(100, next.rating + 1)
    next.events.unshift(event(next.day, 'success', `${order.station} получил груз. +${order.reward} кр., батарея ${rover.battery}%.`))
  }

  return next
}

export function progressGame(game: GameState, now = Date.now(), random = Math.random): GameState {
  let next = clone(game)
  const activeDeliveries = next.deliveries.filter((item) => item.status === 'en-route')

  for (const delivery of activeDeliveries) {
    const elapsedSeconds = Math.max(0, (now - delivery.startedAt) / 1000)
    const progress = Math.min(100, Math.round((elapsedSeconds / delivery.duration) * 100))
    const current = next.deliveries.find((item) => item.id === delivery.id)!
    current.progress = progress
    if (progress >= 100) next = completeMission(next, current, random())
  }

  return next
}

export function rechargeFleet(game: GameState): GameState {
  const next = clone(game)
  const serviceCost = 120
  next.day += 1
  next.credits = Math.max(0, next.credits - serviceCost)
  next.rovers = next.rovers.map((rover) => {
    if (rover.status === 'en-route') return rover
    return {
      ...rover,
      status: 'available',
      battery: Math.min(100, rover.battery + (rover.status === 'damaged' ? 25 : 38)),
    }
  })
  next.events.unshift(event(next.day, 'info', `Смена завершена. Сервис флота −${serviceCost} кр., батареи пополнены.`))
  return next
}
