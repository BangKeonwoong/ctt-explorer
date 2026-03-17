import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { readViewState, writeViewState } from './urlState'

describe('urlState', () => {
  it('reads query state', () => {
    assert.deepEqual(
      readViewState(
        '?book=DAN&chapter=4&view=list&node=DAN-04-017&hebrew=1&gloss=1&filters=WayX,NmCl',
      ),
      {
        book: 'DAN',
        chapter: 4,
        view: 'list',
        node: 'DAN-04-017',
        hebrew: true,
        gloss: true,
        filters: ['WayX', 'NmCl'],
      },
    )
  })

  it('writes compact query state', () => {
    assert.equal(
      writeViewState({
        book: 'DAN',
        chapter: 2,
        view: 'tree',
        node: 'DAN-02-001',
        hebrew: false,
        gloss: true,
        filters: ['WayX'],
      }),
      '?book=DAN&chapter=2&view=tree&node=DAN-02-001&gloss=1&filters=WayX',
    )
  })
})
