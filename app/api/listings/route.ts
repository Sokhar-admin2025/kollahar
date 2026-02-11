'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getListings, type ListingSearchFilters } from '@/lib/features/listings/listing-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const filters = (body?.filters ?? {}) as ListingSearchFilters
    const result = await getListings(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Kunde inte hämta annonser.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: result.data ?? [],
      totalCount: result.totalCount ?? (result.data ?? []).length,
    })
  } catch (err) {
    console.error('API /api/listings error', err)
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod vid hämtning av annonser.' },
      { status: 500 }
    )
  }
}

