import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { DifficultySelector } from './DifficultySelector'

describe('DifficultySelector', () => {
  it('shows the three levels with the current one checked', () => {
    render(<DifficultySelector value="intermediate" onChange={() => {}} />)

    const options = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(options.map((option) => option.value)).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(options.map((option) => option.checked)).toEqual([false, true, false])
    expect(screen.getByRole('group', { name: 'Difficulty' })).toBeTruthy()
  })

  it('reports the chosen level', () => {
    const onChange = vi.fn()
    render(<DifficultySelector value="beginner" onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Advanced' }))
    expect(onChange).toHaveBeenCalledWith('advanced')
  })

  it('does not allow choosing a disabled level', () => {
    const onChange = vi.fn()
    render(<DifficultySelector value="beginner" onChange={onChange} disabledLevels={['advanced']} />)

    const advanced = screen.getByRole('radio', { name: 'Advanced' }) as HTMLInputElement
    expect(advanced.disabled).toBe(true)
  })
})

describe('Button', () => {
  it('renders a real button that defaults to type="button"', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Check</Button>)

    const button = screen.getByRole('button', { name: 'Check' })
    expect(button.getAttribute('type')).toBe('button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders a link when given a destination', () => {
    render(
      <MemoryRouter>
        <Button to="/explore">Explore Sutras</Button>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Explore Sutras' }).getAttribute('href')).toBe('/explore')
  })
})
