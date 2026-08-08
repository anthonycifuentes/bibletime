const stripAccents = (value: string): string => value.normalize("NFD").replace(/[̀-ͯ]/g, "")

/**
 * Accent- and case-insensitive normalization, for search/filter matching.
 * Lives in `core` because more than one module filters on it (the Bible
 * module's book/version pickers, the Songs library search) and feature
 * modules never import each other's internals.
 */
export const normalizeText = (value: string): string => stripAccents(value).toLowerCase().trim()
