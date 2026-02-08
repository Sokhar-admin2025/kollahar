import { z } from 'zod'

// Kategorier kan användas i appen (t.ex. för dropdown); validering här är bara min 1 tecken
export const insertListingSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Rubriken måste vara minst 3 tecken.' })
    .max(100, { message: 'Rubriken är för lång.' }),

  description: z
    .string()
    .min(10, { message: 'Beskrivningen måste vara minst 10 tecken.' })
    .max(5000),

  price: z.coerce
    .number()
    .min(0, { message: 'Priset kan inte vara negativt.' }),

  category: z
    .string()
    .min(1, { message: 'Du måste välja en kategori.' }),

  location: z
    .string()
    .min(1, { message: 'Du måste ange en plats.' }),

  images: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
})

export const updateListingSchema = insertListingSchema.extend({
  id: z.string().uuid(),
})

export type InsertListingInput = z.infer<typeof insertListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
