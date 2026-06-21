import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import type { GameRow } from '../types/game'
import {
  isAllChanged,
  isAllOpened,
  buildNextRound,
  amIJudge,
} from '../utils/gameLogic'
import type { CardMember } from '../types/game'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export { supabase }

// ======== useGame フック ========
// ルームコードを受け取り、Realtime でゲーム状態を監視する
// ジャッジ側のみフェーズ自動進行ロジックを実行する

interface UseGameOptions {
  roomCode: string | null
  myPlayerIndex: number          // judge_index と照合する自分の番号
  isJudge: boolean
  members: CardMember[]          // カードデッキ（チェンジ補充用）
}

interface UseGameReturn {
  game: GameRow | null
  loading: boolean
  error: string | null
  updateGame: (patch: Partial<GameRow>) => Promise<void>
}

export function useGame({
  roomCode,
  myPlayerIndex,
  isJudge,
  // members may be passed by callers but is not used directly in this hook
}: UseGameOptions): UseGameReturn {
  const [game, setGame] = useState<GameRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フェーズ自動進行の多重実行を防ぐ ref
  const processingRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // DBからゲームデータを取得
  const fetchGame = useCallback(async (code: string) => {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', code)
      .single()
    if (error) { setError(error.message); return null }
    return data as GameRow
  }, [])

  // DB更新ラッパー
  const updateGame = useCallback(async (patch: Partial<GameRow>) => {
    if (!roomCode) return
    const { error } = await supabase
      .from('games')
      .update(patch)
      .eq('id', roomCode)
    if (error) setError(error.message)
  }, [roomCode])

  // ジャッジのみ：フェーズ自動進行
  const handleAutoPhaseAdvance = useCallback(async (g: GameRow) => {
    // 多重実行防止
    if (processingRef.current) return
    // 自分がジャッジでなければ何もしない
    if (!amIJudge(myPlayerIndex, g.judge_index)) return

    const { phase, hands = [], showdown = [] } = g

    if (phase === 'change' && isAllChanged(hands)) {
      processingRef.current = true
      // 1回目完了 → changed フラグをリセットして2回目チェンジへ
      const resetHands = hands.map(h => ({ ...h, changed: false }))
      await supabase.from('games').update({ phase: 'change2', hands: resetHands }).eq('id', g.id)
      processingRef.current = false
      return
    }

    if (phase === 'change2' && isAllChanged(hands)) {
      processingRef.current = true
      await supabase.from('games').update({ phase: 'open' }).eq('id', g.id)
      processingRef.current = false
      return
    }

    if (phase === 'open' && isAllOpened(showdown, hands)) {
      processingRef.current = true
      await supabase.from('games').update({ phase: 'judge' }).eq('id', g.id)
      processingRef.current = false
      return
    }
  }, [myPlayerIndex])

  useEffect(() => {
    if (!roomCode) return

    let isMounted = true
    setLoading(true)

    // 初回取得
    fetchGame(roomCode).then((g) => {
      if (isMounted && g) {
        setGame(g)
        setLoading(false)
      }
    })

    // Realtime 購読
    const channel = supabase
      .channel(`game:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${roomCode}`,
        },
        (payload) => {
          if (!isMounted) return
          // Realtime の payload.new は差分のみの場合がある。
          // 既存の game state とマージして欠落フィールドを補う。
          setGame(prev => {
            const merged: GameRow = { ...(prev ?? {} as GameRow), ...(payload.new as GameRow) }
            // ジャッジのみ自動フェーズ進行（マージ後のデータで判定）
            if (isJudge) {
              handleAutoPhaseAdvance(merged)
            }
            return merged
          })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      isMounted = false
      channel.unsubscribe()
    }
  }, [roomCode, isJudge, fetchGame, handleAutoPhaseAdvance])

  return { game, loading, error, updateGame }
}

// ======== useNextRound フック ========
// 勝者確定後、次ラウンドをDBに書き込む

export function useNextRound() {
  const startNextRound = useCallback(
    async (game: GameRow, members: CardMember[]) => {
      // If caller didn't provide members (deck), try to read from DB-stored game.members
      let deck = members
      if (!deck || deck.length === 0) {
        const { data, error } = await supabase.from('games').select('members').eq('id', game.id).single()
        if (!error && data?.members) deck = data.members as CardMember[]
      }
      const patch = buildNextRound(game, deck)
      const { error } = await supabase
        .from('games')
        .update(patch)
        .eq('id', game.id)
      if (error) throw new Error(error.message)
    },
    []
  )
  return { startNextRound }
}
