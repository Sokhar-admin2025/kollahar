/**
 * Parser för Smistabil CSV-export.
 * Mappar kolumner till Kollahär listing-format med transformationer.
 */

import { parse } from 'csv-parse/sync'
import { parseEquipmentList } from './equipment-parser'
import type { InsertListingInput } from '@/lib/validators/listing-schema'

const DEMO_CONTACT_EMAIL = 'demo@example.com'
const DEMO_CONTACT_NAME = 'Demo Bilhandel'
const FIXED_LOCATION = 'Upplands Väsby'
const CATEGORY_CARS = 'cars'

function parsePrice(val: string | undefined): number {
  if (!val?.trim()) return 0
  const cleaned = val.replace(/\s/g, '').replace(/kr/gi, '').replace(/exkl\.?\s*moms/gi, '').trim()
  const num = parseInt(cleaned, 10)
  return Number.isNaN(num) ? 0 : num
}

function parseMileage(val: string | undefined): number | undefined {
  if (!val?.trim()) return undefined
  const cleaned = val.replace(/\s/g, '').replace(/mil/gi, '').trim()
  const num = parseInt(cleaned, 10)
  return Number.isNaN(num) ? undefined : num
}

function parseInteger(val: string | undefined): number | undefined {
  if (!val?.trim()) return undefined
  const cleaned = val.replace(/[^\d]/g, '')
  if (!cleaned) return undefined
  const num = parseInt(cleaned, 10)
  return Number.isNaN(num) ? undefined : num
}

function mapGearbox(val: string | undefined): string | undefined {
  if (!val?.trim()) return undefined
  const v = val.toLowerCase()
  if (v.includes('automat')) return 'Automat'
  if (v.includes('manuell')) return 'Manuell'
  return val.trim()
}

function mapFuel(val: string | undefined): string | undefined {
  if (!val?.trim()) return undefined
  const v = val.toLowerCase()
  if (v.includes('hybrid')) return 'Hybrid'
  if (v.includes('bensin')) return 'Bensin'
  if (v.includes('diesel')) return 'Diesel'
  if (v.includes('el')) return 'El'
  if (v.includes('gas')) return 'Gas'
  return val.trim()
}

function extractExternalId(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined
  const match = url.match(/#\/objekt\/(\d+)/) || url.match(/objekt\/(\d+)/)
  return match?.[1]
}

function collectImages(row: Record<string, string>): string[] {
  // Smistabil-exporter kan ha flera varianter, t.ex. image, image_2 eller comma-separated listor.
  const cols = Object.keys(row).filter((key) => key.toLowerCase().includes('image'))
  const seen = new Set<string>()
  const urls: string[] = []
  for (const col of cols) {
    const val = row[col]
    if (!val?.trim()) continue
    const lines = val
      .split(/[,\n;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const url of lines) {
      if (url.startsWith('http') && !seen.has(url)) {
        seen.add(url)
        urls.push(url)
      }
    }
  }
  return urls
}

function genericizeText(text: string): string {
  return text
    .replace(/smistabil\.se/gi, 'example.com')
    .replace(/Smista Bil/gi, DEMO_CONTACT_NAME)
    .replace(/info@smistabil\.se/gi, DEMO_CONTACT_EMAIL)
    .replace(/08-550\s*36\s*550/gi, '')
    .trim()
}

function getDescription(row: Record<string, string>, hasEquipmentInAttributes: boolean): string {
  const carDesc = row['Car_Description']?.trim()
  const desc = row['description']?.trim()
  const equipment = row['Equipment_List']?.trim()
  let combined = carDesc || desc || row['name'] || row['Car_Name'] || 'Bil till salu.'
  // Lägg inte till Utrustning i beskrivning om vi sparar den i attributes.equipment
  if (equipment && !hasEquipmentInAttributes) {
    combined = `${combined}\n\nUtrustning: ${equipment.replace(/\n/g, ', ')}`
  }
  return genericizeText(combined).slice(0, 5000) || 'Bil till salu.'
}

function getParsedEquipment(row: Record<string, string>): string[] | undefined {
  const equipment = row['Equipment_List']?.trim()
  if (!equipment) return undefined
  const parsed = parseEquipmentList(equipment.replace(/\n/g, ' '))
  return parsed.length > 0 ? parsed : undefined
}

function ensureMinLength(text: string, min: number): string {
  const t = text.trim()
  if (t.length >= min) return t
  return (t ? t + ' ' : '') + 'Bil till salu.'
}

export interface SmistabilImportRow {
  listing: InsertListingInput
  externalId?: string
  externalUrl?: string
}

export function parseSmistabilCsv(csvContent: string): SmistabilImportRow[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, string>[]

  const rows: SmistabilImportRow[] = []

  for (const row of records) {
    const name = row['name'] || row['Car_Name'] || row['name_1'] || 'Okänd bil'
    const title = genericizeText(name).trim().slice(0, 100) || 'Bil till salu'

    const price = parsePrice(row['price'] || row['Car_Price'] || row['data'])
    if (price <= 0) continue

    const equipmentList = getParsedEquipment(row)
    const hasEquipmentInAttributes = Boolean(equipmentList?.length)
    const description = ensureMinLength(getDescription(row, hasEquipmentInAttributes), 10)

    const year = parseInt(row['Year'] || row['data2'] || '', 10)
    const mileage = parseMileage(row['Mileage'] || row['data3'] || '')
    const make = row['Car_Make']?.trim() || undefined
    const model = row['Car_Model']?.trim() || undefined
    const fuelType = mapFuel(row['Fuel']) || row['Fuel']?.trim() || undefined
    const transmission = mapGearbox(row['Gearbox']) || row['Gearbox']?.trim() || undefined
    const enginePower = parseInteger(row['Horse_Power'] || row['Engine_Power'] || row['Power'])

    const attributes: Record<string, unknown> = {}
    if (make) attributes.make = make
    if (model) attributes.model = model
    if (year && !Number.isNaN(year)) attributes.year = year
    if (mileage != null) attributes.mileage = mileage
    if (fuelType) attributes.fuel = fuelType
    if (transmission) attributes.gearbox = transmission
    if (enginePower != null) attributes.horse_power = enginePower
    if (row['Color']) attributes.color = row['Color'].trim()
    if (row['Registration_Number']) attributes.reg_nr = row['Registration_Number'].trim()

    if (equipmentList) attributes.equipment = equipmentList

    const images = collectImages(row)

    const itemPageLink = row['item_page_link']?.trim()
    const externalId = extractExternalId(itemPageLink)

    rows.push({
      listing: {
        title,
        description,
        price,
        bortskankes: false,
        status: 'active',
        contact_via_chat: true,
        show_phone: false,
        show_email: true,
        category: CATEGORY_CARS,
        location: FIXED_LOCATION,
        make,
        model,
        year: year && !Number.isNaN(year) ? year : undefined,
        mileage,
        fuel_type: fuelType,
        transmission,
        engine_power: enginePower,
        images: images.length > 0 ? images : undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        contact_email: DEMO_CONTACT_EMAIL,
        contact_name: DEMO_CONTACT_NAME,
        external_id: externalId,
        external_url: itemPageLink || undefined,
      },
      externalId,
      externalUrl: itemPageLink,
    })
  }

  return rows
}
