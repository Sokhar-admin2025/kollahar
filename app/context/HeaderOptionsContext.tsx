'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export interface HeaderOptions {
  showSearch?: boolean
  searchQuery?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: (e: React.FormEvent) => void
  onClearSearch?: () => void
}

const defaultOptions: HeaderOptions = { showSearch: false }

const HeaderOptionsContext = createContext<{
  options: HeaderOptions
  setOptions: (opts: HeaderOptions | ((prev: HeaderOptions) => HeaderOptions)) => void
}>({
  options: defaultOptions,
  setOptions: () => {},
})

export function HeaderOptionsProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<HeaderOptions>(defaultOptions)
  return (
    <HeaderOptionsContext.Provider value={{ options, setOptions }}>
      {children}
    </HeaderOptionsContext.Provider>
  )
}

export function useHeaderOptions() {
  return useContext(HeaderOptionsContext)
}
