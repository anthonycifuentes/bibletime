import { getBibleData } from "@/modules/bible/services"

export type ParseReferenceResult =
  | { status: "resolved"; bookUsfm: string; chapterUsfm: string; verseNumber?: number }
  | { status: "not-found"; input: string }

/**
 * Small, non-exhaustive table of common Spanish book abbreviations that
 * don't otherwise match the bundled data's own `books[].name` values
 * (e.g. "Jn" for "S. Juan", "Sal" for "Salmos"). Keys are normalized
 * (lowercased, accent-stripped, dot-stripped) at lookup time.
 */
const COMMON_ABBREVIATIONS: Record<string, string> = {
  gn: "GEN",
  gen: "GEN",
  ex: "EXO",
  exo: "EXO",
  exod: "EXO",
  lv: "LEV",
  lev: "LEV",
  nm: "NUM",
  num: "NUM",
  dt: "DEU",
  deu: "DEU",
  deut: "DEU",
  jos: "JOS",
  jue: "JDG",
  jdg: "JDG",
  rt: "RUT",
  rut: "RUT",
  "1sa": "1SA",
  "1s": "1SA",
  "2sa": "2SA",
  "2s": "2SA",
  "1re": "1KI",
  "1r": "1KI",
  "1ki": "1KI",
  "2re": "2KI",
  "2r": "2KI",
  "2ki": "2KI",
  "1cr": "1CH",
  "1ch": "1CH",
  "2cr": "2CH",
  "2ch": "2CH",
  esd: "EZR",
  ezr: "EZR",
  neh: "NEH",
  est: "EST",
  job: "JOB",
  sal: "PSA",
  salmo: "PSA",
  salmos: "PSA",
  ps: "PSA",
  psa: "PSA",
  pr: "PRO",
  pro: "PRO",
  prov: "PRO",
  ec: "ECC",
  ecc: "ECC",
  cnt: "SNG",
  cant: "SNG",
  cantares: "SNG",
  is: "ISA",
  isa: "ISA",
  jer: "JER",
  lam: "LAM",
  ez: "EZK",
  eze: "EZK",
  ezk: "EZK",
  dn: "DAN",
  dan: "DAN",
  os: "HOS",
  ose: "HOS",
  hos: "HOS",
  jl: "JOL",
  joel: "JOL",
  am: "AMO",
  amo: "AMO",
  ab: "OBA",
  abd: "OBA",
  jon: "JON",
  mi: "MIC",
  miq: "MIC",
  na: "NAM",
  nah: "NAM",
  hab: "HAB",
  sof: "ZEP",
  zep: "ZEP",
  hag: "HAG",
  zac: "ZEC",
  zec: "ZEC",
  mal: "MAL",
  mt: "MAT",
  mat: "MAT",
  mateo: "MAT",
  mr: "MRK",
  mc: "MRK",
  mar: "MRK",
  marcos: "MRK",
  lc: "LUK",
  luc: "LUK",
  lucas: "LUK",
  jn: "JHN",
  juan: "JHN",
  hch: "ACT",
  hechos: "ACT",
  act: "ACT",
  rom: "ROM",
  ro: "ROM",
  "1co": "1CO",
  "1cor": "1CO",
  "2co": "2CO",
  "2cor": "2CO",
  gal: "GAL",
  ef: "EPH",
  efe: "EPH",
  efesios: "EPH",
  fil: "PHP",
  flp: "PHP",
  col: "COL",
  "1ts": "1TH",
  "1tes": "1TH",
  "2ts": "2TH",
  "2tes": "2TH",
  "1ti": "1TI",
  "1tim": "1TI",
  "2ti": "2TI",
  "2tim": "2TI",
  tit: "TIT",
  flm: "PHM",
  heb: "HEB",
  stg: "JAS",
  sant: "JAS",
  jas: "JAS",
  "1p": "1PE",
  "1pe": "1PE",
  "2p": "2PE",
  "2pe": "2PE",
  "1jn": "1JN",
  "2jn": "2JN",
  "3jn": "3JN",
  jud: "JUD",
  ap: "REV",
  apo: "REV",
  rev: "REV",
}

/** A trailing "<chapter>" or "<chapter>:<verse>" pattern, e.g. "3:16" or "23". */
const REFERENCE_PATTERN = /^(.+?)\s+(\d+)(?::(\d+))?$/

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const normalize = (value: string): string =>
  stripAccents(value).toLowerCase().replace(/\./g, "").trim()

const buildBookLookup = (
  books: { book_usfm: string; name: string }[]
): Map<string, string> => {
  const lookup = new Map<string, string>()

  for (const [abbreviation, bookUsfm] of Object.entries(COMMON_ABBREVIATIONS)) {
    lookup.set(normalize(abbreviation), bookUsfm)
  }

  for (const book of books) {
    const normalizedName = normalize(book.name)
    lookup.set(normalizedName, book.book_usfm)
    // Some book names carry a "S. " (San/Santo) prefix, e.g. "S. Juan" —
    // allow matching without it too.
    lookup.set(normalizedName.replace(/^s\s+/, ""), book.book_usfm)
  }

  return lookup
}

/**
 * Parses a typed reference string (e.g. "Juan 3:16", "Salmos 23", "Jn 3:16")
 * into a resolved book/chapter/verse, or a not-found result. Never throws.
 */
export const parseReference = async (input: string): Promise<ParseReferenceResult> => {
  const trimmedInput = input.trim()
  const match = REFERENCE_PATTERN.exec(trimmedInput)

  if (!match) {
    return { status: "not-found", input }
  }

  const [, rawBookPart, rawChapter, rawVerse] = match
  const data = await getBibleData()
  const lookup = buildBookLookup(data.books)
  const bookUsfm = lookup.get(normalize(rawBookPart))

  if (!bookUsfm) {
    return { status: "not-found", input }
  }

  const chapterUsfm = `${bookUsfm}.${rawChapter}`
  const verseNumber = rawVerse ? Number(rawVerse) : undefined

  return { status: "resolved", bookUsfm, chapterUsfm, verseNumber }
}
