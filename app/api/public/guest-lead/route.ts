import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const FROM_EMAIL = 'noreply@kollahar.se'

// Använd endast produktions-URL för e-postlänkar – aldrig VERCEL_URL (tar användare till Vercel-login)
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kollahar.se'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY saknas – gäst-lead kräver service role.' },
        { status: 503 }
      )
    }

    const body = (await request.json().catch(() => null)) as
      | {
          listingId?: string
          buyerName?: string
          buyerPhone?: string
          buyerEmail?: string
        }
      | null

    const listingId = body?.listingId?.trim() ?? ''
    const buyerName = body?.buyerName?.trim() ?? ''
    const buyerPhone = body?.buyerPhone?.trim() ?? ''
    const buyerEmailRaw = body?.buyerEmail?.trim() ?? ''

    if (!listingId || !buyerName || !buyerPhone) {
      return NextResponse.json(
        { error: 'listingId, buyerName och buyerPhone är obligatoriska.' },
        { status: 400 }
      )
    }

    if (buyerName.length > 200 || buyerPhone.length > 100 || buyerEmailRaw.length > 320) {
      return NextResponse.json(
        { error: 'Ett av fälten är för långt. Försök igen med kortare text.' },
        { status: 400 }
      )
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, title, user_id, seller_type, organization_id, status')
      .eq('id', listingId)
      .maybeSingle()

    if (listingError) {
      return NextResponse.json(
        { error: 'Kunde inte hämta annons för lead.' },
        { status: 500 }
      )
    }

    if (!listing) {
      return NextResponse.json({ error: 'Annonsen hittades inte.' }, { status: 404 })
    }

    const typedListing = listing as {
      id: string
      title?: string | null
      user_id: string
      seller_type?: string | null
      organization_id?: string | null
      status?: string | null
    }

    if (typedListing.status && typedListing.status !== 'active') {
      return NextResponse.json(
        { error: 'Lead kan bara skapas för aktiva annonser.' },
        { status: 400 }
      )
    }

    if (typedListing.seller_type !== 'company') {
      return NextResponse.json(
        { error: 'Gäst-leads är endast tillgängligt för företagsannonser.' },
        { status: 400 }
      )
    }

    const organizationId = typedListing.organization_id
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Annonsen saknar organization_id. Kontakta support om felet kvarstår.' },
        { status: 500 }
      )
    }

    const buyerEmail =
      buyerEmailRaw && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmailRaw) ? buyerEmailRaw : null

    const insertPayload = {
      listing_id: typedListing.id,
      seller_id: typedListing.user_id,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      status: 'new' as const,
      is_guest: true,
      source: 'guest_form',
      organization_id: organizationId,
      assigned_to: typedListing.user_id,
    }

    const { error: insertError } = await supabaseAdmin.from('leads').insert(insertPayload)

    if (insertError) {
      return NextResponse.json(
        { error: 'Kunde inte spara lead just nu. Försök igen senare.' },
        { status: 500 }
      )
    }

    if (!resend) {
      // Ingen e-postkonfiguration – leaden är ändå sparad.
      return NextResponse.json({ success: true })
    }

    // Skicka enkel notis till annonsägaren med kontaktuppgifterna.
    const { data: ownerUser, error: ownerError } = await supabaseAdmin.auth.admin.getUserById(
      typedListing.user_id
    )

    if (ownerError || !ownerUser?.user?.email) {
      return NextResponse.json({ success: true })
    }

    const listingTitle = (typedListing.title ?? 'Okänd annons').trim()
    const subject = `Nytt lead (gäst) – ${listingTitle} – ${buyerName}`
    const listingUrl = `${BASE_URL}/annons/${typedListing.id}`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#f5f5f5; padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="margin:0 0 16px;font-size:20px;color:#2C4638;">Nytt lead från gäst (utan konto)</h2>
    <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Köpare:</strong> ${escapeHtml(
      buyerName
    )}</p>
    <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Telefon:</strong> ${escapeHtml(
      buyerPhone
    )}</p>
    ${
      buyerEmail
        ? `<p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>E-post:</strong> ${escapeHtml(
            buyerEmail
          )}</p>`
        : ''
    }
    <p style="margin:16px 0 8px;font-size:14px;color:#333;"><strong>Annons:</strong> ${escapeHtml(
      listingTitle
    )}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#333;">
      <a href="${escapeHtml(
        listingUrl
      )}" style="display:inline-block;padding:10px 20px;border-radius:8px;background:#2C4638;color:#ffffff;text-decoration:none;font-weight:600;">
        Öppna annonsen
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#666;">
      Detta lead skapades av en gäst via formulär på annons-sidan utan inloggning.
    </p>
  </div>
</body>
</html>
`

    const { error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ownerUser.user.email],
      subject,
      html,
    })

    if (emailError) {
      console.error('[guest-lead] Failed to send email:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[guest-lead] Unexpected error', err)
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod. Försök igen senare.' },
      { status: 500 }
    )
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

