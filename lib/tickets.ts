import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function generarCodigoTicket() {
  // Código simple tipo ABCD-1234 (ajusta a tu gusto)
  const random = crypto.randomUUID().split('-')[0].toUpperCase()
  return `TK-${random}`
}

export async function crearTicket({
  eventZoneId,
  userId,
  promoterId,
  promoterLinkId,
}: {
  eventZoneId: string
  userId: string
  promoterId?: string | null
  promoterLinkId?: string | null
}) {
  const codigo = generarCodigoTicket()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  // Link que se puede usar como QR y como link_acceso
  const linkAcceso = `${baseUrl}/ticket/${codigo}`

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      event_zone_id: eventZoneId,
      user_id: userId,
      promoter_id: promoterId ?? null,
      promoter_link_id: promoterLinkId ?? null,
      codigo,
      qr_data: linkAcceso,   // lo que va dentro del QR
      link_acceso: linkAcceso,
      // usado, usado_en y created_at se llenan solos
    })
    .select(`
      id,
      event_zone_id,
      promoter_id,
      user_id,
      codigo,
      qr_data,
      link_acceso,
      usado,
      usado_en,
      created_at
    `)
    .single()

  if (error) {
    console.error('Error creando ticket:', error)
    throw error
  }

  return data
}
