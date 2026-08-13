import { describe, expect, it } from 'vitest'
import {
  calculateMission,
  canLaunchMission,
  completeMission,
  createInitialGame,
  launchMission,
  progressGame,
  rechargeFleet,
  upgradeMuleCargo,
  type Delivery,
} from './game'

describe('mission planning', () => {
  it('blocks an order that exceeds rover capacity', () => {
    const game = createInitialGame()
    const order = game.orders.find((item) => item.id === 'order-tycho')!
    const rover = game.rovers.find((item) => item.id === 'rover-scout')!

    expect(canLaunchMission(game, rover.id, order.id)).toEqual({
      ok: false,
      reason: 'Груз тяжелее лимита ровера на 14 кг',
    })
  })

  it('blocks a route when the rover cannot cover its energy cost', () => {
    const game = createInitialGame()
    const rover = game.rovers.find((item) => item.id === 'rover-atlas')!
    rover.battery = 10

    const result = canLaunchMission(game, rover.id, 'order-peak')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected mission to be blocked')
    expect(result.reason).toContain('Нужно')
    expect(result.reason).toContain('заряда')
  })

  it('makes heavy cargo slower and more energy intensive', () => {
    const game = createInitialGame()
    const rover = game.rovers.find((item) => item.id === 'rover-atlas')!
    const light = game.orders.find((item) => item.id === 'order-shackleton')!
    const heavy = game.orders.find((item) => item.id === 'order-tycho')!

    const lightMission = calculateMission(rover, light, game.zones)
    const heavyMission = calculateMission(rover, heavy, game.zones)

    expect(heavyMission.energyCost).toBeGreaterThan(lightMission.energyCost)
    expect(heavyMission.duration).toBeGreaterThan(lightMission.duration)
  })

  it('contains an order that no rover can carry', () => {
    const game = createInitialGame()

    expect(game.rovers.every((rover) => !canLaunchMission(game, rover.id, 'order-impossible').ok)).toBe(true)
  })

  it('keeps the credit goal reachable using valid orders', () => {
    const game = createInitialGame()
    const deliverableRewards = game.orders
      .filter((order) => game.rovers.some((rover) => rover.capacity >= order.weight))
      .reduce((sum, order) => sum + order.reward, 0)

    expect(game.credits + deliverableRewards).toBeGreaterThanOrEqual(game.targetCredits)
  })

  it('applies terrain multipliers to duration, energy, and risk', () => {
    const game = createInitialGame()
    const rover = game.rovers.find((item) => item.id === 'rover-atlas')!
    const safeOrder = game.orders.find((item) => item.id === 'order-shackleton')!
    const riskyOrder = game.orders.find((item) => item.id === 'order-peak')!

    const safe = calculateMission(rover, safeOrder, game.zones)
    const risky = calculateMission(rover, riskyOrder, game.zones)

    expect(risky.risk).toBeGreaterThan(safe.risk)
    expect(risky.duration).toBeGreaterThan(safe.duration)
  })
})

describe('delivery completion', () => {
  it('updates credits, score, battery, order and rover state after success', () => {
    const game = createInitialGame()
    const rover = game.rovers.find((item) => item.id === 'rover-atlas')!
    const order = game.orders.find((item) => item.id === 'order-shackleton')!
    const estimate = calculateMission(rover, order, game.zones)
    const delivery: Delivery = {
      id: 'delivery-test',
      roverId: rover.id,
      orderId: order.id,
      status: 'en-route',
      progress: 100,
      startedAt: 0,
      duration: estimate.duration,
      energyCost: estimate.energyCost,
      risk: estimate.risk,
    }

    const result = completeMission(game, delivery, 0.99)
    const completedOrder = result.orders.find((item) => item.id === order.id)!
    const returnedRover = result.rovers.find((item) => item.id === rover.id)!

    expect(completedOrder.status).toBe('delivered')
    expect(returnedRover.status).toBe('available')
    expect(returnedRover.battery).toBe(rover.battery - estimate.energyCost)
    expect(result.credits).toBe(game.credits + order.reward)
    expect(result.score).toBeGreaterThan(game.score)
    expect(result.events[0].kind).toBe('success')
  })

  it('records a failed risky delivery without paying the reward', () => {
    const game = createInitialGame()
    const rover = game.rovers.find((item) => item.id === 'rover-atlas')!
    const order = game.orders.find((item) => item.id === 'order-peak')!
    const estimate = calculateMission(rover, order, game.zones)
    const delivery: Delivery = {
      id: 'delivery-risk',
      roverId: rover.id,
      orderId: order.id,
      status: 'en-route',
      progress: 100,
      startedAt: 0,
      duration: estimate.duration,
      energyCost: estimate.energyCost,
      risk: estimate.risk,
    }

    const result = completeMission(game, delivery, 0)

    expect(result.credits).toBe(game.credits)
    expect(result.orders.find((item) => item.id === order.id)?.status).toBe('failed')
    expect(result.rovers.find((item) => item.id === rover.id)?.status).toBe('damaged')
    expect(result.events[0].kind).toBe('danger')
  })
})

describe('game loop', () => {
  it('launches a valid mission and marks both entities active', () => {
    const game = createInitialGame()
    const result = launchMission(game, 'rover-atlas', 'order-shackleton', 1000)

    expect(result.deliveries).toHaveLength(1)
    expect(result.rovers.find((item) => item.id === 'rover-atlas')?.status).toBe('en-route')
    expect(result.orders.find((item) => item.id === 'order-shackleton')?.status).toBe('in-transit')
    expect(result.events[0].kind).toBe('info')
  })

  it('progresses active deliveries and resolves completed ones', () => {
    const game = launchMission(createInitialGame(), 'rover-atlas', 'order-shackleton', 0)
    const result = progressGame(game, 999_999, () => 0.99)

    expect(result.deliveries[0].status).toBe('success')
    expect(result.deliveries[0].progress).toBe(100)
    expect(result.orders.find((item) => item.id === 'order-shackleton')?.status).toBe('delivered')
  })

  it('recharges available rovers and advances the day at a cost', () => {
    const game = createInitialGame()
    game.rovers[0].battery = 40
    const result = rechargeFleet(game)

    expect(result.day).toBe(2)
    expect(result.credits).toBe(game.credits - 120)
    expect(result.rovers[0].battery).toBeGreaterThan(40)
    expect(result.events[0].message).toContain('Смена завершена')
  })

  it('upgrades MULE cargo capacity to unlock the reserve container', () => {
    const game = createInitialGame()
    game.credits = 1000

    const result = upgradeMuleCargo(game)
    const mule = result.rovers.find((rover) => rover.id === 'rover-mule')!

    expect(mule.capacity).toBe(90)
    expect(result.credits).toBe(400)
    expect(canLaunchMission(result, mule.id, 'order-impossible').ok).toBe(true)
    expect(result.events[0].message).toContain('Грузовой модуль')
  })

  it('rejects the cargo upgrade when credits are insufficient', () => {
    const game = createInitialGame()

    expect(() => upgradeMuleCargo(game)).toThrow('Нужно 600 кредитов')
  })

  it('rejects the cargo upgrade after the expedition is over', () => {
    const game = createInitialGame()
    game.credits = 1000
    game.day = game.maxDays + 1

    expect(() => upgradeMuleCargo(game)).toThrow('Экспедиция завершена')
  })
})
