import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useId } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidHex } from '@/lib/dither/core'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  onRemove?: () => void
}

/**
 * Pairs a native colour picker with a hex field. The picker only accepts a
 * six-digit hex, so a half-typed value is kept in the text field and withheld
 * from the picker until it parses.
 */
export function ColorSwatchInput(props: Props) {
  const { label, value, onChange, onRemove } = props
  const id = useId()
  const isValid = isValidHex(value)
  const normalized = isValid ? expandHex(value) : '#000000'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-muted-foreground text-[11px]">
          {label}
        </Label>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-5"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="size-3" aria-hidden />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalized}
          onChange={function onPick(event) {
            onChange(event.target.value)
          }}
          aria-label={`${label} colour picker`}
          className="border-border size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border"
        />
        <Input
          id={id}
          value={value}
          spellCheck={false}
          autoComplete="off"
          onChange={function onType(event) {
            onChange(event.target.value)
          }}
          className={cn('h-8 font-mono text-xs', { 'border-destructive': !isValid })}
        />
      </div>
    </div>
  )
}

function expandHex(value: string) {
  const hex = value.trim().replace('#', '')
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  return `#${hex}`
}
