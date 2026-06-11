export const SPRING_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)' as const
export const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)' as const
export const EASE_OUT      = 'cubic-bezier(0.25, 0, 0, 1)' as const

export const DURATION = {
  instant:   100,
  fast:      200,
  base:      350,
  slow:      500,
  chart:     700,
  counter:   800,
  counterLg: 1200,
} as const

export const STAGGER = {
  tight: 40,  // legend items, nav items
  base:  60,  // page transition cards
  loose: 80,  // initial load cards
  wide:  120, // hero stat cards
} as const

export const DELAY = {
  wave1: 0,   // shell / background
  wave2: 200, // hero content
  wave3: 500, // dashboard grid
} as const
