import type { ClauseNode } from './types'

export type FlatNode = {
  node: ClauseNode
  depth: number
}

export type RelationSets = {
  ancestorIds: Set<string>
  siblingIds: Set<string>
  daughterIds: Set<string>
}

export function collectNodeIndex(root: ClauseNode): Map<string, ClauseNode> {
  const index = new Map<string, ClauseNode>()

  function visit(node: ClauseNode) {
    index.set(node.id, node)
    node.children.forEach(visit)
  }

  visit(root)
  return index
}

export function flattenVisibleNodes(
  root: ClauseNode,
  collapsed: Set<string>,
  includeRoot = false,
  visibleIds?: Set<string>,
): FlatNode[] {
  const result: FlatNode[] = []

  function visit(node: ClauseNode, depth: number) {
    const shouldIncludeRoot = includeRoot || node.ctype !== 'ROOT'
    const isVisible = !visibleIds || visibleIds.has(node.id)

    if (shouldIncludeRoot && isVisible) {
      result.push({ node, depth })
    }

    if (node.ctype !== 'ROOT' && visibleIds && !visibleIds.has(node.id)) {
      return
    }

    if (collapsed.has(node.id)) {
      return
    }

    node.children.forEach((child) => visit(child, depth + 1))
  }

  visit(root, includeRoot ? 0 : -1)
  return result
}

export function countDescendants(node: ClauseNode): number {
  if (typeof node.descendantCount === 'number') {
    return node.descendantCount
  }
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0,
  )
}

export function getPrimaryTextType(textType: string): string {
  if (textType.includes('Q')) return 'Q'
  if (textType.includes('D')) return 'D'
  if (textType.includes('N')) return 'N'
  if (textType.includes('?')) return '?'
  return textType || '?'
}

export function buildVerseKey(
  book: string,
  chapter: number,
  verse: number,
): string {
  return `${book} ${String(chapter).padStart(2, '0')},${String(verse).padStart(2, '0')}`
}

export function formatVerseLabel(verse: string): string {
  const match = verse.match(/[A-Z0-9]{3}\s+(\d{2}),(\d{2})/)
  if (!match) return verse
  return `${Number(match[1])}:${Number(match[2])}`
}

export function getPathNodes(
  node: ClauseNode,
  index: Map<string, ClauseNode>,
): ClauseNode[] {
  return node.path
    .map((id) => index.get(id))
    .filter((value): value is ClauseNode => Boolean(value))
}

export function getSiblingNodes(
  node: ClauseNode,
  index: Map<string, ClauseNode>,
): ClauseNode[] {
  if (!node.parentId) return []
  const parent = index.get(node.parentId)
  if (!parent) return []
  return parent.children.filter((candidate) => candidate.id !== node.id)
}

export function buildRelationSets(
  node: ClauseNode | null,
  index: Map<string, ClauseNode>,
): RelationSets {
  if (!node) {
    return {
      ancestorIds: new Set<string>(),
      siblingIds: new Set<string>(),
      daughterIds: new Set<string>(),
    }
  }

  const pathNodes = getPathNodes(node, index)
  const ancestorIds = new Set(
    pathNodes
      .filter((candidate) => candidate.ctype !== 'ROOT' && candidate.id !== node.id)
      .map((candidate) => candidate.id),
  )
  const siblingIds = new Set(getSiblingNodes(node, index).map((candidate) => candidate.id))
  const daughterIds = new Set(node.children.map((candidate) => candidate.id))

  return {
    ancestorIds,
    siblingIds,
    daughterIds,
  }
}

export function collectClauseTypes(node: ClauseNode): [string, number][] {
  const counts = new Map<string, number>()

  function visit(current: ClauseNode) {
    if (current.ctype !== 'ROOT') {
      counts.set(current.ctype, (counts.get(current.ctype) ?? 0) + 1)
    }
    current.children.forEach(visit)
  }

  visit(node)
  return [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1]
    return left[0].localeCompare(right[0])
  })
}
