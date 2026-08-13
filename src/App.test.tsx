import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Lunar Dispatch interface', () => {
  it('renders the tactical map, orders, fleet, objective, and briefing', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('LUNAR DISPATCH')
    expect(html).toContain('Накопите')
    expect(html).toContain('Тактическая карта Луны')
    expect(html).toContain('АТЛАС-07')
    expect(html).toContain('Медицинский рацион')
    expect(html).toContain('Принять смену')
    expect(html).toContain('Запустить доставку')
    expect(html).toContain('Грузовой модуль XL')
    expect(html).toContain('Нужно заработать ещё 200 кр.')
  })
})
