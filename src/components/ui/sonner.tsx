'use client'
import {
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Alert02Icon,
  MultiplicationSignCircleIcon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: (
          <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="size-4" />
        ),
        info: <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={1.5} className="size-4" />,
        warning: <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} className="size-4" />,
        error: (
          <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={1.5} className="size-4" />
        ),
        loading: (
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={1.5} className="size-4 animate-spin" />
        ),
      }}
      richColors
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
          /** `richColors` per-type vars: hue in the wash and icon, text stays full-contrast. */
          '--success-bg': 'color-mix(in oklab, var(--success) 22%, var(--popover))',
          '--success-border': 'color-mix(in oklab, var(--success) 45%, var(--popover))',
          '--success-text': 'var(--popover-foreground)',
          '--info-bg': 'color-mix(in oklab, var(--info) 22%, var(--popover))',
          '--info-border': 'color-mix(in oklab, var(--info) 45%, var(--popover))',
          '--info-text': 'var(--popover-foreground)',
          '--warning-bg': 'color-mix(in oklab, var(--warning) 22%, var(--popover))',
          '--warning-border': 'color-mix(in oklab, var(--warning) 45%, var(--popover))',
          '--warning-text': 'var(--popover-foreground)',
          '--error-bg': 'color-mix(in oklab, var(--destructive) 22%, var(--popover))',
          '--error-border': 'color-mix(in oklab, var(--destructive) 45%, var(--popover))',
          '--error-text': 'var(--popover-foreground)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
