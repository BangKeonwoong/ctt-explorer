import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizeChapterData, normalizeManifest } from './loaders'

describe('loaders normalization', () => {
  it('fills manifest feature defaults', () => {
    const manifest = normalizeManifest({
      productName: 'CTT Explorer',
      books: [
        {
          code: 'DAN',
          name: 'Daniel',
          label: '다니엘',
          testament: 'OT',
          chapterCount: 12,
          status: 'available',
          chapters: [
            {
              chapter: 1,
              title: '다니엘 1장',
              file: 'chapters/DAN-01.json',
              stats: {
                totalNodes: 1,
                clauseTypes: {},
                textTypes: {},
              },
            },
          ],
        },
      ],
    })

    assert.equal(manifest.books[0]?.features.koreanLiteral, false)
  })

  it('fills chapter defaults and derives tree fields', () => {
    const chapter = normalizeChapterData({
      book: 'DAN',
      chapter: 1,
      root: {
        id: 'DAN-01-root',
        verse: 'DAN 01,00',
        ctype: 'ROOT',
        children: [
          {
            id: 'DAN-01-001',
            verse: 'DAN 01,01',
            ctype: 'WayX',
            surface: 'foo',
          },
        ],
      },
    })

    assert.deepEqual(chapter.unmatchedLiteralByVerse, {})
    assert.deepEqual(chapter.literalCoverage, {
      totalRows: 0,
      matchedRows: 0,
      unmatchedRows: 0,
    })
    assert.equal(chapter.root.children[0]?.parentId, 'DAN-01-root')
    assert.equal(chapter.root.children[0]?.depth, 0)
    assert.deepEqual(chapter.root.children[0]?.path, ['DAN-01-root', 'DAN-01-001'])
  })

  it('normalizes missing node children to an empty array', () => {
    const chapter = normalizeChapterData({
      book: 'DAN',
      chapter: 1,
      root: {
        id: 'DAN-01-root',
        verse: 'DAN 01,00',
        ctype: 'ROOT',
        children: [
          {
            id: 'DAN-01-001',
            verse: 'DAN 01,01',
            ctype: 'WayX',
            surface: 'foo',
            children: null,
          },
        ],
      },
    })

    assert.deepEqual(chapter.root.children[0]?.children, [])
    assert.equal(chapter.root.children[0]?.hasChildren, false)
  })

  it('throws on malformed manifest payload', () => {
    assert.throws(() => normalizeManifest({ productName: 'CTT Explorer' }))
  })

  it('throws on malformed chapter payload', () => {
    assert.throws(() =>
      normalizeChapterData({
        book: 'DAN',
        chapter: 1,
        root: null,
      }),
    )
  })
})
