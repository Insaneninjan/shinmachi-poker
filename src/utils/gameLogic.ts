import type {
  GameRow,
  PlayerHand,
  CardMember,
  NextRoundUpdate,
  ShowdownEntry,
} from '../types/game'

// ======== ユーティリティ ========

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// ======== 手札配布 ========

export function dealHands(
  playerNames: string[],
  members: CardMember[],
  shuffleFn: <T>(arr: T[]) => T[] = shuffleArray
): PlayerHand[] {
  const shuffled = shuffleFn(members)
  return playerNames.map((name, i) => ({
    player: name,
    index: i,
    cards: shuffled.slice(i * 5, i * 5 + 5),
    changed: false,
    opened: false,
  }))
}

// ======== フェーズ遷移ロジック ========

/**
 * チェンジフェーズ：全員完了しているか
 */
export function isAllChanged(hands: PlayerHand[] | undefined): boolean {
  if (!hands || hands.length === 0) return false
  return hands.every((h) => h.changed)
}

/**
 * オープンフェーズ：全員完了しているか
 */
export function isAllOpened(
  showdown: ShowdownEntry[] | undefined,
  hands: PlayerHand[] | undefined
): boolean {
  if (!hands || hands.length === 0) return false
  if (!showdown) return false
  return showdown.length >= hands.length
}

/**
 * カードをチェンジ（捨てて山札から補充）
 * 純粋関数 - 新しい hands 配列を返す
 */
export function applyCardChange(
  hands: PlayerHand[],
  playerIndex: number,
  discardIndices: number[],
  members: CardMember[],
  shuffleFn: <T>(arr: T[]) => T[] = shuffleArray
): PlayerHand[] {
  // 現在使用中のカード名を収集
  const usedNames = new Set(hands.flatMap((h) => h.cards.map((c) => c.name)))
  // 使っていないカードを山札に
  const deck = shuffleFn(members.filter((m) => !usedNames.has(m.name)))

  return hands.map((h) => {
    if (h.index !== playerIndex) return h
    const newCards = [...h.cards]
    let deckIdx = 0
    discardIndices.forEach((i) => {
      if (deckIdx < deck.length) {
        newCards[i] = deck[deckIdx++]
      }
    })
    return { ...h, cards: newCards, changed: true }
  })
}

// ======== 次ラウンド初期化 ========

/**
 * ラウンド終了後、次ラウンドのDB更新データを生成する純粋関数
 * - judge_index をローテーション
 * - 全プレイヤーの hands をリセット・再配布
 * - showdown をクリア
 * - winner をクリア
 */
export function buildNextRound(
  currentGame: GameRow,
  members: CardMember[],
  shuffleFn: <T>(arr: T[]) => T[] = shuffleArray
): NextRoundUpdate {
  const allNames = currentGame.player_names
  const nextJudgeIndex = (currentGame.judge_index + 1) % allNames.length

  // ジャッジを除くプレイヤーのインデックス一覧（名前ではなくindexで管理する）
  // 名前の重複（例: ホスト名を入力し忘れて「ホスト」のままにした場合など）があっても
  // indexOfで誤ったプレイヤーを引き当てないようにするため、文字列検索は使わない
  const playerIndices = allNames
    .map((_, i) => i)
    .filter((i) => i !== nextJudgeIndex)

  // 次ラウンドの手札を配る
  const shuffled = shuffleFn(members)
  const hands: PlayerHand[] = playerIndices.map((originalIndex, i) => ({
    player: allNames[originalIndex],
    index: originalIndex,
    cards: shuffled.slice(i * 5, i * 5 + 5),
    changed: false,
    opened: false,
  }))

  return {
    phase: 'change',
    hands,
    showdown: [],
    judge_index: nextJudgeIndex,
    winner: null,
  }
}

/**
 * 次のジャッジ名を取得
 */
export function getNextJudgeName(game: GameRow): string {
  const nextIndex = (game.judge_index + 1) % game.player_names.length
  return game.player_names[nextIndex]
}

/**
 * 現在のジャッジ名を取得
 */
export function getCurrentJudgeName(game: GameRow): string {
  return game.player_names[game.judge_index]
}

/**
 * 自分がジャッジかどうか判定
 */
export function amIJudge(myPlayerIndex: number, judgeIndex: number): boolean {
  return myPlayerIndex === judgeIndex
}

/**
 * showdown を playerIndex 順にソート
 */
export function sortShowdown(showdown: ShowdownEntry[] | undefined | null): ShowdownEntry[] {
  if (!showdown) return []
  return [...showdown].sort((a, b) => a.playerIndex - b.playerIndex)
}
