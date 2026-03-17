import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildRelationSets,
  collectClauseTypes,
  collectNodeIndex,
  countDescendants,
  flattenVisibleNodes,
  getPathNodes,
  getPrimaryTextType,
  getSiblingNodes,
} from './ctt'
import type { ClauseNode } from './types'

const sampleTree: ClauseNode = {
  id: 'root',
  verse: 'DAN 01,00',
  pn: '',
  ctype: 'ROOT',
  mother: '',
  textType: '',
  paragraph: '',
  atomNumber: '',
  subtype: '',
  hierarchy: '',
  surface: 'Daniel',
  surfaceHebrew: '',
  gloss: '',
  functions: [],
  pipeDepth: -1,
  quotationBlock: 0,
  quotationDepth: 0,
  isRoot: true,
  isDirectSpeech: false,
  parentId: null,
  depth: -1,
  path: ['root'],
  siblingIndex: 0,
  descendantCount: 4,
  hasChildren: true,
  children: [
    {
      id: 'n1',
      verse: 'DAN 01,01',
      pn: '3sgM',
      ctype: 'WayX',
      mother: 'ROOT',
      textType: 'N',
      paragraph: '1',
      atomNumber: '1',
      subtype: '',
      hierarchy: '',
      surface: 'foo',
      surfaceHebrew: '',
      gloss: '',
      functions: ['Pr'],
      pipeDepth: 0,
      quotationBlock: 0,
      quotationDepth: 0,
      isRoot: false,
      isDirectSpeech: false,
      parentId: 'root',
      depth: 0,
      path: ['root', 'n1'],
      siblingIndex: 0,
      descendantCount: 2,
      hasChildren: true,
      children: [
        {
          id: 'n1a',
          verse: 'DAN 01,01',
          pn: '3sgM',
          ctype: 'NmCl',
          mother: 'WayX',
          textType: 'Q',
          paragraph: '1',
          atomNumber: '2',
          subtype: '',
          hierarchy: '',
          surface: 'bar',
          surfaceHebrew: '',
          gloss: '',
          functions: ['Su'],
          pipeDepth: 1,
          quotationBlock: 1,
          quotationDepth: 1,
          isRoot: false,
          isDirectSpeech: true,
          parentId: 'n1',
          depth: 1,
          path: ['root', 'n1', 'n1a'],
          siblingIndex: 0,
          descendantCount: 0,
          hasChildren: false,
          children: [],
        },
        {
          id: 'n1b',
          verse: 'DAN 01,02',
          pn: '3sgM',
          ctype: 'AjCl',
          mother: 'WayX',
          textType: 'N',
          paragraph: '1',
          atomNumber: '3',
          subtype: '',
          hierarchy: '',
          surface: 'baz',
          surfaceHebrew: '',
          gloss: '',
          functions: ['Co'],
          pipeDepth: 1,
          quotationBlock: 0,
          quotationDepth: 0,
          isRoot: false,
          isDirectSpeech: false,
          parentId: 'n1',
          depth: 1,
          path: ['root', 'n1', 'n1b'],
          siblingIndex: 1,
          descendantCount: 0,
          hasChildren: false,
          children: [],
        },
      ],
    },
    {
      id: 'n2',
      verse: 'DAN 01,03',
      pn: '3sgM',
      ctype: 'Way0',
      mother: 'ROOT',
      textType: 'N',
      paragraph: '1',
      atomNumber: '4',
      subtype: '',
      hierarchy: '',
      surface: 'qux',
      surfaceHebrew: '',
      gloss: '',
      functions: ['Pr'],
      pipeDepth: 0,
      quotationBlock: 0,
      quotationDepth: 0,
      isRoot: false,
      isDirectSpeech: false,
      parentId: 'root',
      depth: 0,
      path: ['root', 'n2'],
      siblingIndex: 1,
      descendantCount: 1,
      hasChildren: true,
      children: [
        {
          id: 'n2a',
          verse: 'DAN 01,03',
          pn: '3sgM',
          ctype: 'InfC',
          mother: 'Way0',
          textType: 'N',
          paragraph: '1',
          atomNumber: '5',
          subtype: '',
          hierarchy: '',
          surface: 'quux',
          surfaceHebrew: '',
          gloss: '',
          functions: ['Ob'],
          pipeDepth: 1,
          quotationBlock: 0,
          quotationDepth: 0,
          isRoot: false,
          isDirectSpeech: false,
          parentId: 'n2',
          depth: 1,
          path: ['root', 'n2', 'n2a'],
          siblingIndex: 0,
          descendantCount: 0,
          hasChildren: false,
          children: [],
        },
      ],
    },
  ],
}

describe('ctt utilities', () => {
  it('indexes nodes recursively', () => {
    const index = collectNodeIndex(sampleTree)
    assert.equal(index.get('n1a')?.ctype, 'NmCl')
  })

  it('counts descendants and flattens visible nodes', () => {
    assert.equal(countDescendants(sampleTree), 4)

    const visible = flattenVisibleNodes(sampleTree, new Set<string>())
    assert.deepEqual(
      visible.map(({ node, depth }) => [node.id, depth]),
      [
        ['n1', 0],
        ['n1a', 1],
        ['n1b', 1],
        ['n2', 0],
        ['n2a', 1],
      ],
    )

    const ancestorsOnly = flattenVisibleNodes(
      sampleTree,
      new Set<string>(),
      false,
      new Set(['root', 'n2', 'n2a']),
    )
    assert.deepEqual(
      ancestorsOnly.map(({ node }) => node.id),
      ['n2', 'n2a'],
    )
  })

  it('derives path, sibling, and daughter relations', () => {
    const index = collectNodeIndex(sampleTree)
    const selected = index.get('n2')

    assert.ok(selected)
    assert.deepEqual(
      getPathNodes(selected!, index).map((node) => node.id),
      ['root', 'n2'],
    )
    assert.deepEqual(
      getSiblingNodes(selected!, index).map((node) => node.id),
      ['n1'],
    )

    const relations = buildRelationSets(selected!, index)
    assert.deepEqual([...relations.ancestorIds], [])
    assert.deepEqual([...relations.siblingIds], ['n1'])
    assert.deepEqual([...relations.daughterIds], ['n2a'])
  })

  it('collects subtree clause type counts', () => {
    assert.deepEqual(collectClauseTypes(sampleTree), [
      ['AjCl', 1],
      ['InfC', 1],
      ['NmCl', 1],
      ['Way0', 1],
      ['WayX', 1],
    ])
  })

  it('derives a primary text type', () => {
    assert.equal(getPrimaryTextType('NQ'), 'Q')
    assert.equal(getPrimaryTextType('D'), 'D')
    assert.equal(getPrimaryTextType(''), '?')
  })
})
