const stripAccents = (value: string): string => value.normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Accent- and case-insensitive normalization, for search/filter matching. */
export const normalizeText = (value: string): string => stripAccents(value).toLowerCase().trim()
