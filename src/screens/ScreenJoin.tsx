import { useRef, useState } from 'react'
import { supabase } from '../hooks/useSupabase'
import { Button } from '../components/Button'
import { Layout, PageTitle, PageSub } from '../components/Layout'
import type { GameRow } from '../types/game'

interface ScreenJoinProps {
  onJoinLobby: (game: GameRow, playerName: string) => Promise<void>
  onJoinAsJudge: (game: GameRow, playerIndex: number) => void
  onJoinAsPlayer: (game: GameRow, playerIndex: number) => void
  onBack: () => void
}

export function ScreenJoin({ onJoinLobby, onJoinAsJudge, onJoinAsPlayer, onBack }: ScreenJoinProps) {
  const [chars, setChars] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [game, setGame] = useState<GameRow | null>(null)
  const [joinName, setJoinName] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  // React の state 更新は非同期バッチのため、Enter 2連打などで
  // joining=false のまま2回目が走る。ref で同期的にガードする。
  const joiningRef = useRef(false)

  const code = chars.join('')

  async function autoSearch(fullCode: string) {
    if (fullCode.length !== 4) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('games')
      .select('*')
      .eq('id', fullCode)
      .single()
    setLoading(false)
    if (err || !data) {
      setError(`ルームが見つかりませんでした。コード「${fullCode}」を確認してね。`)
      return
    }
    setGame(data as GameRow)
  }

  function handleChar(val: string, idx: number) {
    const c = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1)
    const updated = [...chars]
    updated[idx] = c
    setChars(updated)
    if (c && idx < 3) {
      setTimeout(() => inputRefs.current[idx + 1]?.focus(), 0)
    }
    if (c && idx === 3) {
      const fullCode = [...chars.slice(0, 3), c].join('')
      if (fullCode.length === 4) autoSearch(fullCode)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace') {
      if (!chars[idx] && idx > 0) {
        setTimeout(() => inputRefs.current[idx - 1]?.focus(), 0)
      } else if (chars[idx]) {
        const updated = [...chars]
        updated[idx] = ''
        setChars(updated)
      }
    }
    if (e.key === 'Enter' && code.length === 4) autoSearch(code)
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>, idx: number) {
    handleChar((e.target as HTMLInputElement).value, idx)
  }

  async function handleSearch() {
    await autoSearch(code)
  }

  // ─── ロビー待機中の部屋に名前を入力して参加 ───
  if (game && game.phase === 'lobby') {
    async function handleJoinLobby() {
      if (!game || joiningRef.current) return  // 二重呼び出しを ref で即時ブロック
      const name = joinName.trim()
      if (!name) { setError('名前を入力してね'); return }
      joiningRef.current = true  // 同期的にフラグを立てる
      setJoining(true)
      setError(null)
      try {
        await onJoinLobby(game, name)
      } catch {
        setError('参加に失敗しました。もう一度試してね。')
        joiningRef.current = false
        setJoining(false)
      }
    }

    return (
      <Layout>
        <PageTitle>参加する</PageTitle>
        <PageSub>あなたの名前を入力してね</PageSub>

        {/* 現在の参加者プレビュー */}
        <div className="bg-black/25 border border-[rgba(201,168,76,0.15)] rounded-[12px] p-4 mb-5">
          <div className="text-[11px] text-[#c9a84c] tracking-[0.15em] mb-2">現在の参加者 ({game.player_names.length}人)</div>
          <div className="flex flex-wrap gap-2">
            {game.player_names.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-black/30 border border-[rgba(201,168,76,0.2)] rounded-full px-3 py-1 text-[13px] text-[#fdf6e3]"
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: i === 0 ? '#993C1D' : '#534AB7' }}
                >
                  {name.slice(0, 1)}
                </span>
                {name}
                {i === 0 && <span className="text-[#ff8a7a] text-[10px]">H</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <input
            autoFocus
            className="w-full px-4 py-4 bg-black/40 border-2 border-[rgba(201,168,76,0.3)] rounded-[10px] text-[18px] text-[#fdf6e3] outline-none focus:border-[#c9a84c] placeholder-white/25 text-center tracking-wider"
            value={joinName}
            onChange={e => { setJoinName(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleJoinLobby()}
            placeholder="あなたの名前"
            maxLength={10}
          />
        </div>

        {error && (
          <div className="bg-[rgba(192,57,43,0.15)] border border-[rgba(192,57,43,0.4)] rounded-xl p-4 mb-4 text-[14px] text-[#ff8a7a]">
            {error}
          </div>
        )}

        <Button variant="gold" onClick={handleJoinLobby} disabled={joining || !joinName.trim()}>
          {joining ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
              参加中...
            </>
          ) : '📲 入室する'}
        </Button>
        <Button variant="ghost" onClick={() => setGame(null)} className="mt-2">← コード入力に戻る</Button>
      </Layout>
    )
  }

  // ─── 進行中のゲームに再参加（phase が lobby 以外） ───
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

  // ─── コード入力画面 ───
  return (
    <Layout>
      <PageTitle>部屋に参加</PageTitle>
      <PageSub>ホストからもらった4桁のコードを入力してね</PageSub>

      <div className="flex justify-center gap-3 mb-6">
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el: HTMLInputElement | null) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={2}
            value={c}
            onChange={e => handleChar(e.target.value, i)}
            onInput={e => handleInput(e, i)}
            onKeyDown={e => handleKeyDown(e, i)}
            onFocus={e => e.target.select()}
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
        {loading ? '検索中...' : '🔍 ルームを検索'}
      </Button>
      <Button variant="ghost" onClick={onBack} className="mt-2">← 戻る</Button>
    </Layout>
  )
}
