import { motion } from 'motion/react'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMotionTransition } from '@/hooks/use-motion-transition'
import { cn } from '@/lib/utils'

type ActiveTab = {
  activeValue: string
  layoutId: string
}

const ActiveTabContext = createContext<ActiveTab | null>(null)

type ListProps = {
  /** The controlled value of the parent `Tabs`. */
  activeValue: string
  /** Unique per tab group, so two groups on one page animate independently. */
  layoutId: string
  children: ReactNode
  className?: string
}

/**
 * Radix tabs with a sliding indicator: one shared `layoutId` element that Motion tweens
 * between triggers. The active value must be passed in because Radix does not expose it,
 * which is also why the parent `Tabs` has to be controlled.
 */
export function AnimatedTabsList(props: ListProps) {
  const { activeValue, layoutId, children, className } = props
  const context = useMemo(
    function buildContext() {
      return { activeValue, layoutId }
    },
    [activeValue, layoutId],
  )

  return (
    <TabsList className={cn('p-0.75', className)}>
      <ActiveTabContext.Provider value={context}>{children}</ActiveTabContext.Provider>
    </TabsList>
  )
}

type TriggerProps = {
  value: string
  children: ReactNode
  className?: string
}

export function AnimatedTabsTrigger(props: TriggerProps) {
  const { value, children, className } = props
  const context = useContext(ActiveTabContext)
  const indicatorTransition = useMotionTransition()
  const isActive = context?.activeValue === value

  return (
    <TabsTrigger
      value={value}
      className={cn(
        /** The primitive's own active background is suppressed; the indicator marks it. */
        'relative data-active:bg-transparent group-data-[variant=default]/tabs-list:data-active:shadow-none dark:data-active:border-transparent dark:data-active:bg-transparent',
        className,
      )}
    >
      {isActive ? (
        <motion.span
          layoutId={context.layoutId}
          className="bg-primary absolute inset-0 rounded-full shadow-sm"
          transition={indicatorTransition}
          aria-hidden
        />
      ) : null}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </TabsTrigger>
  )
}
