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
  koreanLiteral?: string | null
  literalMeta?: {
    clauseType: string
    motherClauseType: string
    predictedTam?: string
    hebrewText?: string
    wordOrder?: string
    matchRule: 'ctype+mother+he' | 'ctype+he' | 'ctype+mother' | 'ctype'
  } | null
  functions: string[]
  pipeDepth: number
  quotationBlock: number
  quotationDepth: number
  isRoot: boolean
  isDirectSpeech: boolean
  parentId: string | null
  depth: number
  path: string[]
  siblingIndex: number
  descendantCount: number
  hasChildren: boolean
  children: ClauseNode[]
}

export type ClauseStats = {
  totalNodes: number
  clauseTypes: Record<string, number>
  textTypes: Record<string, number>
}

export type LiteralCoverage = {
  totalRows: number
  matchedRows: number
  unmatchedRows: number
}

export type VerseMap = Record<string, string[]>

export type VerseLiteralRow = {
  clauseType: string
  motherClauseType: string
  predictedTam?: string
  hebrewText?: string
  wordOrder?: string
  koreanLiteral: string
}

export type ChapterData = {
  book: string
  bookName: string
  bookLabel: string
  chapter: number
  title: string
  root: ClauseNode
  stats: ClauseStats
  verseMap: VerseMap
  unmatchedLiteralByVerse: Record<string, VerseLiteralRow[]>
  literalCoverage: LiteralCoverage
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
  features: {
    koreanLiteral: boolean
  }
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
    literal: string
    licenseNote: string
  }
}

export type ViewMode = 'tree' | 'list'

export type BootState =
  | 'manifest-loading'
  | 'chapter-loading'
  | 'ready'
  | 'error'

export type ViewState = {
  book: string
  chapter: number
  view: ViewMode
  node: string | null
  hebrew: boolean
  gloss: boolean
  literal: boolean
  filters: string[]
}
