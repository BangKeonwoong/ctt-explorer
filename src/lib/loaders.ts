import type {
  BootState,
  ChapterData,
  ClauseNode,
  ClauseStats,
  LiteralCoverage,
  Manifest,
  ManifestBook,
  VerseLiteralRow,
} from './types'

type LoadStage = 'manifest-loading' | 'chapter-loading' | 'error'

export type AppLoadErrorCode =
  | 'manifest-fetch-failed'
  | 'manifest-http-failed'
  | 'manifest-json-invalid'
  | 'manifest-normalize-failed'
  | 'chapter-fetch-failed'
  | 'chapter-http-failed'
  | 'chapter-json-invalid'
  | 'chapter-normalize-failed'
  | 'no-available-books'
  | 'runtime-error'
  | 'unhandled-rejection'

export type AppErrorSummary = {
  code: AppLoadErrorCode
  stage: LoadStage
  message: string
  url?: string
  details?: Record<string, unknown>
}

export type BootDiagnostics = {
  buildId: string
  state: BootState
  manifestUrl?: string
  chapterUrl?: string
  error: AppErrorSummary | null
  updatedAt: string
}

declare global {
  interface Window {
    __CTT_BOOT__?: BootDiagnostics
  }
}

const SCRIPT_SRC =
  typeof document !== 'undefined'
    ? document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? ''
    : ''

export const BUILD_ID = SCRIPT_SRC || 'dev'

const DEFAULT_LITERAL_COVERAGE: LiteralCoverage = {
  totalRows: 0,
  matchedRows: 0,
  unmatchedRows: 0,
}

const DEFAULT_ATTRIBUTION = {
  ctt: 'ETCBC/CTT',
  bhsa: 'ETCBC/bhsa',
  textFabric: 'Text-Fabric',
  literal: 'BangKeonwoong/bible-viewer · 성경 직역 정보 2.csv',
  licenseNote:
    'BHSA data is licensed CC BY-NC 4.0; use this project non-commercially and keep source attribution for BHSA and the Korean literal CSV.',
}

export class AppLoadError extends Error {
  code: AppLoadErrorCode
  stage: LoadStage
  url?: string
  details?: Record<string, unknown>

  constructor(summary: AppErrorSummary, options?: ErrorOptions) {
    super(summary.message, options)
    this.name = 'AppLoadError'
    this.code = summary.code
    this.stage = summary.stage
    this.url = summary.url
    this.details = summary.details
  }

  toSummary(): AppErrorSummary {
    return {
      code: this.code,
      stage: this.stage,
      message: this.message,
      url: this.url,
      details: this.details,
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a number`)
  }
  return value
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function normalizeLiteralCoverage(value: unknown): LiteralCoverage {
  if (!isRecord(value)) return DEFAULT_LITERAL_COVERAGE
  return {
    totalRows: readNumber(value.totalRows),
    matchedRows: readNumber(value.matchedRows),
    unmatchedRows: readNumber(value.unmatchedRows),
  }
}

function normalizeVerseLiteralRow(value: unknown): VerseLiteralRow {
  const row = asRecord(value, 'verse literal row')
  const koreanLiteral = requireString(
    row.koreanLiteral,
    'verse literal row.koreanLiteral',
  )
  return {
    clauseType: readString(row.clauseType),
    motherClauseType: readString(row.motherClauseType),
    predictedTam: readString(row.predictedTam),
    hebrewText: readString(row.hebrewText),
    wordOrder: readString(row.wordOrder),
    koreanLiteral,
  }
}

function normalizeNode(
  value: unknown,
  parentId: string | null,
  depth: number,
  prefix: string[],
  siblingIndex: number,
): ClauseNode {
  const node = asRecord(value, 'clause node')
  const id = requireString(node.id, 'clause node.id')
  const verse = readString(node.verse)
  const ctype = requireString(node.ctype, 'clause node.ctype')
  const path = [...prefix, id]
  const normalizedChildren = Array.isArray(node.children)
    ? node.children.map((child, index) =>
        normalizeNode(child, id, depth + 1, path, index),
      )
    : []

  const descendantCount = normalizedChildren.reduce(
    (sum, child) => sum + 1 + child.descendantCount,
    0,
  )

  return {
    id,
    verse,
    pn: readString(node.pn),
    ctype,
    mother: readString(node.mother),
    textType: readString(node.textType),
    paragraph: readString(node.paragraph),
    atomNumber: readString(node.atomNumber),
    subtype: readString(node.subtype),
    hierarchy: readString(node.hierarchy),
    surface: readString(node.surface),
    surfaceHebrew: readString(node.surfaceHebrew),
    gloss: readString(node.gloss),
    koreanLiteral: readString(node.koreanLiteral) || null,
    literalMeta: isRecord(node.literalMeta)
      ? {
          clauseType: readString(node.literalMeta.clauseType),
          motherClauseType: readString(node.literalMeta.motherClauseType),
          predictedTam: readString(node.literalMeta.predictedTam),
          hebrewText: readString(node.literalMeta.hebrewText),
          wordOrder: readString(node.literalMeta.wordOrder),
          matchRule:
            readString(node.literalMeta.matchRule) === 'ctype+mother+he' ||
            readString(node.literalMeta.matchRule) === 'ctype+he' ||
            readString(node.literalMeta.matchRule) === 'ctype+mother' ||
            readString(node.literalMeta.matchRule) === 'ctype'
              ? (readString(node.literalMeta.matchRule) as ClauseNode['literalMeta']['matchRule'])
              : 'ctype',
        }
      : null,
    functions: readStringArray(node.functions),
    pipeDepth:
      ctype === 'ROOT'
        ? -1
        : Math.max(readNumber(node.pipeDepth, depth), 0),
    quotationBlock: readNumber(node.quotationBlock),
    quotationDepth: readNumber(node.quotationDepth),
    isRoot: readBoolean(node.isRoot, ctype === 'ROOT'),
    isDirectSpeech: readBoolean(node.isDirectSpeech),
    parentId,
    depth,
    path,
    siblingIndex,
    descendantCount,
    hasChildren: normalizedChildren.length > 0,
    children: normalizedChildren,
  }
}

function deriveStats(root: ClauseNode): ClauseStats {
  const clauseTypes = new Map<string, number>()
  const textTypes = new Map<string, number>()
  let totalNodes = 0
  const stack = [root]

  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.ctype !== 'ROOT') {
      totalNodes += 1
      clauseTypes.set(node.ctype, (clauseTypes.get(node.ctype) ?? 0) + 1)
      const textType = node.textType || '?'
      textTypes.set(textType, (textTypes.get(textType) ?? 0) + 1)
    }
    stack.push(...node.children)
  }

  return {
    totalNodes,
    clauseTypes: Object.fromEntries(clauseTypes),
    textTypes: Object.fromEntries(textTypes),
  }
}

function normalizeStats(value: unknown, fallback: ClauseStats): ClauseStats {
  if (!isRecord(value)) return fallback
  const clauseTypes = isRecord(value.clauseTypes)
    ? Object.fromEntries(
        Object.entries(value.clauseTypes)
          .filter(([, count]) => typeof count === 'number' && Number.isFinite(count))
          .map(([key, count]) => [key, count as number]),
      )
    : fallback.clauseTypes
  const textTypes = isRecord(value.textTypes)
    ? Object.fromEntries(
        Object.entries(value.textTypes)
          .filter(([, count]) => typeof count === 'number' && Number.isFinite(count))
          .map(([key, count]) => [key, count as number]),
      )
    : fallback.textTypes

  return {
    totalNodes: readNumber(value.totalNodes, fallback.totalNodes),
    clauseTypes,
    textTypes,
  }
}

function normalizeVerseMap(value: unknown): ChapterData['verseMap'] {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entries]) => Array.isArray(entries))
      .map(([verse, entries]) => [verse, readStringArray(entries)]),
  )
}

function normalizeUnmatchedLiteralByVerse(
  value: unknown,
): Record<string, VerseLiteralRow[]> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, rows]) => Array.isArray(rows))
      .map(([verse, rows]) => [
        verse,
        (rows as unknown[]).map((row) => normalizeVerseLiteralRow(row)),
      ]),
  )
}

function normalizeManifestBook(value: unknown): ManifestBook {
  const book = asRecord(value, 'manifest book')
  const chapters = Array.isArray(book.chapters)
    ? book.chapters.map((chapter) => {
        const entry = asRecord(chapter, 'manifest chapter')
        return {
          chapter: requireNumber(entry.chapter, 'manifest chapter.chapter'),
          title: readString(entry.title),
          file: requireString(entry.file, 'manifest chapter.file'),
          stats: normalizeStats(entry.stats, {
            totalNodes: 0,
            clauseTypes: {},
            textTypes: {},
          }),
        }
      })
    : []

  return {
    code: requireString(book.code, 'manifest book.code'),
    name: requireString(book.name, 'manifest book.name'),
    label: requireString(book.label, 'manifest book.label'),
    testament: readString(book.testament) === 'NT' ? 'NT' : 'OT',
    chapterCount: readNumber(book.chapterCount),
    status:
      readString(book.status) === 'available' || chapters.length > 0
        ? 'available'
        : 'planned',
    features: {
      koreanLiteral: readBoolean(
        isRecord(book.features) ? book.features.koreanLiteral : undefined,
      ),
    },
    chapters,
  }
}

export function normalizeManifest(raw: unknown): Manifest {
  const manifest = asRecord(raw, 'manifest')
  if (!Array.isArray(manifest.books)) {
    throw new Error('manifest.books must be an array')
  }

  return {
    generatedAt: readString(manifest.generatedAt),
    productName: readString(manifest.productName, 'CTT Explorer'),
    books: manifest.books.map((book) => normalizeManifestBook(book)),
    bhsaEnrichment: readBoolean(manifest.bhsaEnrichment),
    attribution: isRecord(manifest.attribution)
      ? {
          ctt: readString(manifest.attribution.ctt, DEFAULT_ATTRIBUTION.ctt),
          bhsa: readString(manifest.attribution.bhsa, DEFAULT_ATTRIBUTION.bhsa),
          textFabric: readString(
            manifest.attribution.textFabric,
            DEFAULT_ATTRIBUTION.textFabric,
          ),
          literal: readString(
            manifest.attribution.literal,
            DEFAULT_ATTRIBUTION.literal,
          ),
          licenseNote: readString(
            manifest.attribution.licenseNote,
            DEFAULT_ATTRIBUTION.licenseNote,
          ),
        }
      : DEFAULT_ATTRIBUTION,
  }
}

export function normalizeChapterData(raw: unknown): ChapterData {
  const chapter = asRecord(raw, 'chapter data')
  const root = normalizeNode(chapter.root, null, -1, [], 0)
  const fallbackStats = deriveStats(root)

  return {
    book: requireString(chapter.book, 'chapter data.book'),
    bookName: readString(chapter.bookName),
    bookLabel: readString(chapter.bookLabel),
    chapter: requireNumber(chapter.chapter, 'chapter data.chapter'),
    title: readString(chapter.title),
    root,
    stats: normalizeStats(chapter.stats, fallbackStats),
    verseMap: normalizeVerseMap(chapter.verseMap),
    unmatchedLiteralByVerse: normalizeUnmatchedLiteralByVerse(
      chapter.unmatchedLiteralByVerse,
    ),
    literalCoverage: normalizeLiteralCoverage(chapter.literalCoverage),
  }
}

function makeLoadError(
  summary: AppErrorSummary,
  cause?: unknown,
): AppLoadError {
  const error = new AppLoadError(summary, cause instanceof Error ? { cause } : undefined)
  console.error('[CTT Explorer]', summary.code, {
    ...summary,
    cause,
  })
  return error
}

export function createRuntimeError(
  code: Extract<AppLoadErrorCode, 'runtime-error' | 'unhandled-rejection'>,
  cause: unknown,
): AppLoadError {
  return makeLoadError(
    {
      code,
      stage: 'error',
      message:
        code === 'runtime-error'
          ? '브라우저 런타임 오류가 발생했습니다.'
          : '처리되지 않은 비동기 오류가 발생했습니다.',
      details:
        cause instanceof Error
          ? { name: cause.name, message: cause.message }
          : { value: String(cause) },
    },
    cause,
  )
}

async function fetchJson(url: string, stage: LoadStage, resource: 'manifest' | 'chapter') {
  let response: Response
  try {
    response = await fetch(url)
  } catch (cause) {
    throw makeLoadError(
      {
        code: `${resource}-fetch-failed`,
        stage,
        url,
        message: `${resource} 요청에 실패했습니다.`,
      } as AppErrorSummary,
      cause,
    )
  }

  if (!response.ok) {
    throw makeLoadError({
      code: `${resource}-http-failed` as AppLoadErrorCode,
      stage,
      url,
      message: `${resource} 응답이 실패했습니다.`,
      details: { status: response.status, statusText: response.statusText },
    })
  }

  try {
    return (await response.json()) as unknown
  } catch (cause) {
    throw makeLoadError(
      {
        code: `${resource}-json-invalid`,
        stage,
        url,
        message: `${resource} JSON 파싱에 실패했습니다.`,
      } as AppErrorSummary,
      cause,
    )
  }
}

export async function loadManifest(url: string): Promise<Manifest> {
  const raw = await fetchJson(url, 'manifest-loading', 'manifest')
  try {
    return normalizeManifest(raw)
  } catch (cause) {
    throw makeLoadError(
      {
        code: 'manifest-normalize-failed',
        stage: 'manifest-loading',
        url,
        message: 'manifest 정규화에 실패했습니다.',
      },
      cause,
    )
  }
}

export async function loadChapterData(url: string): Promise<ChapterData> {
  const raw = await fetchJson(url, 'chapter-loading', 'chapter')
  try {
    return normalizeChapterData(raw)
  } catch (cause) {
    throw makeLoadError(
      {
        code: 'chapter-normalize-failed',
        stage: 'chapter-loading',
        url,
        message: 'chapter 데이터 정규화에 실패했습니다.',
      },
      cause,
    )
  }
}

export function createNoAvailableBooksError(manifestUrl?: string): AppLoadError {
  return makeLoadError({
    code: 'no-available-books',
    stage: 'error',
    url: manifestUrl,
    message: '현재 표시할 수 있는 책 데이터가 없습니다.',
  })
}

export function updateBootDiagnostics(
  patch: Partial<BootDiagnostics>,
): BootDiagnostics {
  const previous: BootDiagnostics = window.__CTT_BOOT__ ?? {
    buildId: BUILD_ID,
    state: 'manifest-loading',
    error: null,
    updatedAt: new Date().toISOString(),
  }

  const next: BootDiagnostics = Object.freeze({
    ...previous,
    ...patch,
    buildId: BUILD_ID,
    updatedAt: new Date().toISOString(),
  })
  window.__CTT_BOOT__ = next
  return next
}
