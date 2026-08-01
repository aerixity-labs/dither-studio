import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Props are derived from `HugeiconsIcon` rather than `svg`: the generated version
 * typed this as `ComponentProps<'svg'>`, whose `strokeWidth` is `string | number`
 * and does not satisfy the icon component's `number`.
 */
type Props = Omit<React.ComponentProps<typeof HugeiconsIcon>, 'icon'>

function Spinner({ className, ...props }: Props) {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      strokeWidth={1.5}
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
