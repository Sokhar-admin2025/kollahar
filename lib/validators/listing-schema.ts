import { z } from 'zod'

const priceRefine = (data: { bortskankes?: boolean; price: number }) =>
  data.bortskankes || data.price >= 1

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
})

export const insertListingSchema = listingBaseSchema.refine(priceRefine, {
  message: 'Priset måste vara minst 1 kr om annonsen inte är bortskänkes.',
  path: ['price'],
})

export const updateListingSchema = listingBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(priceRefine, {
    message: 'Priset måste vara minst 1 kr om annonsen inte är bortskänkes.',
    path: ['price'],
  })

export type InsertListingInput = z.infer<typeof insertListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
