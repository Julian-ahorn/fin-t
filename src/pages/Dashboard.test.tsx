import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  it('空数据时展示示例数据引导', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('生成示例数据')).toBeInTheDocument()
    expect(screen.getByText('还没有记账数据，先体验一下示例数据吧')).toBeInTheDocument()
  })
})
