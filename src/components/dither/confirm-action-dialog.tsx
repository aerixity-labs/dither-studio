import { Alert02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type Props = {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel: string
  /** Defaults to "Cancel". */
  dismissLabel?: string
  onConfirm: () => void
}

/**
 * Confirmation gate for actions that throw work away. The confirming action is destructive
 * red and the way out stays neutral: colouring the escape hatch would pull the eye towards
 * the safe option and away from the one the copy is asking about.
 */
export function ConfirmActionDialog(props: Props) {
  const { trigger, title, description, confirmLabel, dismissLabel = 'Cancel', onConfirm } = props

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Alert02Icon}
              strokeWidth={1.5}
              className="text-destructive size-4 shrink-0"
              aria-hidden
            />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{dismissLabel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
