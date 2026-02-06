'use client'

import { useCallback, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatCurrency, parsePrice } from '@/lib/features/listings/utils/price-utils'
import { cn } from '@/lib/utils'

export interface PriceInputProps {
  value: number | undefined
  onChange: (val: number | undefined) => void
  label: string
  options: number[]
}

export function PriceInput({ value, onChange, label, options }: PriceInputProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const rawParsed = search ? parsePrice(search) : null
  const hasRawOption =
    rawParsed !== null &&
    rawParsed >= 0 &&
    !options.includes(rawParsed)

  const filteredOptions = options.filter((opt) => {
    const str = formatCurrency(opt)
    const digits = search.replace(/\s+/g, '')
    if (!digits) return true
    return str.replace(/\s+/g, '').includes(digits) || String(opt).includes(digits)
  })

  const handleSelect = useCallback(
    (val: number) => {
      onChange(val)
      setSearch('')
      setOpen(false)
    },
    [onChange]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal h-10',
            value === undefined && 'text-muted-foreground'
          )}
        >
          {value !== undefined ? formatCurrency(value) : label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Sök eller skriv belopp..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Inga matchande belopp.</CommandEmpty>
            <CommandGroup heading="Välj belopp">
              {filteredOptions.map((opt) => (
                <CommandItem
                  key={opt}
                  value={String(opt)}
                  onSelect={() => handleSelect(opt)}
                >
                  {formatCurrency(opt)}
                </CommandItem>
              ))}
            </CommandGroup>
            {hasRawOption && (
              <CommandGroup heading="Anpassat pris">
                <CommandItem
                  value={`raw-${rawParsed}`}
                  onSelect={() => handleSelect(rawParsed)}
                >
                  Använd {formatCurrency(rawParsed)}
                </CommandItem>
              </CommandGroup>
            )}
            {(value !== undefined || search) && (
              <CommandGroup>
                <CommandItem
                  value="clear"
                  onSelect={() => {
                    onChange(undefined)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  Rensa val
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
