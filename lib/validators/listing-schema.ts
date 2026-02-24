import { z } from 'zod'

const priceRefine = (data: { bortskankes?: boolean; price: number }) =>
  data.bortskankes || data.price >= 1

const hasAtLeastOneContactChannel = (data: {
  contact_via_chat?: boolean
  show_phone?: boolean
  show_email?: boolean
}) => Boolean(data.contact_via_chat || data.show_phone || data.show_email)

const hasPhoneIfShown = (data: {
  show_phone?: boolean
  contact_phone?: string
}) => !data.show_phone || Boolean(data.contact_phone?.trim())

const hasEmailIfShown = (data: {
  show_email?: boolean
  contact_email?: string
}) => !data.show_email || Boolean(data.contact_email?.trim())

const visibleChannelsHaveValues = (data: {
  show_phone?: boolean
  show_email?: boolean
  contact_phone?: string
  contact_email?: string
}) => {
  return hasPhoneIfShown(data) && hasEmailIfShown(data)
}

const optionalText = z.string().trim().min(1).optional()
const optionalInt = z.coerce.number().int().nonnegative().optional()

// Bas-objekt för insert och update (ZodObject så att .extend() fungerar)
const listingBaseSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Rubriken måste vara minst 3 tecken.' })
    .max(100, { message: 'Rubriken är för lång.' }),

  description: z
    .string()
    .min(10, { message: 'Beskrivningen måste vara minst 10 tecken.' })
    .max(5000),

  price: z.coerce.number(),

  bortskankes: z.boolean().optional().default(false),

  category: z
    .string()
    .min(1, { message: 'Du måste välja en kategori.' }),

  location: z
    .string()
    .min(1, { message: 'Du måste ange en plats.' }),

  images: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),

  // Vehicle-agnostic dedicated columns (for indexed filtering)
  make: optionalText,
  model: optionalText,
  year: z.coerce.number().int().min(1800).max(9999).optional(),
  mileage: optionalInt,
  engine_hours: optionalInt,
  fuel_type: optionalText,
  transmission: optionalText,
  engine_power: optionalInt,
  length_cm: optionalInt,

  // Import / inventory sync
  external_id: z.string().optional(),
  external_url: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_name: z.string().optional(),

  // Contact channels (privacy-first for private sellers)
  contact_via_chat: z.boolean().optional().default(true),
  show_phone: z.boolean().optional().default(false),
  show_email: z.boolean().optional().default(false),

  // Draft: gömd från alla utom ägare (endast för handlare/alla som skapar)
  status: z.enum(['active', 'draft']).optional().default('active'),
})

export const insertListingSchema = listingBaseSchema.refine(priceRefine, {
  message: 'Priset måste vara minst 1 kr om annonsen inte är bortskänkes.',
  path: ['price'],
})
  .refine(hasAtLeastOneContactChannel, {
    message: 'Minst en kontaktkanal måste vara aktiv (chatt, telefon eller e-post).',
    path: ['contact_via_chat'],
  })
  .refine(visibleChannelsHaveValues, {
    message: 'Ange telefonnummer eller stäng av Visa telefon.',
    path: ['contact_phone'],
  })
  .refine(hasEmailIfShown, {
    message: 'Ange e-post eller stäng av Visa e-post.',
    path: ['contact_email'],
  })

export const updateListingSchema = listingBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(priceRefine, {
    message: 'Priset måste vara minst 1 kr om annonsen inte är bortskänkes.',
    path: ['price'],
  })
  .refine(hasAtLeastOneContactChannel, {
    message: 'Minst en kontaktkanal måste vara aktiv (chatt, telefon eller e-post).',
    path: ['contact_via_chat'],
  })
  .refine(visibleChannelsHaveValues, {
    message: 'Ange telefonnummer eller stäng av Visa telefon.',
    path: ['contact_phone'],
  })
  .refine(hasEmailIfShown, {
    message: 'Ange e-post eller stäng av Visa e-post.',
    path: ['contact_email'],
  })

export type InsertListingInput = z.infer<typeof insertListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
