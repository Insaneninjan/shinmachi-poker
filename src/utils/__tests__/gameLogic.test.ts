import { describe, it, expect } from 'vitest'
import {
  isAllChanged,
  isAllOpened,
  applyCardChange,
  buildNextRound,
  getNextJudgeName,
  getCurrentJudgeName,
  amIJudge,
  dealHands,
  shuffleArray,
} from '../gameLogic'
import type { GameRow, PlayerHand, CardMember, ShowdownEntry } from '../../types/game'

// ======== テスト用フィクスチャ ========

const mockMembers: CardMember[] = Array.from({ length: 20 }, (_, i) => ({
  name: `カード${i + 1}`,
  photo: null,
  color: '#534AB7',
  suit: '♠',
}))

const identityShuffleFn = <T>(arr: T[]): T[] => [...arr]

function makeHand(index: number, changed = false): PlayerHand {
  return {
    player: `プレイヤー${index + 1}`,
    index,
    cards: mockMembers.slice(index * 5, index * 5 + 5),
    changed,
    opened: false,
  }
}

function makeGame(overrides: Partial<GameRow> = {}): GameRow {
  return {
    id: 'TEST',
    phase: 'change',
    hands: [makeHand(0), makeHand(1), makeHand(2)],
    showdown: [],
    judge_index: 0,
    player_names: ['ジャッジA', 'プレイヤー1', 'プレイヤー2', 'プレイヤー3'],
    winner: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ======== shuffleArray ========

describe('shuffleArray', () => {
  it('同じ要素を含む配列を返す', () => {
    const arr = [1, 2, 3, 4, 5]
    const result = shuffleArray(arr)
    expect(result).toHaveLength(arr.length)
    expect(result.sort()).toEqual([...arr].sort())
  })

  it('元の配列を変更しない', () => {
    const arr = [1, 2, 3]
    const copy = [...arr]
    shuffleArray(arr)
    expect(arr).toEqual(copy)
  })
})

// ======== dealHands ========

describe('dealHands', () => {
  it('プレイヤー数分の手札を返す', () => {
    const names = ['A', 'B', 'C']
    const hands = dealHands(names, mockMembers, identityShuffleFn)
    expect(hands).toHaveLength(3)
  })

  it('各プレイヤーに5枚配る', () => {
    const hands = dealHands(['A', 'B'], mockMembers, identityShuffleFn)
    hands.forEach((h) => expect(h.cards).toHaveLength(5))
  })

  it('changed と opened は false で初期化される', () => {
    const hands = dealHands(['A'], mockMembers, identityShuffleFn)
    expect(hands[0].changed).toBe(false)
    expect(hands[0].opened).toBe(false)
  })
})

// ======== isAllChanged ========

describe('isAllChanged', () => {
  it('全員が changed=true なら true を返す', () => {
    const hands = [makeHand(0, true), makeHand(1, true)]
    expect(isAllChanged(hands)).toBe(true)
  })

  it('1人でも changed=false なら false を返す', () => {
    const hands = [makeHand(0, true), makeHand(1, false)]
    expect(isAllChanged(hands)).toBe(false)
  })

  it('空配列は false を返す', () => {
    expect(isAllChanged([])).toBe(false)
  })
})

// ======== isAllOpened ========

describe('isAllOpened', () => {
  it('showdown の件数が hands の件数以上なら true', () => {
    const hands = [makeHand(0), makeHand(1)]
    const showdown: ShowdownEntry[] = [
      { playerIndex: 0, player: 'A', yaku: '役1', cards: [] },
      { playerIndex: 1, player: 'B', yaku: '役2', cards: [] },
    ]
    expect(isAllOpened(showdown, hands)).toBe(true)
  })

  it('showdown が不足していれば false', () => {
    const hands = [makeHand(0), makeHand(1)]
    const showdown: ShowdownEntry[] = [
      { playerIndex: 0, player: 'A', yaku: '役1', cards: [] },
    ]
    expect(isAllOpened(showdown, hands)).toBe(false)
  })
})

// ======== applyCardChange ========

describe('applyCardChange', () => {
  it('指定インデックスのカードが新しいカードに差し替えられる', () => {
    const hands = [makeHand(0), makeHand(1)]
    const original = hands[0].cards[0].name

    const result = applyCardChange(hands, 0, [0], mockMembers, identityShuffleFn)
    const changed = result.find((h) => h.index === 0)!

    expect(changed.cards[0].name).not.toBe(original)
    expect(changed.changed).toBe(true)
  })

  it('他のプレイヤーの手札は変更されない', () => {
    const hands = [makeHand(0), makeHand(1)]
    const result = applyCardChange(hands, 0, [0], mockMembers, identityShuffleFn)
    const unchanged = result.find((h) => h.index === 1)!
    expect(unchanged.cards).toEqual(hands[1].cards)
  })

  it('0枚捨てる（チェンジなし）でも changed=true になる', () => {
    const hands = [makeHand(0)]
    const result = applyCardChange(hands, 0, [], mockMembers, identityShuffleFn)
    expect(result[0].changed).toBe(true)
    expect(result[0].cards).toEqual(hands[0].cards)
  })
})

// ======== buildNextRound ========

describe('buildNextRound', () => {
  it('judge_index が次のプレイヤーにローテーションされる', () => {
    const game = makeGame({ judge_index: 0 })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    expect(result.judge_index).toBe(1)
  })

  it('最後のプレイヤーがジャッジなら 0 に戻る', () => {
    const game = makeGame({ judge_index: 3 }) // player_names は4人
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    expect(result.judge_index).toBe(0)
  })

  it('phase が "change" にリセットされる', () => {
    const game = makeGame({ phase: 'winner' })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    expect(result.phase).toBe('change')
  })

  it('showdown が空配列にリセットされる', () => {
    const game = makeGame({
      showdown: [{ playerIndex: 0, player: 'A', yaku: '役', cards: [] }],
    })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    expect(result.showdown).toEqual([])
  })

  it('winner が null にリセットされる', () => {
    const game = makeGame({ winner: 'プレイヤー1' })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    expect(result.winner).toBeNull()
  })

  it('全プレイヤーの changed が false にリセットされる', () => {
    const game = makeGame({
      hands: [makeHand(0, true), makeHand(1, true)],
    })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    result.hands.forEach((h) => {
      expect(h.changed).toBe(false)
    })
  })

  it('新しいジャッジはプレイヤー手札に含まれない', () => {
    // judge_index=0 → 次は 1 がジャッジ
    // player_names[1] = 'プレイヤー1' がジャッジになるので手札に入らない
    const game = makeGame({ judge_index: 0 })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    const nextJudgeName = game.player_names[result.judge_index]
    const isInHands = result.hands.some((h) => h.player === nextJudgeName)
    expect(isInHands).toBe(false)
  })

  it('各プレイヤーに5枚配られる', () => {
    const game = makeGame()
    const result = buildNextRound(game, mockMembers, identityShuffleFn)
    result.hands.forEach((h) => {
      expect(h.cards).toHaveLength(5)
    })
  })

  it('同名のプレイヤーが複数いても、各手札のindexは元のplayer_names内の正しい位置を指す（indexOf誤動作の回帰テスト）', () => {
    // 「ホスト」を空欄のまま開始するなどして名前が重複した状況を再現
    const game = makeGame({
      judge_index: 0,
      player_names: ['ホスト', 'ホスト', 'プレイヤー2', 'プレイヤー3'],
    })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)

    // 次ジャッジは index=1 (2人目の「ホスト」)
    expect(result.judge_index).toBe(1)

    // 残ったプレイヤーは index 0, 2, 3 のはず
    const indices = result.hands.map((h) => h.index).sort((a, b) => a - b)
    expect(indices).toEqual([0, 2, 3])

    // index=0 の「ホスト」の手札は、index=1ではなくindex=0のものとして区別されている
    const firstHostHand = result.hands.find((h) => h.index === 0)
    expect(firstHostHand).toBeDefined()
    expect(firstHostHand!.player).toBe('ホスト')

    // 次ジャッジ(index=1)は手札に含まれない
    const isJudgeInHands = result.hands.some((h) => h.index === 1)
    expect(isJudgeInHands).toBe(false)
  })

  it('同名プレイヤーが複数いても手札の重複や欠落が起きない', () => {
    const game = makeGame({
      judge_index: 2,
      player_names: ['田中', '田中', '田中', '田中'],
    })
    const result = buildNextRound(game, mockMembers, identityShuffleFn)

    // ジャッジ(index=3)以外の3人分の手札が生成される
    expect(result.hands).toHaveLength(3)
    const indices = result.hands.map((h) => h.index).sort((a, b) => a - b)
    expect(indices).toEqual([0, 1, 2])
  })
})

// ======== judge ユーティリティ ========

describe('getCurrentJudgeName / getNextJudgeName', () => {
  it('現在のジャッジ名を返す', () => {
    const game = makeGame({ judge_index: 0 })
    expect(getCurrentJudgeName(game)).toBe('ジャッジA')
  })

  it('次のジャッジ名を返す', () => {
    const game = makeGame({ judge_index: 0 })
    expect(getNextJudgeName(game)).toBe('プレイヤー1')
  })
})

describe('amIJudge', () => {
  it('自分のインデックスとジャッジインデックスが一致すれば true', () => {
    expect(amIJudge(2, 2)).toBe(true)
  })

  it('一致しなければ false', () => {
    expect(amIJudge(1, 2)).toBe(false)
  })
})
