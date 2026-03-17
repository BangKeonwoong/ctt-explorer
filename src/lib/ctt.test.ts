import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  collectNodeIndex,
  countDescendants,
  flattenVisibleNodes,
  getPrimaryTextType,
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
    assert.equal(countDescendants(sampleTree), 2)

    const visible = flattenVisibleNodes(sampleTree, new Set<string>())
    assert.deepEqual(
      visible.map(({ node, depth }) => [node.id, depth]),
      [
        ['n1', 0],
        ['n1a', 1],
      ],
    )
  })

  it('derives a primary text type', () => {
    assert.equal(getPrimaryTextType('NQ'), 'Q')
    assert.equal(getPrimaryTextType('D'), 'D')
    assert.equal(getPrimaryTextType(''), '?')
  })
})
