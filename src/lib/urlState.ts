import type { ViewMode, ViewState } from './types'

const DEFAULT_STATE: ViewState = {
  book: 'DAN',
  chapter: 1,
  view: 'tree',
  node: null,
  hebrew: false,
  gloss: false,
  literal: false,
  filters: [],
}

function safeView(value: string | null): ViewMode {
  return value === 'list' ? 'list' : 'tree'
}

export function readViewState(search: string): ViewState {
  const params = new URLSearchParams(search)
  const chapter = Number(params.get('chapter') ?? DEFAULT_STATE.chapter)
  return {
    book: params.get('book') || DEFAULT_STATE.book,
    chapter: Number.isFinite(chapter) && chapter > 0 ? chapter : DEFAULT_STATE.chapter,
    view: safeView(params.get('view')),
    node: params.get('node'),
    hebrew: params.get('hebrew') === '1',
    gloss: params.get('gloss') === '1',
    literal: params.get('literal') === '1',
    filters: (params.get('filters') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  }
}

export function writeViewState(state: ViewState): string {
  const params = new URLSearchParams()
  params.set('book', state.book)
  params.set('chapter', String(state.chapter))
  params.set('view', state.view)
  if (state.node) params.set('node', state.node)
  if (state.hebrew) params.set('hebrew', '1')
  if (state.gloss) params.set('gloss', '1')
  if (state.literal) params.set('literal', '1')
  if (state.filters.length) params.set('filters', state.filters.join(','))
  return `?${params.toString()}`
}
