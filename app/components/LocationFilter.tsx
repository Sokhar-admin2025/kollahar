'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronRight, Search, ListPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LOCATION_TREE, mergeLocationCounts, type LocationCounty } from '@/lib/swedish-locations'

/** Antal län som visas innan "Visa alla län". */
const INITIAL_COUNTIES = 8
/** Antal kommuner per län innan "Visa fler kommuner". */
const INITIAL_MUNICIPALITIES = 10

export interface LocationFilterValue {
  fullCounties: string[]
  partialMunicipalities: { countyValue: string; municipalityValue: string }[]
}

interface LocationFilterProps {
  value: LocationFilterValue
  onChange: (value: LocationFilterValue) => void
  className?: string
  /** I mobil-drawer: sökfält fast överst, listan scrollbar under */
  stickySearch?: boolean
  /** Vald kategori (t.ex. 'cars') – plats-counts räknas bara för denna kategori när satt */
  selectedCategory?: string
  /** Sökfråga – plats-counts räknas bara annonser som matchar title/description */
  searchQuery?: string
}

const ROW_MIN_H = 'min-h-[44px]'
const TOUCH_PADDING = 'py-3'
const CHEVRON_TOUCH = 'min-w-[44px] min-h-[44px] flex items-center justify-center -my-1'

export default function LocationFilter({
  value,
  onChange,
  className = '',
  stickySearch = false,
  selectedCategory,
  searchQuery: externalSearchQuery = '',
}: LocationFilterProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [listVisible, setListVisible] = useState(false)
  const [expandedCounties, setExpandedCounties] = useState<Set<string>>(new Set())
  const [showAllCounties, setShowAllCounties] = useState(false)
  const [showAllMunicipalities, setShowAllMunicipalities] = useState<Record<string, boolean>>({})
  const [treeWithCounts, setTreeWithCounts] = useState<LocationCounty[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const categoryFilter =
      selectedCategory && selectedCategory !== 'all' ? selectedCategory : null
    const searchFilter =
      typeof externalSearchQuery === 'string' && externalSearchQuery.trim()
        ? externalSearchQuery.trim()
        : null

    supabase
      .rpc('get_location_stats', {
        category_filter: categoryFilter ?? null,
        search_query: searchFilter ?? null,
      })
      .then(({ data, error }) => {
        if (error) return
        const rows = (data ?? []) as { location_value: string; count: number }[]
        setTreeWithCounts(mergeLocationCounts(LOCATION_TREE, rows))
      })
  }, [selectedCategory, externalSearchQuery])

  const baseTree = treeWithCounts ?? LOCATION_TREE
  const showList = listVisible || searchQuery.trim().length > 0

  const filteredTree = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return baseTree
    return baseTree.filter((county) => {
      const countyMatch = county.label.toLowerCase().includes(q)
      const hasMatchingMunicipality = county.municipalities.some((m) =>
        m.label.toLowerCase().includes(q)
      )
      return countyMatch || hasMatchingMunicipality
    }).map((county) => ({
      ...county,
      municipalities: county.municipalities.filter((m) =>
        m.label.toLowerCase().includes(q) || county.label.toLowerCase().includes(q)
      ),
    }))
  }, [searchQuery, baseTree])

  const countiesToShow = showAllCounties ? filteredTree : filteredTree.slice(0, INITIAL_COUNTIES)
  const hasMoreCounties = filteredTree.length > INITIAL_COUNTIES && !showAllCounties
  const canCollapseCounties = showAllCounties && filteredTree.length > INITIAL_COUNTIES

  const toggleCounty = (countyValue: string) => {
    const county = LOCATION_TREE.find((c) => c.value === countyValue)
    if (!county) return
    const isFull = value.fullCounties.includes(countyValue)
    if (isFull) {
      onChange({
        fullCounties: value.fullCounties.filter((c) => c !== countyValue),
        partialMunicipalities: value.partialMunicipalities.filter((m) => m.countyValue !== countyValue),
      })
    } else {
      onChange({
        fullCounties: [...value.fullCounties.filter((c) => c !== countyValue), countyValue],
        partialMunicipalities: value.partialMunicipalities.filter((m) => m.countyValue !== countyValue),
      })
    }
  }

  const toggleMunicipality = (countyValue: string, municipalityValue: string) => {
    const county = LOCATION_TREE.find((c) => c.value === countyValue)
    if (!county) return
    const countyFull = value.fullCounties.includes(countyValue)
    const isPartial = value.partialMunicipalities.some(
      (m) => m.countyValue === countyValue && m.municipalityValue === municipalityValue
    )
    if (countyFull) {
      const others = county.municipalities
        .filter((m) => m.value !== municipalityValue)
        .map((m) => ({ countyValue, municipalityValue: m.value }))
      onChange({
        fullCounties: value.fullCounties.filter((c) => c !== countyValue),
        partialMunicipalities: [
          ...value.partialMunicipalities.filter((m) => m.countyValue !== countyValue),
          ...others,
        ],
      })
    } else if (isPartial) {
      onChange({
        fullCounties: value.fullCounties,
        partialMunicipalities: value.partialMunicipalities.filter(
          (m) => !(m.countyValue === countyValue && m.municipalityValue === municipalityValue)
        ),
      })
    } else {
      onChange({
        fullCounties: value.fullCounties.filter((c) => c !== countyValue),
        partialMunicipalities: [...value.partialMunicipalities, { countyValue, municipalityValue }],
      })
    }
  }

  const expandCounty = (countyValue: string) => {
    setExpandedCounties((prev) => {
      const next = new Set(prev)
      if (next.has(countyValue)) next.delete(countyValue)
      else next.add(countyValue)
      return next
    })
  }

  const isCountyChecked = (countyValue: string) => value.fullCounties.includes(countyValue)
  const isMunicipalityChecked = (countyValue: string, municipalityValue: string) =>
    value.partialMunicipalities.some(
      (m) => m.countyValue === countyValue && m.municipalityValue === municipalityValue
    )

  const searchEl = (
    <div className="relative shrink-0">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/50 pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        placeholder="Sök område..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          if (e.target.value.trim().length > 0) setListVisible(true)
        }}
        className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl bg-white text-brand-text text-sm placeholder:text-gray-400 antialiased focus:outline-none focus:ring-2 focus:ring-brand-green"
        aria-label="Sök område"
      />
    </div>
  )

  const toggleListButton = showList ? (
    <button
      type="button"
      onClick={() => setListVisible(false)}
      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-brand-green hover:underline border border-brand-green/30 rounded-xl mt-2 touch-manipulation min-h-[44px]"
    >
      Göm lista
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setListVisible(true)}
      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-text bg-brand-beige/80 hover:bg-brand-beige border border-gray-300 rounded-xl mt-2 touch-manipulation min-h-[44px]"
      aria-label="Visa län att välja bland"
    >
      <ListPlus className="w-4 h-4 shrink-0" aria-hidden />
      Välj län i lista
    </button>
  )

  const listEl = (
    <>
      <div
        className={
          stickySearch
            ? 'max-h-[55vh] overflow-y-auto overflow-x-hidden min-h-0'
            : 'max-h-[min(60vh,400px)] overflow-y-auto'
        }
      >
        <div className="space-y-0">
          {countiesToShow.map((county) => {
            const expanded = expandedCounties.has(county.value) || searchQuery.length > 0
            const showAllMunis = showAllMunicipalities[county.value]
            const munisToShow = showAllMunis
              ? county.municipalities
              : county.municipalities.slice(0, INITIAL_MUNICIPALITIES)
            const hasMoreMunis =
              county.municipalities.length > INITIAL_MUNICIPALITIES && !showAllMunis
            const countyFull = isCountyChecked(county.value)

            return (
              <div key={county.value} className="border-b border-gray-200 last:border-b-0">
                <div className={`flex items-stretch ${ROW_MIN_H} ${TOUCH_PADDING} px-2 gap-0 bg-gray-50/80`}>
                  <button
                    type="button"
                    onClick={() => expandCounty(county.value)}
                    className={`${CHEVRON_TOUCH} rounded-l-lg hover:bg-gray-200 active:bg-gray-300 text-brand-text touch-manipulation`}
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Fäll ihop län' : 'Expandera län'}
                  >
                    {expanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <label className={`flex items-center gap-3 flex-1 cursor-pointer ${ROW_MIN_H} px-3 rounded-r-lg hover:bg-gray-100/80 active:bg-gray-200/80 touch-manipulation`}>
                    <input
                      type="checkbox"
                      checked={countyFull}
                      onChange={() => toggleCounty(county.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 text-brand-green focus:ring-brand-green w-5 h-5 shrink-0"
                    />
                    <span className="text-sm font-medium text-brand-text antialiased whitespace-nowrap truncate">
                      {county.label}
                      {county.count >= 0 && (
                        <span className="text-brand-text/60 font-normal"> ({county.count})</span>
                      )}
                    </span>
                  </label>
                </div>

                {expanded && (
                  <div className="pl-8 pr-3 py-2 space-y-0 bg-white">
                    {munisToShow.map((muni) => {
                      const checked =
                        countyFull || isMunicipalityChecked(county.value, muni.value)
                      return (
                        <label
                          key={muni.value}
                          className={`flex items-center gap-3 cursor-pointer ${ROW_MIN_H} ${TOUCH_PADDING} px-2 rounded-lg hover:bg-brand-beige/50 active:bg-brand-beige/70 touch-manipulation`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMunicipality(county.value, muni.value)}
                            className="rounded border-gray-300 text-brand-green focus:ring-brand-green w-5 h-5 shrink-0"
                          />
                          <span className="text-sm text-brand-text antialiased whitespace-nowrap truncate">
                            {muni.label}
                            {muni.count >= 0 && (
                              <span className="text-brand-text/60"> ({muni.count})</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                    {hasMoreMunis && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllMunicipalities((prev) => ({ ...prev, [county.value]: true }))
                        }
                        className="text-sm text-brand-green hover:underline cursor-pointer py-2 pl-2 pr-2 touch-manipulation"
                      >
                        Visa fler kommuner (+{county.municipalities.length - INITIAL_MUNICIPALITIES})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {hasMoreCounties && (
        <button
          type="button"
          onClick={() => setShowAllCounties(true)}
          className="text-sm text-brand-green hover:underline cursor-pointer py-2 px-2 w-full text-left touch-manipulation shrink-0"
        >
          Visa alla län
        </button>
      )}
      {canCollapseCounties && (
        <button
          type="button"
          onClick={() => setShowAllCounties(false)}
          className="text-sm text-brand-green hover:underline cursor-pointer py-2 px-2 w-full text-left touch-manipulation shrink-0"
        >
          Visa färre
        </button>
      )}
    </>
  )

  if (stickySearch) {
    return (
      <div className={`flex flex-col min-h-0 ${className}`}>
        <div className="shrink-0 pb-3">{searchEl}</div>
        <div className="shrink-0">{toggleListButton}</div>
        {showList && <div className="flex-1 min-h-0 pt-2">{listEl}</div>}
      </div>
    )
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {searchEl}
      {toggleListButton}
      {showList && listEl}
    </div>
  )
}
