import { useState, useEffect } from 'react'
import { useGame, supabase } from '../hooks/useSupabase'
import { Button } from '../components/Button'
import { Layout, RoomCodePanel, SectionLabel, GoldDivider } from '../components/Layout'
import { shuffleArray } from '../utils/gameLogic'
import type { CardMember, GameRow, PlayerHand } from '../types/game'

interface ScreenLobbyProps {
  roomCode: string
  myPlayerIndex: number
  isHost: boolean
  members: CardMember[]
  onGameStarted: (game: GameRow, isJudge: boolean) => void
}

export function ScreenLobby({ roomCode, myPlayerIndex, isHost, members, onGameStarted }: ScreenLobbyProps) {
  const { game } = useGame({ roomCode, myPlayerIndex, isJudge: false, members })
  const [starting, setStarting] = useState(false)

  const playerNames = game?.player_names ?? []
  // ホスト含めて2人以上いないとゲーム開始できない
  const canStart = playerNames.length >= 2

  // フェーズが lobby → change になったら全員でゲーム画面へ遷移
  useEffect(() => {
    if (!game || game.phase !== 'change') return
    // judge_index が 0 の場合、player_names[0] = ホスト = ジャッジ
    const iAmJudge = game.judge_index === myPlayerIndex
    onGameStarted(game, iAmJudge)
  }, [game?.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStartGame() {
    if (!game || !canStart || starting) return
    setStarting(true)
    try {
      // members はゲーム行に保存済みのものを優先
      const deck = (game.members && game.members.length > 0) ? game.members : members
      // player_names[0] = ホスト（ジャッジ）、[1..] = プレイヤー
      const playerOnlyNames = playerNames.slice(1)
      const shuffled = shuffleArray(deck)
      const hands: PlayerHand[] = playerOnlyNames.map((name, i) => ({
        player: name,
        index: i + 1,  // ホストが 0 なのでプレイヤーは 1 始まり
        cards: shuffled.slice(i * 5, i * 5 + 5),
        changed: false,
        opened: false,
      }))
      const { error } = await supabase
        .from('games')
        .update({ phase: 'change', hands })
        .eq('id', roomCode)
      if (error) { alert(`エラー: ${error.message}`); setStarting(false) }
      // 成功時は Realtime で useEffect が発火して画面遷移する
    } catch {
      setStarting(false)
    }
  }

  return (
    <Layout>
      {/* ルームコード */}
      <RoomCodePanel code={roomCode} />

      {/* 参加者リスト */}
      <SectionLabel>参加者 {playerNames.length > 0 ? `（${playerNames.length}人）` : ''}</SectionLabel>
      <div className="space-y-2 mb-6">
        {playerNames.map((name, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-black/30 border border-[rgba(201,168,76,0.2)] rounded-[14px] px-4 py-3 animate-fade-up"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div
              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
              style={{ background: i === 0 ? '#993C1D' : '#534AB7', border: '2px solid rgba(201,168,76,0.3)' }}
            >
              {name.slice(0, 1)}
            </div>
            <span className="text-[15px] font-bold text-[#fdf6e3] flex-1">{name}</span>
            {i === myPlayerIndex && (
              <span className="text-[11px] text-[#c9a84c] border border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.08)] rounded px-2 py-[2px]">あなた</span>
            )}
            {i === 0 && (
              <span className="text-[11px] text-[#ff8a7a] border border-[rgba(192,57,43,0.4)] bg-[rgba(192,57,43,0.08)] rounded px-2 py-[2px]">ホスト</span>
            )}
          </div>
        ))}

        {/* 待機インジケーター */}
        <div className="flex items-center gap-3 border border-dashed border-[rgba(201,168,76,0.15)] rounded-[14px] px-4 py-3">
          <div className="w-9 h-9 rounded-full flex-shrink-0 border-2 border-dashed border-white/20 flex items-center justify-center text-white/25 text-sm">+</div>
          <span className="text-[14px] text-white/30">参加を待っています…</span>
        </div>
      </div>

      <GoldDivider />

      {isHost ? (
        <>
          {canStart ? (
            <Button variant="gold" onClick={handleStartGame} disabled={starting}>
              {starting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                  開始中...
                </>
              ) : `▶ ゲーム開始！（${playerNames.length}人）`}
            </Button>
          ) : (
            <div className="bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.15)] rounded-[10px] px-4 py-3 text-[13px] text-white/50 text-center mb-4">
              あと{2 - playerNames.length}人以上参加したらゲームを開始できます
            </div>
          )}
          <p className="text-[12px] text-white/35 text-center mt-3">
            上のルームコードを参加者にシェアしてね
          </p>
        </>
      ) : (
        <div className="bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.2)] rounded-[12px] px-4 py-5 text-center">
          <div className="text-[28px] mb-2">⏳</div>
          <div className="text-[14px] text-white/70 font-bold mb-1">ホストのゲーム開始を待っています</div>
          <div className="text-[12px] text-white/35">全員が揃ったらホストがゲームを開始します</div>
        </div>
      )}
    </Layout>
  )
}
