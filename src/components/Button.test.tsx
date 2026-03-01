// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('클릭 시 onClick 호출', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>클릭</Button>)

    await userEvent.click(screen.getByText('클릭'))

    expect(handleClick).toHaveBeenCalledOnce()
  })
})
