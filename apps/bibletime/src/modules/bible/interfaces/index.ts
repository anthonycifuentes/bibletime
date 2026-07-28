export interface BibleLanguage {
  iso_639_1: string
  iso_639_3: string
  language_tag: string
  local_name: string
  text_direction: string
}

export interface BiblePublisher {
  name: string
}

export interface BibleCopyright {
  html: string
  text: string
}

export interface NextPrev {
  usfm: string
  human: string
  canonical: boolean
  toc: boolean
}

export type ChapterItemType =
  | "section1"
  | "section2"
  | "heading1"
  | "heading2"
  | "label"
  | "verse"

export interface ChapterItemRlwLine {
  text: string
  rl: boolean
}

export interface ChapterItem {
  type: ChapterItemType
  verse_numbers: number[]
  lines: string[]
  rlw_lines: ChapterItemRlwLine[][]
}

export interface ChapterCurrent {
  usfm: string
  human: string
}

export interface Chapter {
  chapter_usfm: string
  is_chapter: boolean
  previous: NextPrev | null
  current: ChapterCurrent
  next: NextPrev | null
  items: ChapterItem[]
}

export interface Book {
  book_usfm: string
  name: string
  chapters: Chapter[]
}

export interface BibleVersion {
  version_id: number
  local_abbreviation: string
  local_title: string
  language: BibleLanguage
  repository: string
  publisher: BiblePublisher
  copyright: BibleCopyright
  books: Book[]
}
