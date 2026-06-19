import { useRef, useState } from 'react'
import { supabase } from '../hooks/useSupabase'
import { Button } from '../components/Button'
import { Layout, PageTitle, PageSub } from '../components/Layout'
import type { GameRow } from '../types/game'

interface ScreenJoinProps {
  onJoinAsJudge: (game: GameRow, playerIndex: number) => void
  onJoinAsPlayer: (game: GameRow, playerIndex: number) => void
  onBack: () => void
}

export function ScreenJoin({ onJoinAsJudge, onJoinAsPlayer, onBack }: ScreenJoinProps) {
  const [chars, setChars] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [game, setGame] = useState<GameRow | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const code = chars.join('')

  function handleChar(val: string, idx: number) {
    const c = val.toUpperCase().slice(-1)
    const updated = [...chars]
    updated[idx] = c
    setChars(updated)
    if (c && idx < 3) inputRefs.current[idx + 1]?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  async function handleSearch() {
    if (code.length !== 4) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('games')
      .select('*')
      .eq('id', code)
      .single()
    setLoading(false)
    if (err || !data) {
      setError(`ルームが見つかりませんでした。コード「${code}」を確認してね。`)
      return
    }
    setGame(data as GameRow)
  }

  if (game) {
    const judgeIndex = game.judge_index
    const judgeName = game.player_names[judgeIndex]
    return (
      <Layout>
        <PageTitle>あなたは誰？</PageTitle>
        <PageSub>自分の名前をタップしてね</PageSub>
        {/* ジャッジ選択肢 */}
        <div
          className="flex items-center gap-4 bg-[rgba(192,57,43,0.08)] border border-[rgba(192,57,43,0.4)] rounded-[14px] px-4 py-4 cursor-pointer mb-3 transition-all hover:bg-[rgba(192,57,43,0.15)] hover:border-red-400 animate-fade-up"
          onClick={() => onJoinAsJudge(game, judgeIndex)}
        >
          <div
            className="w-[46px] h-[46px] rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-white"
            style={{ background: '#993C1D', border: '2px solid rgba(201,168,76,0.3)' }}
          >
            {judgeName.slice(0, 1)}
          </div>
          <span className="text-[16px] font-bold text-[#fdf6e3] flex-1">{judgeName}</span>
          <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-bold bg-[rgba(192,57,43,0.2)] text-[#ff8a7a] border border-[rgba(192,57,43,0.4)]">
            ⚖ ジャッジ
          </span>
        </div>
        {/* プレイヤー選択肢 */}
        {game.hands.map((h, i) => (
          <div
            key={h.index}
            className="flex items-center gap-4 bg-black/30 border border-[rgba(201,168,76,0.2)] rounded-[14px] px-4 py-4 cursor-pointer mb-3 transition-all hover:border-[#c9a84c] hover:bg-[rgba(201,168,76,0.1)] hover:translate-x-1 animate-fade-up"
            style={{ animationDelay: `${(i + 1) * 0.05}s` }}
            onClick={() => onJoinAsPlayer(game, h.index)}
          >
            <div
              className="w-[46px] h-[46px] rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-white overflow-hidden"
              style={{ background: h.cards[0].color, border: '2px solid rgba(201,168,76,0.3)' }}
            >
              {h.cards[0].photo
                ? <img src={h.cards[0].photo} className="w-full h-full object-cover" alt="" />
                : h.player.slice(0, 1)}
            </div>
            <span className="text-[16px] font-bold text-[#fdf6e3] flex-1">{h.player}</span>
            <span className="inline-block px-2 py-[2px] rounded-md text-[11px] font-bold bg-[rgba(201,168,76,0.2)] text-[#c9a84c] border border-[rgba(201,168,76,0.3)]">
              P{h.index + 1}
            </span>
          </div>
        ))}
        <Button variant="ghost" onClick={() => setGame(null)} className="mt-2">← コード入力に戻る</Button>
      </Layout>
    )
  }

  return (
    <Layout>
      <PageTitle>ゲームに参加</PageTitle>
      <PageSub>ジャッジからもらった4桁のコードを入力してね</PageSub>

      {/* 4桁コード入力 */}
      <div className="flex justify-center gap-3 mb-6">
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el: HTMLInputElement | null) => { inputRefs.current[i] = el }}
            maxLength={1}
            value={c}
            inputMode="text"
            autoComplete="off"
            onChange={e => handleChar(e.currentTarget.value, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            className="w-[60px] h-[72px] text-center bg-black/40 border-2 border-[rgba(201,168,76,0.3)] rounded-[10px] text-[32px] font-bold font-playfair text-[#c9a84c] outline-none focus:border-[#c9a84c] focus:shadow-[0_0_15px_rgba(201,168,76,0.2)] transition-all"
          />
        ))}
      </div>

      {error && (
        <div className="bg-[rgba(192,57,43,0.15)] border border-[rgba(192,57,43,0.4)] rounded-xl p-4 mb-4 text-[14px] text-[#ff8a7a]">
          {error}
        </div>
      )}

      <Button variant="gold" onClick={handleSearch} disabled={code.length !== 4 || loading}>
        {loading ? '検索中...' : '🔍 &nbsp;ルームを検索'}
      </Button>
      <Button variant="ghost" onClick={onBack} className="mt-2">← 戻る</Button>
    </Layout>
  )
}
