import { startTransition, useEffect, useMemo, useState } from 'react'

import type {
  ChapterData,
  ClauseNode,
  Manifest,
  ManifestBook,
  ViewState,
} from './lib/types'
import {
  buildVerseKey,
  collectNodeIndex,
  countDescendants,
  flattenVisibleNodes,
  formatVerseLabel,
  getPrimaryTextType,
} from './lib/ctt'
import { readViewState, writeViewState } from './lib/urlState'

function dataUrl(path: string) {
  return new URL(path, window.location.href).toString()
}

function nodeLabel(node: ClauseNode, showHebrew: boolean) {
  return showHebrew && node.surfaceHebrew ? node.surfaceHebrew : node.surface
}

function textTypeTone(node: ClauseNode) {
  return getPrimaryTextType(node.textType)
}

function NodeContent({
  node,
  selected,
  showHebrew,
  showGloss,
  highlighted,
  collapsed,
  onSelect,
  onToggleCollapse,
}: {
  node: ClauseNode
  selected: boolean
  showHebrew: boolean
  showGloss: boolean
  highlighted: boolean
  collapsed: boolean
  onSelect: (nodeId: string) => void
  onToggleCollapse: (nodeId: string) => void
}) {
  const tone = textTypeTone(node)
  return (
    <article
      className={[
        'node-card',
        selected ? 'is-selected' : '',
        highlighted ? '' : 'is-muted',
        node.isDirectSpeech ? 'is-quote' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-node-id={node.id}
    >
      <div className="node-actions">
        {node.children.length > 0 ? (
          <button
            type="button"
            className="collapse-toggle"
            aria-label={collapsed ? '하위 절 펼치기' : '하위 절 접기'}
            onClick={() => onToggleCollapse(node.id)}
          >
            {collapsed ? '+' : '−'}
          </button>
        ) : (
          <span className="collapse-spacer" />
        )}
        <button
          type="button"
          className="node-select"
          onClick={() => onSelect(node.id)}
        >
          <span className="node-leading">
            <strong>{formatVerseLabel(node.verse)}</strong>
            <span className="node-ctype">{node.ctype}</span>
          </span>
          <span className="node-copy" lang={showHebrew ? 'he' : 'en'}>
            {nodeLabel(node, showHebrew)}
          </span>
          {showGloss && node.gloss ? (
            <span className="node-gloss">{node.gloss}</span>
          ) : null}
        </button>
      </div>
      <div className="node-badges">
        <span className={`pill tone-${tone}`}>{node.textType || '?'}</span>
        {node.functions.length > 0 ? (
          <span className="pill pill-soft">{node.functions.join(' · ')}</span>
        ) : null}
        {node.quotationDepth > 0 ? (
          <span className="pill pill-quote">Speech {node.quotationDepth}</span>
        ) : null}
      </div>
    </article>
  )
}

function TreeBranch({
  node,
  selectedId,
  showHebrew,
  showGloss,
  activeTypes,
  collapsedIds,
  onSelect,
  onToggleCollapse,
}: {
  node: ClauseNode
  selectedId: string | null
  showHebrew: boolean
  showGloss: boolean
  activeTypes: Set<string>
  collapsedIds: Set<string>
  onSelect: (nodeId: string) => void
  onToggleCollapse: (nodeId: string) => void
}) {
  const collapsed = collapsedIds.has(node.id)
  const highlighted = activeTypes.size === 0 || activeTypes.has(node.ctype)
  return (
    <li className="tree-item">
      <NodeContent
        node={node}
        selected={selectedId === node.id}
        showHebrew={showHebrew}
        showGloss={showGloss}
        highlighted={highlighted}
        collapsed={collapsed}
        onSelect={onSelect}
        onToggleCollapse={onToggleCollapse}
      />
      {node.children.length > 0 && !collapsed ? (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              selectedId={selectedId}
              showHebrew={showHebrew}
              showGloss={showGloss}
              activeTypes={activeTypes}
              collapsedIds={collapsedIds}
              onSelect={onSelect}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function bookOptionLabel(book: ManifestBook) {
  return book.status === 'available' ? book.label : `${book.label} · 준비 중`
}

function App() {
  const initial = useMemo(() => readViewState(window.location.search), [])
  const [viewState, setViewState] = useState<ViewState>(initial)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [chapterData, setChapterData] = useState<ChapterData | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [verseJump, setVerseJump] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadManifest() {
      try {
        const response = await fetch(dataUrl('./data/manifest.json'))
        if (!response.ok) throw new Error('manifest load failed')
        const data = (await response.json()) as Manifest
        if (!cancelled) {
          setManifest(data)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : 'manifest load failed',
          )
          setLoading(false)
        }
      }
    }

    void loadManifest()
    return () => {
      cancelled = true
    }
  }, [])

  const availableBooks = useMemo(
    () => manifest?.books.filter((book) => book.status === 'available') ?? [],
    [manifest],
  )

  const activeBook = useMemo(() => {
    if (!manifest) return null
    const selected = manifest.books.find((book) => book.code === viewState.book)
    if (selected?.status === 'available') return selected
    return availableBooks[0] ?? null
  }, [manifest, availableBooks, viewState.book])

  const booksByTestament = useMemo(
    () => ({
      OT: manifest?.books.filter((book) => book.testament === 'OT') ?? [],
      NT: manifest?.books.filter((book) => book.testament === 'NT') ?? [],
    }),
    [manifest],
  )

  useEffect(() => {
    if (!activeBook) return
    const nextChapter =
      activeBook.chapters.find((item) => item.chapter === viewState.chapter)
        ?.chapter ??
      activeBook.chapters[0]?.chapter ??
      1
    if (viewState.book === activeBook.code && viewState.chapter === nextChapter) {
      return
    }
    setViewState((current) => {
      if (
        current.book === activeBook.code &&
        current.chapter === nextChapter
      ) {
        return current
      }
      return {
        ...current,
        book: activeBook.code,
        chapter: nextChapter,
        node: null,
      }
    })
  }, [activeBook, viewState.book, viewState.chapter])

  useEffect(() => {
    if (!activeBook) {
      setChapterData(null)
      setLoading(false)
      return
    }
    const chapterMeta =
      activeBook.chapters.find((item) => item.chapter === viewState.chapter) ??
      activeBook.chapters[0]
    if (!chapterMeta) {
      setChapterData(null)
      setLoading(false)
      setError('선택한 책의 장 데이터가 아직 준비되지 않았습니다.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    async function loadChapter() {
      try {
        const response = await fetch(dataUrl(`./data/${chapterMeta.file}`))
        if (!response.ok) throw new Error('chapter load failed')
        const data = (await response.json()) as ChapterData
        if (cancelled) return
        startTransition(() => {
          const nextIndex = collectNodeIndex(data.root)
          setChapterData(data)
          setCollapsedIds(new Set())
          setViewState((current) => {
            const nextNode =
              (current.node && nextIndex.get(current.node)?.id) ||
              data.root.children[0]?.id ||
              null
            return {
              ...current,
              book: activeBook.code,
              chapter: data.chapter,
              node: nextNode,
            }
          })
          setLoading(false)
        })
      } catch (cause) {
        if (!cancelled) {
          setLoading(false)
          setError(
            cause instanceof Error ? cause.message : 'chapter load failed',
          )
        }
      }
    }

    void loadChapter()
    return () => {
      cancelled = true
    }
  }, [activeBook, viewState.chapter])

  const nodeIndex = useMemo<Map<string, ClauseNode>>(
    () => (chapterData ? collectNodeIndex(chapterData.root) : new Map()),
    [chapterData],
  )

  const selectedNode = viewState.node
    ? (nodeIndex.get(viewState.node) ?? null)
    : null

  const flatNodes = useMemo(
    () =>
      chapterData
        ? flattenVisibleNodes(chapterData.root, collapsedIds)
        : [],
    [chapterData, collapsedIds],
  )

  useEffect(() => {
    const search = writeViewState(viewState)
    window.history.replaceState({}, '', `${window.location.pathname}${search}`)
  }, [viewState])

  useEffect(() => {
    if (!viewState.node) return
    const target = document.querySelector<HTMLElement>(
      `[data-node-id="${viewState.node}"]`,
    )
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [viewState.node, viewState.view, chapterData])

  const chapterStats = chapterData?.stats
  const topClauseTypes = Object.entries(chapterStats?.clauseTypes ?? {}).slice(
    0,
    10,
  )
  const activeTypes = new Set(viewState.filters)
  const currentChapters = activeBook?.chapters ?? []
  const availableBookLabels = availableBooks.map((book) => book.label).join(', ')

  function updateState(patch: Partial<ViewState>) {
    setViewState((current) => ({ ...current, ...patch }))
  }

  function handleBookChange(bookCode: string) {
    const book = manifest?.books.find((item) => item.code === bookCode)
    if (!book || book.status !== 'available') return
    updateState({
      book: book.code,
      chapter: book.chapters[0]?.chapter ?? 1,
      node: null,
    })
  }

  function toggleFilter(ctype: string) {
    const filters = new Set(viewState.filters)
    if (filters.has(ctype)) filters.delete(ctype)
    else filters.add(ctype)
    updateState({ filters: [...filters], node: viewState.node })
  }

  function toggleCollapse(nodeId: string) {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  function handleVerseJump() {
    if (!chapterData) return
    const verse = Number(verseJump)
    if (!Number.isFinite(verse) || verse < 1) return
    const key = buildVerseKey(chapterData.book, chapterData.chapter, verse)
    const match = chapterData.verseMap[key]?.[0]
    if (match) updateState({ node: match })
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <header className="hero-header">
        <div>
          <p className="eyebrow">{manifest?.productName ?? 'CTT Explorer'}</p>
          <h1>성경 전체 CTT 구조를 읽고 분석하기 위한 탐색기</h1>
          <p className="hero-copy">
            ETCBC CTT를 장 단위 JSON으로 정규화하고, 브라우저에서 바로 절 구조를
            탐색하도록 구성했습니다. 현재 공개 빌드는 다니엘서 데이터만 포함하지만,
            manifest와 UI는 성경 전체 확장을 전제로 설계했습니다.
          </p>
        </div>
        <div className="hero-meta">
          <span className="meta-chip">
            {manifest?.bhsaEnrichment ? 'BHSA Enriched' : 'CTT Fallback'}
          </span>
          <span className="meta-chip">
            {availableBooks.length} / {manifest?.books.length ?? 0} books live
          </span>
          <span className="meta-chip">
            현재 제공: {activeBook?.label ?? '다니엘'}
          </span>
        </div>
      </header>

      <section className="control-panel">
        <label className="field">
          <span>책</span>
          <select
            value={activeBook?.code ?? ''}
            onChange={(event) => handleBookChange(event.target.value)}
          >
            <optgroup label="구약">
              {booksByTestament.OT.map((book) => (
                <option
                  key={book.code}
                  value={book.code}
                  disabled={book.status !== 'available'}
                >
                  {bookOptionLabel(book)}
                </option>
              ))}
            </optgroup>
            <optgroup label="신약">
              {booksByTestament.NT.map((book) => (
                <option
                  key={book.code}
                  value={book.code}
                  disabled={book.status !== 'available'}
                >
                  {bookOptionLabel(book)}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="field">
          <span>장</span>
          <select
            value={viewState.chapter}
            onChange={(event) =>
              updateState({
                chapter: Number(event.target.value),
                node: null,
              })
            }
          >
            {currentChapters.map((chapter) => (
              <option key={chapter.chapter} value={chapter.chapter}>
                {chapter.chapter}장
              </option>
            ))}
          </select>
        </label>

        <div className="segmented">
          <button
            type="button"
            aria-pressed={viewState.view === 'tree'}
            onClick={() => updateState({ view: 'tree' })}
          >
            Tree
          </button>
          <button
            type="button"
            aria-pressed={viewState.view === 'list'}
            onClick={() => updateState({ view: 'list' })}
          >
            List
          </button>
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={viewState.hebrew}
            onChange={(event) =>
              updateState({ hebrew: event.target.checked })
            }
          />
          <span>히브리어 보기</span>
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={viewState.gloss}
            onChange={(event) => updateState({ gloss: event.target.checked })}
          />
          <span>Gloss 보기</span>
        </label>

        <div className="jump-group">
          <label className="field compact">
            <span>Verse Jump</span>
            <input
              inputMode="numeric"
              placeholder="예: 4"
              value={verseJump}
              onChange={(event) => setVerseJump(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleVerseJump()
              }}
            />
          </label>
          <button type="button" className="jump-button" onClick={handleVerseJump}>
            이동
          </button>
        </div>

        <p className="control-note">
          전체 성경 {manifest?.books.length ?? 0}권 목록을 표시하며, 현재 배포본은{' '}
          {availableBookLabels || '지원 책 없음'}만 활성화되어 있습니다.
        </p>
      </section>

      <section className="chip-panel">
        <div>
          <p className="section-label">Clause Type Highlight</p>
          <div className="chip-row">
            {topClauseTypes.map(([ctype, count]) => {
              const active = activeTypes.has(ctype)
              return (
                <button
                  key={ctype}
                  type="button"
                  className={active ? 'chip active' : 'chip'}
                  onClick={() => toggleFilter(ctype)}
                >
                  {ctype} <span>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="stat-strip">
          <div>
            <strong>{chapterStats?.totalNodes ?? 0}</strong>
            <span>절 노드</span>
          </div>
          <div>
            <strong>{Object.keys(chapterStats?.clauseTypes ?? {}).length}</strong>
            <span>유형 수</span>
          </div>
          <div>
            <strong>{Object.keys(chapterData?.verseMap ?? {}).length}</strong>
            <span>절 수</span>
          </div>
        </div>
      </section>

      <main className="main-grid">
        <section className="viewer-panel">
          {loading ? <p className="status">장 데이터를 불러오는 중입니다…</p> : null}
          {error ? <p className="status error">{error}</p> : null}

          {!loading && !error && chapterData ? (
            viewState.view === 'tree' ? (
              <ul className="tree-root">
                {chapterData.root.children.map((node) => (
                  <TreeBranch
                    key={node.id}
                    node={node}
                    selectedId={viewState.node}
                    showHebrew={viewState.hebrew}
                    showGloss={viewState.gloss}
                    activeTypes={activeTypes}
                    collapsedIds={collapsedIds}
                    onSelect={(nodeId) => updateState({ node: nodeId })}
                    onToggleCollapse={toggleCollapse}
                  />
                ))}
              </ul>
            ) : (
              <div className="list-view">
                {flatNodes.map(({ node, depth }) => {
                  const highlighted =
                    activeTypes.size === 0 || activeTypes.has(node.ctype)
                  return (
                    <div
                      key={node.id}
                      className={[
                        'list-row',
                        viewState.node === node.id ? 'is-selected' : '',
                        highlighted ? '' : 'is-muted',
                        node.isDirectSpeech ? 'is-quote' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-node-id={node.id}
                      style={{ ['--depth' as string]: depth }}
                    >
                      <button
                        type="button"
                        className="list-button"
                        onClick={() => updateState({ node: node.id })}
                      >
                        <span className="depth-rail" />
                        <span className="list-meta">
                          <strong>{formatVerseLabel(node.verse)}</strong>
                          <small>{node.ctype}</small>
                        </span>
                        <span
                          className="list-copy"
                          lang={viewState.hebrew ? 'he' : 'en'}
                        >
                          {nodeLabel(node, viewState.hebrew)}
                        </span>
                        {viewState.gloss && node.gloss ? (
                          <span className="list-gloss">{node.gloss}</span>
                        ) : null}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          ) : null}
        </section>

        <aside className="detail-panel">
          <div className="detail-section">
            <h2>절 상세</h2>
            {selectedNode ? (
              <>
                <div className="detail-hero">
                  <span className={`pill tone-${textTypeTone(selectedNode)}`}>
                    {selectedNode.textType || '?'}
                  </span>
                  <strong>{selectedNode.ctype}</strong>
                  <span>{selectedNode.verse}</span>
                </div>
                <p className="detail-copy" lang={viewState.hebrew ? 'he' : 'en'}>
                  {nodeLabel(selectedNode, viewState.hebrew)}
                </p>
                {selectedNode.gloss ? (
                  <p className="detail-gloss">{selectedNode.gloss}</p>
                ) : null}
                <dl className="detail-grid">
                  <div>
                    <dt>Mother</dt>
                    <dd>{selectedNode.mother || '—'}</dd>
                  </div>
                  <div>
                    <dt>PN</dt>
                    <dd>{selectedNode.pn || '—'}</dd>
                  </div>
                  <div>
                    <dt>Paragraph</dt>
                    <dd>{selectedNode.paragraph || '—'}</dd>
                  </div>
                  <div>
                    <dt>Atom</dt>
                    <dd>{selectedNode.atomNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>Subtype</dt>
                    <dd>{selectedNode.subtype || '—'}</dd>
                  </div>
                  <div>
                    <dt>Descendants</dt>
                    <dd>{countDescendants(selectedNode)}</dd>
                  </div>
                </dl>
                <div className="detail-tags">
                  {selectedNode.functions.map((value) => (
                    <span key={value} className="chip active">
                      {value}
                    </span>
                  ))}
                </div>
                <pre className="hierarchy-preview">{selectedNode.hierarchy}</pre>
              </>
            ) : (
              <p className="detail-empty">절을 선택하면 세부 정보가 표시됩니다.</p>
            )}
          </div>

          <div className="detail-section">
            <h2>장 통계</h2>
            <ul className="stat-list">
              {topClauseTypes.map(([ctype, count]) => (
                <li key={ctype}>
                  <span>{ctype}</span>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="detail-section">
            <h2>지원 현황</h2>
            <ul className="source-list">
              <li>
                <span>현재 활성 책</span>
                <strong>{activeBook?.label ?? '—'}</strong>
              </li>
              <li>
                <span>활성 책 수</span>
                <strong>
                  {availableBooks.length} / {manifest?.books.length ?? 0}
                </strong>
              </li>
              <li>
                <span>현재 데이터 범위</span>
                <strong>
                  {activeBook
                    ? `${activeBook.label} ${currentChapters.length}장`
                    : '—'}
                </strong>
              </li>
            </ul>
          </div>

          <div className="detail-section">
            <h2>출처</h2>
            <p className="source-note">{manifest?.attribution.licenseNote}</p>
            <ul className="source-list">
              <li>CTT: {manifest?.attribution.ctt}</li>
              <li>BHSA: {manifest?.attribution.bhsa}</li>
              <li>Processing: {manifest?.attribution.textFabric}</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
