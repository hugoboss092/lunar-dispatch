import { createInitialGame, type GameState } from './game'

const STORAGE_KEY = 'lunar-dispatch-state-v1'

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialGame()
    const parsed = JSON.parse(raw) as GameState
    return parsed.version === 1 ? parsed : createInitialGame()
  } catch {
    return createInitialGame()
  }
}

export function saveGame(game: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
}

export function clearGame(): GameState {
  localStorage.removeItem(STORAGE_KEY)
  return createInitialGame()
}
