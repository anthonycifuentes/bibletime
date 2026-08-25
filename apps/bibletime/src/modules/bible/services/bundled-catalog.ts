import type { BibleVersionCatalogEntry } from "@/modules/bible/interfaces"

/** Where every upstream version file still lives; the catalog that used to sit beside them is gone. */
const SNAPSHOTS_BASE_URL = "https://mrk214.github.io/snapshots"

const entry = (
  lang_key: string,
  lang_name: string,
  local_abbreviation: string,
  local_title: string,
  version_id: number
): BibleVersionCatalogEntry => ({
  version_id,
  local_abbreviation,
  local_title,
  json_url: `${SNAPSHOTS_BASE_URL}/${lang_key}/${local_abbreviation}_vid_${version_id}.json`,
  lang_name,
  lang_key,
})

/**
 * The translation catalog the app carries with it.
 *
 * Why it exists: on 2026-08-25 the upstream catalog
 * (`https://mrk214.github.io/snapshots/data.json`) started returning 404 —
 * while every per-version file it pointed at kept serving. Because the
 * version list was built from that one request, the Bible tab went empty,
 * hiding even the bundled RVR1960 and the user's own downloads (and it had
 * always gone empty offline, for the same reason). This is the fallback
 * `getBibleVersionCatalog` returns whenever the remote catalog cannot be
 * loaded, so the list is never empty again.
 *
 * Transcribed from the tables in the `mrk214/snapshots` README, one block
 * per `lang_key` folder. To refresh: re-read that README and mirror its
 * rows here — see `docs/bible-data.md`.
 */
export const BUNDLED_BIBLE_VERSION_CATALOG: BibleVersionCatalogEntry[] = [
  // en___eng___eng
  entry("en___eng___eng", "English", "CSB", "Christian Standard Bible", 1713),
  entry("en___eng___eng", "English", "ESV", "English Standard Version 2016", 59),
  entry("en___eng___eng", "English", "KJV", "King James Version", 1),
  entry("en___eng___eng", "English", "NASB2020", "New American Standard Bible - NASB", 2692),
  entry("en___eng___eng", "English", "NIV", "New International Version", 111),
  entry("en___eng___eng", "English", "NKJV", "New King James Version", 114),
  entry("en___eng___eng", "English", "NLT", "New Living Translation", 116),
  // es___spa___spa
  entry("es___spa___spa", "Español", "DHH94I", "Biblia Dios Habla Hoy", 52),
  entry("es___spa___spa", "Español", "DHHS94", "Dios habla Hoy Estándar", 1846),
  entry("es___spa___spa", "Español", "LBLA", "La Biblia de las Américas", 89),
  entry("es___spa___spa", "Español", "NBLA", "Nueva Biblia de las Américas", 103),
  entry("es___spa___spa", "Español", "NTV", "Nueva Traducción Viviente", 127),
  entry("es___spa___spa", "Español", "NVI", "Nueva Versión Internacional - Español", 128),
  entry("es___spa___spa", "Español", "RVA2015", "Reina Valera Actualizada", 1782),
  entry("es___spa___spa", "Español", "RVC", "Reina Valera Contemporánea", 146),
  entry("es___spa___spa", "Español", "RVR1960", "Biblia Reina Valera 1960", 149),
  entry("es___spa___spa", "Español", "TLAI", "Traducción en Lenguaje Actual Interconfesional", 178),
  entry("es___spa___spa", "Español", "TLA", "Traducción en Lenguaje Actual", 176),
  // es___spa___spa_es
  entry("es___spa___spa_es", "Español", "NVI", "Nueva Versión Internacional - Castellano", 1637),
  // pt___por___por
  entry("pt___por___por", "Português", "A21", "Biblia Almeida Século 21", 2645),
  entry("pt___por___por", "Português", "ARA", "Almeida Revista e Atualizada", 1608),
  entry("pt___por___por", "Português", "ARC", "Almeida Revista e Corrigida", 212),
  entry("pt___por___por", "Português", "NAA", "Nova Almeida Atualizada", 1840),
  entry("pt___por___por", "Português", "NTLH", "Nova Tradução na Linguagem de Hoje", 211),
  entry("pt___por___por", "Português", "NVI", "Nova Versão Internacional 2011", 4360),
  // pt___por___por_pt
  entry("pt___por___por_pt", "Português", "ARC", "Almeida Revista e Corrigida (Portugal)", 215),
]
