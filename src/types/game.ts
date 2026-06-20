// ゲームフェーズ
export type GamePhase = 'lobby' | 'change' | 'open' | 'judge' | 'winner'

// カード（デッキメンバー）
export interface CardMember {
  id?: string           // Supabase UUID（DB登録済みメンバーのみ持つ）
  name: string
  photo: string | null
  color: string
  suit: '♠' | '♥' | '♦' | '♣'
}

// プレイヤーの手札
export interface PlayerHand {
  player: string      // プレイヤー名
  index: number       // プレイヤーインデックス（0始まり）
  cards: CardMember[]
  changed: boolean    // チェンジ完了フラグ
  opened: boolean     // オープン完了フラグ
}

// 役の内訳グループ（ツーペアの「ペア①/ペア②」、フルハウスの「スリー/ペア」など）
export interface CardGroup {
  label: string
  cards: CardMember[]
}

// ショーダウンエントリ（オープン時に提出）
export interface ShowdownEntry {
  playerIndex: number
  player: string
  yaku: string          // 役名（大喜利テキスト）
  cards: CardMember[]   // 出したカード（後方互換用・全枚数）
  groups?: CardGroup[]  // 役の内訳（ツーペア・フルハウス・ストレート等）
}

// Supabase games テーブルの行
export interface GameRow {
  id: string                   // 4桁ルームコード
  phase: GamePhase
  members?: CardMember[]       // デッキメンバー（DBに保存される場合がある）
  hands: PlayerHand[]
  showdown: ShowdownEntry[]
  judge_index: number          // player_names の何番目がジャッジか
  player_names: string[]       // 全参加者名（0番=最初のジャッジ/ホスト）
  winner: string | null
  created_at: string
}

// 自分のロール
export type MyRole = 'judge' | 'player'

// クライアントの状態
export interface ClientState {
  roomCode: string | null
  role: MyRole | null
  myPlayerIndex: number        // judge_index と照合するためのインデックス
  myPlayerName: string | null
  discardSelected: number[]    // チェンジで捨てるカードのindex
  openSelected: number[]       // オープンで出すカードのindex
}

// 次ラウンド初期化の引数
export interface NextRoundArgs {
  currentGame: GameRow
  members: CardMember[]
  shuffle: <T>(arr: T[]) => T[]
}

// 次ラウンドのDB更新データ
export interface NextRoundUpdate {
  phase: GamePhase
  hands: PlayerHand[]
  showdown: ShowdownEntry[]
  judge_index: number
  winner: null
}
