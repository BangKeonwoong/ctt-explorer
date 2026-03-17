import type { ClauseNode } from './types'

export type FlatNode = {
  node: ClauseNode
  depth: number
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
): FlatNode[] {
  const result: FlatNode[] = []

  function visit(node: ClauseNode, depth: number) {
    if (includeRoot || node.ctype !== 'ROOT') {
      result.push({ node, depth })
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
