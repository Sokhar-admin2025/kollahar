export type ServiceResult<T> = {
  success: boolean
  data?: T
  error?: string
  /** Totalt antal matchande rader (t.ex. för paginering). Finns vid getListings. */
  totalCount?: number
}

