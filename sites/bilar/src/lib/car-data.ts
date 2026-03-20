// Top 50 vanligaste bilmärkena i Sverige med deras populäraste modeller
export interface CarBrand {
  brand: string
  models: string[]
}

export const CAR_BRANDS: CarBrand[] = [
  {
    brand: 'Volvo',
    models: ['XC60', 'XC90', 'XC40', 'V90', 'V60', 'S90', 'S60', 'V40', 'XC70', 'V70', 'S80', 'C30', 'C70']
  },
  {
    brand: 'BMW',
    models: ['3-serie', '5-serie', 'X3', 'X5', '1-serie', 'X1', '2-serie', '4-serie', 'X4', '7-serie', 'X6', 'X7', 'i3', 'i4']
  },
  {
    brand: 'Mercedes-Benz',
    models: ['C-klass', 'E-klass', 'A-klass', 'GLC', 'GLE', 'GLA', 'S-klass', 'B-klass', 'GLC Coupe', 'GLE Coupe', 'CLA', 'CLS', 'G-klass']
  },
  {
    brand: 'Audi',
    models: ['A4', 'A3', 'A6', 'Q5', 'Q3', 'A5', 'Q7', 'A1', 'Q2', 'A8', 'TT', 'e-tron', 'Q8', 'A7']
  },
  {
    brand: 'Volkswagen',
    models: ['Golf', 'Passat', 'Tiguan', 'Polo', 'Touran', 'Touareg', 'Arteon', 'ID.3', 'ID.4', 'T-Cross', 'T-Roc', 'Sharan', 'Up!']
  },
  {
    brand: 'Toyota',
    models: ['RAV4', 'Corolla', 'Yaris', 'Prius', 'Auris', 'C-HR', 'Land Cruiser', 'Highlander', 'Aygo', 'Camry', 'Supra', 'bZ4X']
  },
  {
    brand: 'Ford',
    models: ['Focus', 'Kuga', 'Mondeo', 'Fiesta', 'S-Max', 'Galaxy', 'Edge', 'Mustang', 'Puma', 'Explorer', 'Ranger', 'Transit']
  },
  {
    brand: 'Peugeot',
    models: ['308', '3008', '208', '5008', '2008', '508', 'Partner', 'Expert', 'Traveller', 'Rifter', 'e-208']
  },
  {
    brand: 'Skoda',
    models: ['Octavia', 'Kodiaq', 'Superb', 'Kamiq', 'Karoq', 'Fabia', 'Scala', 'Enyaq', 'Yeti', 'Rapid']
  },
  {
    brand: 'Kia',
    models: ['Sportage', 'Ceed', 'Niro', 'Sorento', 'Picanto', 'Stonic', 'XCeed', 'Soul', 'Optima', 'EV6', 'Seltos']
  },
  {
    brand: 'Hyundai',
    models: ['Tucson', 'i30', 'Kona', 'i20', 'Santa Fe', 'i40', 'ix35', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Bayon', 'Venue']
  },
  {
    brand: 'Nissan',
    models: ['Qashqai', 'Leaf', 'X-Trail', 'Micra', 'Juke', 'Note', 'Navara', 'Pathfinder', 'Ariya', 'Sentra']
  },
  {
    brand: 'Renault',
    models: ['Clio', 'Captur', 'Megane', 'Kadjar', 'Scenic', 'Talisman', 'Koleos', 'Zoe', 'Twingo', 'Arkana', 'Austral']
  },
  {
    brand: 'Opel',
    models: ['Astra', 'Corsa', 'Crossland', 'Grandland', 'Insignia', 'Mokka', 'Combo', 'Vivaro', 'Zafira', 'Adam']
  },
  {
    brand: 'Mazda',
    models: ['CX-5', 'CX-3', 'Mazda3', 'Mazda6', 'CX-30', 'MX-5', 'CX-60', 'CX-8', 'CX-9', 'MX-30']
  },
  {
    brand: 'SEAT',
    models: ['Leon', 'Ateca', 'Ibiza', 'Arona', 'Tarraco', 'Formentor', 'Alhambra', 'Toledo', 'Mii', 'Cupra Born']
  },
  {
    brand: 'Citroën',
    models: ['C3', 'C4', 'C5 Aircross', 'Berlingo', 'C4 Cactus', 'Grand C4 Picasso', 'C1', 'C3 Aircross', 'C5 X', 'e-C4']
  },
  {
    brand: 'Dacia',
    models: ['Duster', 'Sandero', 'Logan', 'Lodgy', 'Dokker', 'Spring', 'Jogger', 'Duster Hybrid']
  },
  {
    brand: 'Tesla',
    models: ['Model 3', 'Model Y', 'Model S', 'Model X']
  },
  {
    brand: 'Lexus',
    models: ['NX', 'RX', 'UX', 'ES', 'IS', 'LC', 'LS', 'GX', 'LX']
  },
  {
    brand: 'Land Rover',
    models: ['Discovery Sport', 'Range Rover Evoque', 'Range Rover', 'Discovery', 'Range Rover Sport', 'Defender', 'Velar']
  },
  {
    brand: 'MINI',
    models: ['Cooper', 'Countryman', 'Clubman', 'Paceman', 'Convertible', 'Electric']
  },
  {
    brand: 'Subaru',
    models: ['Forester', 'Outback', 'XV', 'Impreza', 'Legacy', 'BRZ', 'Ascent']
  },
  {
    brand: 'Suzuki',
    models: ['Vitara', 'S-Cross', 'Swift', 'Ignis', 'SX4', 'Jimny', 'Across', 'Swace']
  },
  {
    brand: 'Jeep',
    models: ['Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator']
  },
  {
    brand: 'Fiat',
    models: ['500', 'Panda', 'Tipo', '500X', '500L', 'Doblo', 'Qubo', '500e']
  },
  {
    brand: 'Alfa Romeo',
    models: ['Giulia', 'Stelvio', 'Giulietta', '4C', 'Tonale']
  },
  {
    brand: 'Jaguar',
    models: ['F-Pace', 'E-Pace', 'XE', 'XF', 'I-Pace', 'F-Type']
  },
  {
    brand: 'Porsche',
    models: ['Macan', 'Cayenne', '911', 'Panamera', 'Taycan', 'Boxster', 'Cayman']
  },
  {
    brand: 'Honda',
    models: ['CR-V', 'Civic', 'HR-V', 'Jazz', 'Accord', 'e', 'Pilot', 'Passport']
  },
  {
    brand: 'Mitsubishi',
    models: ['Outlander', 'ASX', 'Eclipse Cross', 'Space Star', 'L200', 'Outlander PHEV']
  },
  {
    brand: 'Infiniti',
    models: ['Q30', 'QX30', 'Q50', 'QX50', 'Q60', 'QX60', 'QX70']
  },
  {
    brand: 'Genesis',
    models: ['GV70', 'GV80', 'G70', 'G80', 'G90', 'GV60']
  },
  {
    brand: 'Polestar',
    models: ['Polestar 2', 'Polestar 3', 'Polestar 4']
  },
  {
    brand: 'Cupra',
    models: ['Formentor', 'Born', 'Leon', 'Ateca']
  },
  {
    brand: 'MG',
    models: ['MG4', 'ZS', 'HS', 'Marvel R', '5']
  },
  {
    brand: 'BYD',
    models: ['Atto 3', 'Han', 'Tang', 'Dolphin']
  },
  {
    brand: 'Lynk & Co',
    models: ['01', '02', '03', '05']
  },
  {
    brand: 'Nio',
    models: ['ET5', 'ET7', 'ES6', 'ES8']
  },
  {
    brand: 'Xpeng',
    models: ['P7', 'G3', 'G9']
  },
]

// Alla märken som array (för bakåtkompatibilitet)
export const CAR_MAKES = CAR_BRANDS.map(b => b.brand).sort()

// Legacy Record-format för bakåtkompatibilitet
export const CAR_MAKES_AND_MODELS: Record<string, string[]> = CAR_BRANDS.reduce((acc, brand) => {
  acc[brand.brand] = brand.models
  return acc
}, {} as Record<string, string[]>)

// Hämta modeller för ett specifikt märke
export const getModelsByMake = (make: string): string[] => {
  const brand = CAR_BRANDS.find(b => b.brand === make)
  return brand?.models || []
}

// Sök efter märke (case-insensitive)
export const searchMakes = (query: string): string[] => {
  if (!query.trim()) return []
  const lowerQuery = query.toLowerCase()
  return CAR_MAKES.filter(make => make.toLowerCase().includes(lowerQuery))
}

// Sök efter modell (case-insensitive, filtrerat på märke)
export const searchModels = (query: string, make?: string): string[] => {
  if (!query.trim()) return []
  const lowerQuery = query.toLowerCase()
  const models = make ? getModelsByMake(make) : CAR_BRANDS.flatMap(b => b.models)
  return models.filter(model => model.toLowerCase().includes(lowerQuery))
}

// Sök efter märke eller modell (för combobox)
export const searchCarMakeOrModel = (query: string): Array<{ type: 'make' | 'model', value: string, brand?: string }> => {
  if (!query.trim()) return []
  const lowerQuery = query.toLowerCase()
  const results: Array<{ type: 'make' | 'model', value: string, brand?: string }> = []

  // Sök märken
  CAR_BRANDS.forEach(brand => {
    if (brand.brand.toLowerCase().includes(lowerQuery)) {
      results.push({ type: 'make', value: brand.brand })
    }
    // Sök modeller
    brand.models.forEach(model => {
      if (model.toLowerCase().includes(lowerQuery)) {
        results.push({ type: 'model', value: model, brand: brand.brand })
      }
    })
  })

  return results
}
