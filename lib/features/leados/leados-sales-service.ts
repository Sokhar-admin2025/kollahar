import { createClient } from '@/lib/supabase/server'

export type SoldVia = 'sokhar' | 'external' | 'other'

export interface CreateSaleParams {
  listingId: string
  leadId?: string | null
  soldByProfileId: string
  soldByRole: 'seller' | 'owner'
  soldVia: SoldVia
}

/**
 * Skapar en rad i listing_sales som säljdump för en genomförd affär.
 * Endast intern LeadOS-användning; får inte exponeras i publika flöden.
 */
export async function createListingSaleDump(
  params: CreateSaleParams
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const nowIso = new Date().toISOString()

    // Hämta listing (inkl. org-id)
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, title, make, model, year, price, organization_id')
      .eq('id', params.listingId)
      .maybeSingle()

    if (listingError || !listing) {
      console.error('[listing-sales] could not load listing for sale dump', {
        listingId: params.listingId,
        code: listingError?.code,
        message: listingError?.message,
      })
      return { success: false, error: 'Annonsen kunde inte hittas.' }
    }

    const listingOrgId = (listing as { organization_id?: string | null }).organization_id
    if (!listingOrgId) {
      console.error('[listing-sales] listing has no organization_id', {
        listingId: params.listingId,
      })
      return { success: false, error: 'Annonsen saknar organisation och kan inte registreras.' }
    }

    let leadOrgId: string | null = null
    let leadId: string | null = params.leadId ?? null

    if (leadId) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, organization_id, listing_id')
        .eq('id', leadId)
        .maybeSingle()

      if (leadError || !lead) {
        console.error('[listing-sales] could not load lead for sale dump', {
          leadId,
          code: leadError?.code,
          message: leadError?.message,
        })
        return { success: false, error: 'Leadet kunde inte hittas.' }
      }

      leadOrgId = (lead as { organization_id?: string | null }).organization_id ?? null
      const leadListingId = (lead as { listing_id?: string | null }).listing_id ?? null

      if (leadListingId && leadListingId !== params.listingId) {
        return {
          success: false,
          error: 'Leadet tillhör inte den här annonsen.',
        }
      }

      if (!leadOrgId || leadOrgId !== listingOrgId) {
        return {
          success: false,
          error: 'Leadet och annonsen tillhör inte samma organisation.',
        }
      }
    }

    // Hämta aggregerad statistik
    const [{ count: viewsCount }, { count: leadsCount }, { count: favoritesCount }] =
      await Promise.all([
        supabase
          .from('listing_views')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', params.listingId),
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', params.listingId),
        supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', params.listingId),
      ])

    const listingTitle = (listing as { title?: string | null }).title?.trim() || 'Okänd annons'
    const listingMake = (listing as { make?: string | null }).make ?? null
    const listingModel = (listing as { model?: string | null }).model ?? null
    const listingYear = (listing as { year?: number | null }).year ?? null
    const priceAtSale = (listing as { price?: number | null }).price ?? null

    // I första versionen: ingen beräknad svarstid/SLA – sätt null.
    const averageResponseTimeMs: number | null = null
    const slaWithin15m: boolean | null = null

    const { error: insertError } = await supabase.from('listing_sales').insert({
      listing_id: params.listingId,
      lead_id: leadId,
      // organization_id sätts av trigger (set_listing_sale_organization_id)
      sold_at: nowIso,
      sold_by_profile_id: params.soldByProfileId,
      sold_by_role: params.soldByRole,
      sold_via: params.soldVia,
      listing_title: listingTitle,
      listing_make: listingMake,
      listing_model: listingModel,
      listing_year: listingYear,
      price_at_sale: priceAtSale,
      views_count: viewsCount ?? 0,
      leads_count: leadsCount ?? 0,
      favorites_count: favoritesCount ?? 0,
      average_response_time_ms: averageResponseTimeMs,
      sla_within_15m: slaWithin15m,
    })

    if (insertError) {
      console.error('[listing-sales] insert listing_sales failed', {
        listingId: params.listingId,
        leadId,
        code: insertError.code,
        message: insertError.message,
      })
      return { success: false, error: 'Kunde inte spara säljdumpen.' }
    }

    return { success: true }
  } catch (err) {
    console.error('[listing-sales] unexpected error during sale dump', err)
    return { success: false, error: 'Kunde inte registrera försäljningen.' }
  }
}

export interface SaleListItem {
  id: string
  soldAt: string
  listingTitle: string
  listingMake?: string | null
  listingModel?: string | null
  listingYear?: number | null
  priceAtSale?: number | null
  soldByName?: string | null
  soldVia: SoldVia
}

/**
 * Hämtar de senaste N försäljningarna för den aktuella organisationen.
 * Använder RLS (organization_id) – endast intern Dealer/LeadOS-vy.
 */
export async function getRecentSalesForOrganization(
  organizationId: string,
  limit = 10
): Promise<SaleListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listing_sales')
    .select(
      `
      id,
      sold_at,
      listing_title,
      listing_make,
      listing_model,
      listing_year,
      price_at_sale,
      sold_via,
      sold_by_profile:profiles(full_name)
    `
    )
    .eq('organization_id', organizationId)
    .order('sold_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[listing-sales] getRecentSalesForOrganization failed', {
      organizationId,
      code: error.code,
      message: error.message,
    })
    return []
  }

  const rows =
    (data as Array<{
      id: string
      sold_at: string
      listing_title: string
      listing_make?: string | null
      listing_model?: string | null
      listing_year?: number | null
      price_at_sale?: number | null
      sold_via: SoldVia
      sold_by_profile?: { full_name?: string | null } | null
    }>) ?? []

  return rows.map((row) => ({
    id: row.id,
    soldAt: row.sold_at,
    listingTitle: row.listing_title,
    listingMake: row.listing_make ?? null,
    listingModel: row.listing_model ?? null,
    listingYear: row.listing_year ?? null,
    priceAtSale: row.price_at_sale ?? null,
    soldByName: row.sold_by_profile?.full_name?.trim() || null,
    soldVia: row.sold_via,
  }))
}


