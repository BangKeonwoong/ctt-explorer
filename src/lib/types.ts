export type ClauseNode = {
  id: string
  verse: string
  pn: string
  ctype: string
  mother: string
  textType: string
  paragraph: string
  atomNumber: string
  subtype: string
  hierarchy: string
  surface: string
  surfaceHebrew: string
  gloss: string
  functions: string[]
  pipeDepth: number
  quotationBlock: number
  quotationDepth: number
  isRoot: boolean
  isDirectSpeech: boolean
  children: ClauseNode[]
}

export type ClauseStats = {
  totalNodes: number
  clauseTypes: Record<string, number>
  textTypes: Record<string, number>
}

export type VerseMap = Record<string, string[]>

export type ChapterData = {
  book: string
  bookName: string
  bookLabel: string
  chapter: number
  title: string
  root: ClauseNode
  stats: ClauseStats
  verseMap: VerseMap
}

export type ManifestChapter = {
  chapter: number
  title: string
  file: string
  stats: ClauseStats
}

export type ManifestBookStatus = 'available' | 'planned'

export type ManifestBook = {
  code: string
  name: string
  label: string
  testament: 'OT' | 'NT'
  chapterCount: number
  status: ManifestBookStatus
  chapters: ManifestChapter[]
}

export type Manifest = {
  generatedAt: string
  productName: string
  books: ManifestBook[]
  bhsaEnrichment: boolean
  attribution: {
    ctt: string
    bhsa: string
    textFabric: string
    licenseNote: string
  }
}

export type ViewMode = 'tree' | 'list'

export type ViewState = {
  book: string
  chapter: number
  view: ViewMode
  node: string | null
  hebrew: boolean
  gloss: boolean
  filters: string[]
}
