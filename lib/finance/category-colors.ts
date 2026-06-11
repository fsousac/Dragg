export const CATEGORY_COLORS = {
  income: {
    text:       'text-income',
    bg:         'bg-income-bg',
    border:     'border-income',
    hex:        { light: '#15803D', dark: '#22C55E' },
    chartColor: 'var(--chart-1)',
  },
  expense: {
    text:       'text-expense',
    bg:         'bg-expense-bg',
    border:     'border-expense',
    hex:        { light: '#C53030', dark: '#FC8181' },
    chartColor: 'var(--chart-3)',
  },
  savings: {
    text:       'text-savings',
    bg:         'bg-savings-bg',
    border:     'border-savings',
    hex:        { light: '#6D28D9', dark: '#A78BFA' },
    chartColor: 'var(--chart-4)',
  },
  needs: {
    text:       'text-needs',
    bg:         'bg-needs-bg',
    border:     'border-needs',
    hex:        { light: '#C2410C', dark: '#FB923C' },
    chartColor: 'var(--chart-5)',
  },
  wants: {
    text:       'text-wants',
    bg:         'bg-wants-bg',
    border:     'border-wants',
    hex:        { light: '#BE185D', dark: '#F472B6' },
    chartColor: 'var(--chart-3)',
  },
} as const

export type CategoryKey = keyof typeof CATEGORY_COLORS
