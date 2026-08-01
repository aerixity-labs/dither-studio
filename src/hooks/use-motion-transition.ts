import { useReducedMotion, type Transition } from 'motion/react'

const DEFAULT_SPRING: Transition = { type: 'spring', bounce: 0.15, duration: 0.4 }

/**
 * Under reduced motion the transition is dropped entirely rather than shortened, since the
 * whole point of the setting is no movement.
 */
export function useMotionTransition(spring: Transition = DEFAULT_SPRING): Transition {
  return useReducedMotion() ? { duration: 0 } : spring
}
