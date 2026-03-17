import { startTransition, useEffect, useMemo, useState } from 'react'

import { AppErrorBoundary } from './ErrorBoundary'
import {
  AppLoadError,
  createNoAvailableBooksError,
  loadChapterData,
  loadManifest,
  updateBootDiagnostics,
} from './lib/loaders'
import type {
  BootState,
  ChapterData,
  ClauseNode,
  Manifest,
  ManifestBook,
  ViewState,
} from './lib/types'
import {
  buildRelationSets,
  buildVerseKey,
  collectClauseTypes,
  collectNodeIndex,
  flattenVisibleNodes,
  formatVerseLabel,
  getPathNodes,
  getPrimaryTextType,
  getSiblingNodes,
  type RelationSets,
} from './lib/ctt'
import { readViewState, writeViewState } from './lib/urlState'

function dataUrl(path: string) {
  return new URL(path, window.location.href).toString()
}

function nodeLabel(node: ClauseNode, showHebrew: boolean) {
  return showHebrew && node.surfaceHebrew ? node.surfaceHebrew : node.surface
}

function literalMatchRuleLabel(rule: string | undefined) {
  switch (rule) {
    case 'ctype+mother+he':
      return 'ctype + 어미절 + 히브리어'
    case 'ctype+he':
      return 'ctype + 히브리어'
    case 'ctype+mother':
      return 'ctype + 어미절'
    case 'ctype':
      return 'ctype'
    default:
      return '보수적 매칭'
  }
}

function textTypeTone(node: ClauseNode) {
  return getPrimaryTextType(node.textType)
}

function nodeRelationClass(
  node: ClauseNode,
  selectedId: string | null,
  relations: RelationSets,
) {
  if (selectedId === node.id) return 'is-selected'
  if (relations.ancestorIds.has(node.id)) return 'is-ancestor'
  if (relations.daughterIds.has(node.id)) return 'is-daughter'
  if (relations.siblingIds.has(node.id)) return 'is-sibling'
  return ''
}

function scrollNodeIntoView(nodeId: string | null) {
  if (!nodeId) return
  const target = document.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`)
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

function SkeletonLine({
  width,
  className = '',
}: {
  width?: string
  className?: string
}) {
  return (
    <span
      className={['skeleton-line', className].filter(Boolean).join(' ')}
      style={width ? { width } : undefined}
    />
  )
}

function HeroMetaSkeleton() {
  return (
    <div className="hero-meta">
      <span className="meta-chip skeleton-chip" />
      <span className="meta-chip skeleton-chip" />
      <span className="meta-chip skeleton-chip" />
    </div>
  )
}

function ControlPanelSkeleton() {
  return (
    <section className="control-panel control-panel-loading">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="field field-skeleton">
          <SkeletonLine width="3.5rem" />
          <SkeletonLine className="skeleton-input" />
        </div>
      ))}
      <SkeletonLine className="skeleton-note" />
    </section>
  )
}

function StatPanelSkeleton() {
  return (
    <section className="chip-panel">
      <div>
        <p className="section-label">Clause Type Highlight</p>
        <div className="chip-row">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="chip skeleton-chip-inline" />
          ))}
        </div>
      </div>
      <div className="stat-strip">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index}>
            <SkeletonLine width="3rem" />
            <SkeletonLine width="4.5rem" />
          </div>
        ))}
      </div>
    </section>
  )
}

function ViewerSkeleton() {
  return (
    <div className="viewer-skeleton">
      {Array.from({ length: 5 }, (_, index) => (
        <article key={index} className="node-card skeleton-card">
          <div className="node-actions">
            <span className="collapse-spacer skeleton-circle" />
            <div className="node-select">
              <SkeletonLine width="7rem" />
              <SkeletonLine />
              <SkeletonLine width="80%" />
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="detail-section">
          <SkeletonLine width="7rem" />
          <SkeletonLine className="skeleton-block" />
          <SkeletonLine className="skeleton-block short" />
        </div>
      ))}
    </>
  )
}

function RelationButton({
  node,
  showHebrew,
  onSelect,
}: {
  node: ClauseNode
  showHebrew: boolean
  onSelect: (nodeId: string) => void
}) {
  return (
    <button
      type="button"
      className="relation-button"
      onClick={() => onSelect(node.id)}
    >
      <span className="relation-meta">
        <strong>{formatVerseLabel(node.verse)}</strong>
        <small>{node.ctype}</small>
      </span>
      <span className="relation-copy" lang={showHebrew ? 'he' : 'en'}>
        {nodeLabel(node, showHebrew)}
      </span>
    </button>
  )
}

function NodeContent({
  node,
  selected,
  showHebrew,
  showGloss,
  showLiteral,
  highlighted,
  collapsed,
  relationClass,
  onSelect,
  onToggleCollapse,
}: {
  node: ClauseNode
  selected: boolean
  showHebrew: boolean
  showGloss: boolean
  showLiteral: boolean
  highlighted: boolean
  collapsed: boolean
  relationClass: string
  onSelect: (nodeId: string) => void
  onToggleCollapse: (nodeId: string) => void
}) {
  const tone = textTypeTone(node)
  return (
    <article
      className={[
        'node-card',
        relationClass,
        highlighted ? '' : 'is-muted',
        node.isDirectSpeech ? 'is-quote' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-node-id={node.id}
      style={{ ['--node-depth' as string]: Math.max(node.depth, 0) }}
    >
      <div className="node-actions">
        {node.hasChildren ? (
          <button
            type="button"
            className="collapse-toggle"
            aria-label={collapsed ? '하위 딸절 펼치기' : '하위 딸절 접기'}
            onClick={() => onToggleCollapse(node.id)}
          >
            {collapsed ? '+' : '-'}
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
          {showLiteral && node.koreanLiteral ? (
            <span className="node-literal">{node.koreanLiteral}</span>
          ) : null}
          {showGloss && node.gloss ? (
            <span className="node-gloss">{node.gloss}</span>
          ) : null}
          <span className="node-structure">
            <span>깊이 {node.depth}</span>
            <span>딸절 {node.children.length}</span>
            <span>후손 {node.descendantCount}</span>
          </span>
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
        {selected ? <span className="pill pill-focus">현재 절</span> : null}
        {!selected && relationClass === 'is-ancestor' ? (
          <span className="pill pill-lineage">어미절 체인</span>
        ) : null}
        {!selected && relationClass === 'is-daughter' ? (
          <span className="pill pill-branch">직접 딸절</span>
        ) : null}
        {!selected && relationClass === 'is-sibling' ? (
          <span className="pill pill-soft">자매절</span>
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
  showLiteral,
  activeTypes,
  collapsedIds,
  visibleIds,
  relations,
  onSelect,
  onToggleCollapse,
}: {
  node: ClauseNode
  selectedId: string | null
  showHebrew: boolean
  showGloss: boolean
  showLiteral: boolean
  activeTypes: Set<string>
  collapsedIds: Set<string>
  visibleIds?: Set<string>
  relations: RelationSets
  onSelect: (nodeId: string) => void
  onToggleCollapse: (nodeId: string) => void
}) {
  if (visibleIds && !visibleIds.has(node.id)) {
    return null
  }

  const collapsed = collapsedIds.has(node.id)
  const highlighted = activeTypes.size === 0 || activeTypes.has(node.ctype)
  const relationClass = nodeRelationClass(node, selectedId, relations)

  return (
    <li
      className="tree-item"
      style={{ ['--node-depth' as string]: Math.max(node.depth, 0) }}
    >
      <NodeContent
        node={node}
        selected={selectedId === node.id}
        showHebrew={showHebrew}
        showGloss={showGloss}
        showLiteral={showLiteral}
        highlighted={highlighted}
        collapsed={collapsed}
        relationClass={relationClass}
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
              showLiteral={showLiteral}
              activeTypes={activeTypes}
              collapsedIds={collapsedIds}
              visibleIds={visibleIds}
              relations={relations}
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

function AppInner() {
  const initial = useMemo(() => readViewState(window.location.search), [])
  const [viewState, setViewState] = useState<ViewState>(initial)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [chapterData, setChapterData] = useState<ChapterData | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [verseJump, setVerseJump] = useState('')
  const [showAncestorsOnly, setShowAncestorsOnly] = useState(false)
  const [expandDirectDaughters, setExpandDirectDaughters] = useState(false)
  const [bootState, setBootState] = useState<BootState>('manifest-loading')
  const [fatalError, setFatalError] = useState<AppLoadError | null>(null)

  useEffect(() => {
    let cancelled = false
    const manifestUrl = dataUrl('./data/manifest.json')
    setBootState('manifest-loading')
    setManifest(null)
    setChapterData(null)
    setFatalError(null)
    updateBootDiagnostics({
      state: 'manifest-loading',
      manifestUrl,
      chapterUrl: undefined,
      error: null,
    })

    async function fetchManifest() {
      try {
        const data = await loadManifest(manifestUrl)
        if (cancelled) return
        const hasAvailableBooks = data.books.some(
          (book) => book.status === 'available' && book.chapters.length > 0,
        )
        if (!hasAvailableBooks) {
          const error = createNoAvailableBooksError(manifestUrl)
          setBootState('error')
          setFatalError(error)
          updateBootDiagnostics({
            state: 'error',
            manifestUrl,
            error: error.toSummary(),
          })
          return
        }

        setManifest(data)
        setBootState('chapter-loading')
        updateBootDiagnostics({
          state: 'chapter-loading',
          manifestUrl,
          error: null,
        })
      } catch (error) {
        if (cancelled) return
        const appError =
          error instanceof AppLoadError
            ? error
            : new AppLoadError({
                code: 'manifest-normalize-failed',
                stage: 'manifest-loading',
                url: manifestUrl,
                message: 'manifest 로드 중 예상하지 못한 오류가 발생했습니다.',
              })
        setBootState('error')
        setFatalError(appError)
        updateBootDiagnostics({
          state: 'error',
          manifestUrl,
          error: appError.toSummary(),
        })
      }
    }

    void fetchManifest()
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
    if (!activeBook) return
    const chapterMeta =
      activeBook.chapters.find((item) => item.chapter === viewState.chapter) ??
      activeBook.chapters[0]

    if (!chapterMeta) {
      const error = createNoAvailableBooksError()
      setBootState('error')
      setFatalError(error)
      updateBootDiagnostics({
        state: 'error',
        error: error.toSummary(),
      })
      return
    }

    let cancelled = false
    const chapterUrl = dataUrl(`./data/${chapterMeta.file}`)
    setBootState('chapter-loading')
    setChapterData(null)
    updateBootDiagnostics({
      state: 'chapter-loading',
      chapterUrl,
      error: null,
    })

    async function fetchChapter() {
      try {
        const data = await loadChapterData(chapterUrl)
        if (cancelled) return
        startTransition(() => {
          const nextIndex = collectNodeIndex(data.root)
          setChapterData(data)
          setCollapsedIds(new Set())
          setShowAncestorsOnly(false)
          setExpandDirectDaughters(false)
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
          setBootState('ready')
          updateBootDiagnostics({
            state: 'ready',
            chapterUrl,
            error: null,
          })
        })
      } catch (error) {
        if (cancelled) return
        const appError =
          error instanceof AppLoadError
            ? error
            : new AppLoadError({
                code: 'chapter-normalize-failed',
                stage: 'chapter-loading',
                url: chapterUrl,
                message: 'chapter 로드 중 예상하지 못한 오류가 발생했습니다.',
              })
        setBootState('error')
        setFatalError(appError)
        updateBootDiagnostics({
          state: 'error',
          chapterUrl,
          error: appError.toSummary(),
        })
      }
    }

    void fetchChapter()
    return () => {
      cancelled = true
    }
  }, [activeBook, viewState.chapter])

  useEffect(() => {
    updateBootDiagnostics({ state: bootState })
  }, [bootState])

  if (fatalError) {
    throw fatalError
  }

  const nodeIndex = useMemo<Map<string, ClauseNode>>(
    () => (chapterData ? collectNodeIndex(chapterData.root) : new Map()),
    [chapterData],
  )

  const selectedNode = viewState.node
    ? (nodeIndex.get(viewState.node) ?? null)
    : null

  const selectedPathNodes = useMemo(
    () => (selectedNode ? getPathNodes(selectedNode, nodeIndex) : []),
    [selectedNode, nodeIndex],
  )

  const ancestorNodes = useMemo(
    () =>
      selectedPathNodes.filter(
        (node) => node.ctype !== 'ROOT' && node.id !== selectedNode?.id,
      ),
    [selectedPathNodes, selectedNode],
  )

  const siblingNodes = useMemo(
    () => (selectedNode ? getSiblingNodes(selectedNode, nodeIndex) : []),
    [selectedNode, nodeIndex],
  )

  const daughterNodes = selectedNode?.children ?? []

  const subtreeClauseTypes = useMemo(
    () => (selectedNode ? collectClauseTypes(selectedNode).slice(0, 6) : []),
    [selectedNode],
  )

  const chapterNodes = useMemo(
    () => Array.from(nodeIndex.values()).filter((node) => node.ctype !== 'ROOT'),
    [nodeIndex],
  )

  const chapterMaxDepth = useMemo(
    () => chapterNodes.reduce((max, node) => Math.max(max, node.depth), 0),
    [chapterNodes],
  )

  const relations = useMemo(
    () => buildRelationSets(selectedNode, nodeIndex),
    [selectedNode, nodeIndex],
  )

  const visibleIds = useMemo(() => {
    if (!selectedNode || !showAncestorsOnly) return undefined
    return new Set(selectedNode.path)
  }, [selectedNode, showAncestorsOnly])

  const effectiveCollapsedIds = useMemo(() => {
    const next = new Set(collapsedIds)
    if (selectedNode) {
      selectedNode.path.forEach((nodeId) => next.delete(nodeId))
      if (expandDirectDaughters) {
        next.delete(selectedNode.id)
        selectedNode.children.forEach((child) => {
          if (child.children.length > 0) {
            next.add(child.id)
          }
        })
      }
    }
    return next
  }, [collapsedIds, selectedNode, expandDirectDaughters])

  const flatNodes = useMemo(
    () =>
      chapterData
        ? flattenVisibleNodes(
            chapterData.root,
            effectiveCollapsedIds,
            false,
            visibleIds,
          )
        : [],
    [chapterData, effectiveCollapsedIds, visibleIds],
  )

  useEffect(() => {
    const search = writeViewState(viewState)
    window.history.replaceState({}, '', `${window.location.pathname}${search}`)
  }, [viewState])

  useEffect(() => {
    if (bootState === 'ready') {
      scrollNodeIntoView(viewState.node)
    }
  }, [viewState.node, viewState.view, chapterData, bootState])

  const chapterStats = chapterData?.stats
  const topClauseTypes = Object.entries(chapterStats?.clauseTypes ?? {}).slice(0, 10)
  const activeTypes = new Set(viewState.filters)
  const currentChapters = activeBook?.chapters ?? []
  const availableBookLabels = availableBooks.map((book) => book.label).join(', ')
  const parentNode =
    selectedNode?.parentId ? nodeIndex.get(selectedNode.parentId) ?? null : null
  const literalEnabled = Boolean(activeBook?.features.koreanLiteral)
  const showLiteral = literalEnabled && viewState.literal
  const selectedVerseUnmatchedLiterals =
    selectedNode && chapterData
      ? chapterData.unmatchedLiteralByVerse[selectedNode.verse] ?? []
      : []

  useEffect(() => {
    if (!literalEnabled && viewState.literal) {
      updateState({ literal: false })
    }
  }, [literalEnabled, viewState.literal])

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

  const manifestReady = manifest !== null
  const chapterReady = chapterData !== null && bootState === 'ready'

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero-header">
        <div>
          <p className="eyebrow">{manifest?.productName ?? 'CTT Explorer'}</p>
          <h1>성경 전체 CTT 구조를 읽고 분석하기 위한 탐색기</h1>
          <p className="hero-copy">
            ETCBC CTT를 장 단위 JSON으로 정규화하고, clause atom의 어미절·딸절
            계층을 브라우저에서 바로 읽도록 구성했습니다. 초기 로딩과 배포
            갱신 중에도 빈 화면으로 끝나지 않도록 강건화했습니다.
          </p>
        </div>
        {manifestReady ? (
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
        ) : (
          <HeroMetaSkeleton />
        )}
      </header>

      {manifestReady ? (
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
              onChange={(event) => updateState({ hebrew: event.target.checked })}
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

          <label className="toggle">
            <input
              type="checkbox"
              checked={showLiteral}
              disabled={!literalEnabled}
              onChange={(event) => updateState({ literal: event.target.checked })}
            />
            <span>{literalEnabled ? '한글 직역 보기' : '한글 직역 준비 중'}</span>
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={showAncestorsOnly}
              onChange={(event) => setShowAncestorsOnly(event.target.checked)}
            />
            <span>어미절 경로만 보기</span>
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={expandDirectDaughters}
              onChange={(event) => setExpandDirectDaughters(event.target.checked)}
            />
            <span>직접 딸절만 펼치기</span>
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
      ) : (
        <ControlPanelSkeleton />
      )}

      {chapterReady ? (
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
              <strong>{chapterMaxDepth}</strong>
              <span>최대 깊이</span>
            </div>
            <div>
              <strong>{chapterData?.root.children.length ?? 0}</strong>
              <span>루트 직속 절</span>
            </div>
            <div>
              <strong>
                {chapterData?.literalCoverage.matchedRows ?? 0}/
                {chapterData?.literalCoverage.totalRows ?? 0}
              </strong>
              <span>직역 정렬</span>
            </div>
          </div>
        </section>
      ) : (
        <StatPanelSkeleton />
      )}

      <main className="main-grid">
        <section className="viewer-panel">
          {chapterReady && chapterData ? (
            viewState.view === 'tree' ? (
              <ul className="tree-root">
                {chapterData.root.children.map((node) => (
                  <TreeBranch
                    key={node.id}
                    node={node}
                    selectedId={viewState.node}
                    showHebrew={viewState.hebrew}
                    showGloss={viewState.gloss}
                    showLiteral={showLiteral}
                    activeTypes={activeTypes}
                    collapsedIds={effectiveCollapsedIds}
                    visibleIds={visibleIds}
                    relations={relations}
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
                  const relationClass = nodeRelationClass(
                    node,
                    viewState.node,
                    relations,
                  )

                  return (
                    <div
                      key={node.id}
                      className={[
                        'list-row',
                        relationClass,
                        highlighted ? '' : 'is-muted',
                        node.isDirectSpeech ? 'is-quote' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-node-id={node.id}
                      style={{
                        ['--depth' as string]: depth,
                        ['--node-depth' as string]: Math.max(node.depth, 0),
                      }}
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
                        {showLiteral && node.koreanLiteral ? (
                          <span className="list-literal">{node.koreanLiteral}</span>
                        ) : null}
                        {viewState.gloss && node.gloss ? (
                          <span className="list-gloss">{node.gloss}</span>
                        ) : null}
                        <span className="node-structure">
                          <span>깊이 {node.depth}</span>
                          <span>딸절 {node.children.length}</span>
                          <span>후손 {node.descendantCount}</span>
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <ViewerSkeleton />
          )}
        </section>

        <aside className="detail-panel">
          {chapterReady && chapterData ? (
            <>
              <div className="detail-section">
                <div className="detail-headline">
                  <h2>절 상세</h2>
                  {selectedNode ? (
                    <button
                      type="button"
                      className="inline-action"
                      onClick={() => scrollNodeIntoView(selectedNode.id)}
                    >
                      선택 노드로 스크롤
                    </button>
                  ) : null}
                </div>
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
                        <dt>어미절</dt>
                        <dd>
                          {parentNode && parentNode.ctype !== 'ROOT'
                            ? `${formatVerseLabel(parentNode.verse)} · ${parentNode.ctype}`
                            : '루트'}
                        </dd>
                      </div>
                      <div>
                        <dt>깊이</dt>
                        <dd>{selectedNode.depth}</dd>
                      </div>
                      <div>
                        <dt>직접 딸절</dt>
                        <dd>{selectedNode.children.length}</dd>
                      </div>
                      <div>
                        <dt>후손</dt>
                        <dd>{selectedNode.descendantCount}</dd>
                      </div>
                      <div>
                        <dt>PN</dt>
                        <dd>{selectedNode.pn || '-'}</dd>
                      </div>
                      <div>
                        <dt>Atom</dt>
                        <dd>{selectedNode.atomNumber || '-'}</dd>
                      </div>
                      <div>
                        <dt>Subtype</dt>
                        <dd>{selectedNode.subtype || '-'}</dd>
                      </div>
                      <div>
                        <dt>원문 mother</dt>
                        <dd>{selectedNode.mother || '-'}</dd>
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
                <h2>직역</h2>
                {!showLiteral ? (
                  <p className="detail-empty">
                    한글 직역 보기를 켜면 선택한 절의 직역과 정렬 상태가 표시됩니다.
                  </p>
                ) : selectedNode ? (
                  <>
                    {selectedNode.koreanLiteral ? (
                      <div className="literal-block">
                        <p className="detail-literal">{selectedNode.koreanLiteral}</p>
                        <dl className="detail-grid">
                          <div>
                            <dt>절 유형</dt>
                            <dd>{selectedNode.literalMeta?.clauseType || selectedNode.ctype}</dd>
                          </div>
                          <div>
                            <dt>어미절 유형</dt>
                            <dd>{selectedNode.literalMeta?.motherClauseType || '-'}</dd>
                          </div>
                          <div>
                            <dt>TAM</dt>
                            <dd>{selectedNode.literalMeta?.predictedTam || '-'}</dd>
                          </div>
                          <div>
                            <dt>어순</dt>
                            <dd>{selectedNode.literalMeta?.wordOrder || '-'}</dd>
                          </div>
                          <div>
                            <dt>매칭 규칙</dt>
                            <dd>{literalMatchRuleLabel(selectedNode.literalMeta?.matchRule)}</dd>
                          </div>
                          <div>
                            <dt>히브리어 키</dt>
                            <dd>{selectedNode.literalMeta?.hebrewText || '-'}</dd>
                          </div>
                        </dl>
                      </div>
                    ) : (
                      <p className="detail-empty">
                        선택한 절에는 확정적으로 붙인 직역이 없습니다.
                      </p>
                    )}

                    {selectedVerseUnmatchedLiterals.length > 0 ? (
                      <div className="literal-unmatched">
                        <h3>미정렬 직역</h3>
                        <div className="relation-stack">
                          {selectedVerseUnmatchedLiterals.map((row, index) => (
                            <article
                              key={`${selectedNode.id}-literal-${index}`}
                              className="literal-card"
                            >
                              <strong>{row.koreanLiteral}</strong>
                              <p>
                                {row.clauseType}
                                {row.motherClauseType
                                  ? ` · 어미절 ${row.motherClauseType}`
                                  : ''}
                                {row.predictedTam ? ` · ${row.predictedTam}` : ''}
                              </p>
                              {row.wordOrder ? (
                                <small>어순: {row.wordOrder}</small>
                              ) : null}
                              {row.hebrewText ? (
                                <small>히브리어: {row.hebrewText}</small>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="detail-empty">절을 선택하면 한글 직역이 표시됩니다.</p>
                )}
              </div>

              <div className="detail-section">
                <h2>관계 포커스</h2>
                {selectedNode ? (
                  <div className="relationship-grid">
                    <div>
                      <h3>어미절 체인</h3>
                      {ancestorNodes.length > 0 ? (
                        <div className="relation-stack">
                          {ancestorNodes.map((node) => (
                            <RelationButton
                              key={node.id}
                              node={node}
                              showHebrew={viewState.hebrew}
                              onSelect={(nodeId) => updateState({ node: nodeId })}
                            />
                          ))}
                          <RelationButton
                            node={selectedNode}
                            showHebrew={viewState.hebrew}
                            onSelect={(nodeId) => updateState({ node: nodeId })}
                          />
                        </div>
                      ) : (
                        <p className="detail-empty">현재 절이 최상위 절입니다.</p>
                      )}
                    </div>
                    <div>
                      <h3>자매절</h3>
                      {siblingNodes.length > 0 ? (
                        <div className="relation-stack">
                          {siblingNodes.map((node) => (
                            <RelationButton
                              key={node.id}
                              node={node}
                              showHebrew={viewState.hebrew}
                              onSelect={(nodeId) => updateState({ node: nodeId })}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="detail-empty">
                          같은 어미절을 공유하는 자매절이 없습니다.
                        </p>
                      )}
                    </div>
                    <div>
                      <h3>직접 딸절</h3>
                      {daughterNodes.length > 0 ? (
                        <div className="relation-stack">
                          {daughterNodes.map((node) => (
                            <RelationButton
                              key={node.id}
                              node={node}
                              showHebrew={viewState.hebrew}
                              onSelect={(nodeId) => updateState({ node: nodeId })}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="detail-empty">직접 딸절이 없습니다.</p>
                      )}
                    </div>
                    <div>
                      <h3>서브트리 요약</h3>
                      <ul className="stat-list compact">
                        <li>
                          <span>깊이</span>
                          <strong>{selectedNode.depth}</strong>
                        </li>
                        <li>
                          <span>직접 딸절</span>
                          <strong>{selectedNode.children.length}</strong>
                        </li>
                        <li>
                          <span>후손 수</span>
                          <strong>{selectedNode.descendantCount}</strong>
                        </li>
                        <li>
                          <span>경로 길이</span>
                          <strong>{Math.max(selectedNode.path.length - 1, 0)}</strong>
                        </li>
                      </ul>
                      <div className="chip-row">
                        {subtreeClauseTypes.map(([ctype, count]) => (
                          <span key={ctype} className="chip">
                            {ctype} <span>{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="detail-empty">
                    절을 선택하면 어미절과 딸절 관계가 표시됩니다.
                  </p>
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
                    <strong>{activeBook?.label ?? '-'}</strong>
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
                        : '-'}
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
                  <li>Literal: {manifest?.attribution.literal}</li>
                </ul>
              </div>
            </>
          ) : (
            <DetailSkeleton />
          )}
        </aside>
      </main>
    </div>
  )
}

export default function App() {
  const [retryNonce, setRetryNonce] = useState(0)

  return (
    <AppErrorBoundary onRetry={() => setRetryNonce((value) => value + 1)}>
      <AppInner key={retryNonce} />
    </AppErrorBoundary>
  )
}
