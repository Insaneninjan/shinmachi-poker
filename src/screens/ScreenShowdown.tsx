import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { GoldDivider } from '../components/Layout'
import type { GameRow, CardMember, ShowdownEntry } from '../types/game'
import { useNextRound, supabase } from '../hooks/useSupabase'

// ─── 進行ドット ───────────────────────────────────────────────────
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center gap-2.5 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:      i === current ? '10px' : '8px',
            height:     i === current ? '10px' : '8px',
            background: i < current   ? '#c9a84c'
                      : i === current ? '#fdf6e3'
                      : 'rgba(255,255,255,0.15)',
            boxShadow:  i === current ? '0 0 8px rgba(255,255,255,0.55)' : undefined,
            transform:  i === current ? 'scale(1.25)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}

// ─── 1プレイヤー公開パネル ────────────────────────────────────────
// key={step} で毎回完全リマウント → アニメが必ず最初から再生
// useEffect で JS タイマーを使い段階的にコンテンツをマウント
//    mount → 'cards'（+500ms） → 'done'（+1350ms）

type RevealPhase = 'content' | 'cards' | 'done'

interface PlayerRevealPanelProps {
  entry: ShowdownEntry
  isWinner: boolean
  isLastStep: boolean
  isJudge: boolean
  total: number
  current: number
  onAdvance: () => void
}

function PlayerRevealPanel({
  entry, isWinner, isLastStep, isJudge, total, current, onAdvance,
}: PlayerRevealPanelProps) {
  const [phase, setPhase] = useState<RevealPhase>('content')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    timers.current = [
      setTimeout(() => setPhase('cards'),  500),
      setTimeout(() => setPhase('done'),  1350),
    ]
    return () => { timers.current.forEach(clearTimeout) }
  }, [])

  const ncols = Math.min(entry.cards.length, 5)

  const bg = isWinner
    ? 'radial-gradient(ellipse at 50% 30%, #1c1000 0%, #060400 65%, #000 100%)'
    : 'radial-gradient(ellipse at 50% 30%, #07090e 0%, #020304 65%, #000 100%)'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg }}>
      <div className="flex-1 max-w-[480px] mx-auto px-4 pt-6 pb-4 w-full flex flex-col">
        <ProgressDots total={total} current={current} />

        {/* ① アバター + 名前 + 役名（マウント直後） */}
        <div className="flex flex-col items-center">
          {/* アバター */}
          <div
            className="mb-4 animate-reveal-spotlight"
            style={{
              borderRadius: '50%',
              boxShadow: isWinner
                ? '0 0 0 6px rgba(201,168,76,0.3), 0 0 60px rgba(201,168,76,0.6)'
                : '0 0 0 5px rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-[32px] font-bold text-white overflow-hidden"
              style={{
                background: entry.cards[0]?.color ?? '#534AB7',
                border: isWinner ? '3px solid #c9a84c' : '3px solid rgba(255,255,255,0.2)',
              }}
            >
              {entry.cards[0]?.photo
                ? <img src={entry.cards[0].photo} className="w-full h-full object-cover" alt="" />
                : entry.player.slice(0, 1)}
            </div>
          </div>

          {/* 名前 */}
          <div className="font-playfair text-[30px] text-white text-center mb-1 animate-fade-up">
            {entry.player}
          </div>

          {/* 役名 */}
          <div
            className="font-playfair text-[22px] text-[#c9a84c] text-center mb-8 px-4 animate-yaku-appear"
            style={{
              textShadow: isWinner
                ? '0 0 24px rgba(201,168,76,0.75), 0 0 50px rgba(201,168,76,0.4)'
                : '0 0 16px rgba(201,168,76,0.4)',
              animationDelay: '0.15s',
            }}
          >
            「{entry.yaku}」
          </div>

          {/* ② カード（500ms後にマウント） */}
          {(phase === 'cards' || phase === 'done') && (
            <div className="animate-fade-up w-full">
              {entry.groups && entry.groups.length > 0 ? (
                <div className="space-y-5">
                  {entry.groups.map((g, gi) => (
                    <div key={gi} className="flex flex-col items-center">
                      <div className="text-[10px] text-white/30 tracking-[0.18em] uppercase mb-2">
                        {g.label}
                      </div>
                      <div
                        className="grid gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${g.cards.length}, 1fr)`,
                          width: `${g.cards.length * 68}px`,
                        }}
                      >
                        {g.cards.map((c, ci) => (
                          <Card key={ci} card={c} size="lg" selected dealIndex={gi * 5 + ci} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="grid gap-2 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${ncols}, 1fr)`,
                    maxWidth: `${ncols * 68}px`,
                  }}
                >
                  {entry.cards.map((c, ci) => (
                    <Card key={ci} card={c} size="lg" selected dealIndex={ci} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ③ WINNER バッジ（1350ms後にマウント） */}
          {phase === 'done' && isWinner && (
            <div className="flex justify-center mt-5 animate-winner-pop">
              <span
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[14px] font-bold"
                style={{
                  background: 'rgba(201,168,76,0.2)',
                  border: '1.5px solid #c9a84c',
                  color: '#c9a84c',
                  boxShadow: '0 0 16px rgba(201,168,76,0.5)',
                }}
              >
                👑 WINNER
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ④ ボタンエリア（1350ms後にマウント） */}
      {phase === 'done' && (
        <div className="max-w-[480px] mx-auto px-4 pb-10 pt-6 w-full mt-auto animate-fade-up">
          {isJudge ? (
            <Button variant="gold" onClick={onAdvance}>
              {isLastStep ? '👑 勝者発表！' : '次のプレイヤーへ →'}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-white/30 text-[13px]">
              <span
                className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin"
                style={{ animationDuration: '1.2s' }}
              />
              ジャッジが次を選択中...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────────────────
interface ScreenShowdownProps {
  game: GameRow
  isJudge: boolean
  members: CardMember[]
  onNextRound: () => void
}

export function ScreenShowdown({ game, isJudge, members, onNextRound }: ScreenShowdownProps) {
  const { startNextRound } = useNextRound()

  // 提出順（配列順）で表示
  const entries: ShowdownEntry[] = [...(game.showdown ?? [])]
  const N = entries.length

  // -1 = イントロ / 0..N-1 = プレイヤー公開 / N = 勝者発表
  const [step, setStep] = useState(-1)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const nextJudgeIndex = (game.judge_index + 1) % game.player_names.length
  const nextJudgeName  = game.player_names[nextJudgeIndex]

  // ─── Supabase broadcast で全クライアントの step を同期 ───────────
  useEffect(() => {
    const channel = supabase.channel(`showdown:${game.id}`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'step' }, ({ payload }: { payload: { step: number } }) => {
        setStep(payload.step)
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [game.id])

  // ─── ジャッジが進めるとき：自分の step 更新 + 全員にブロードキャスト ──
  async function advance() {
    const newStep = step + 1
    setStep(newStep)
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'step',
      payload: { step: newStep },
    })
  }

  async function handleNextRound() {
    await startNextRound(game, members)
    onNextRound()
  }

  // ══════════════════════════════════════════════
  // イントロスクリーン
  // ══════════════════════════════════════════════
  if (step === -1) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #050000 100%)' }}
      >
        <div className="text-center px-8 animate-page-enter">
          <div className="flex items-center gap-3 mb-8 opacity-25">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c)' }} />
            <span className="text-[#c9a84c] text-[10px] tracking-[0.35em]">POKER</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #c9a84c, transparent)' }} />
          </div>
          <div
            className="font-playfair text-[60px] leading-[1.0] text-[#c9a84c] tracking-[0.05em]"
            style={{ textShadow: '0 0 40px rgba(201,168,76,0.7), 0 0 100px rgba(201,168,76,0.3)' }}
          >
            SHOW
          </div>
          <div
            className="font-playfair text-[60px] leading-[1.0] text-[#c9a84c] tracking-[0.05em] mb-8"
            style={{ textShadow: '0 0 40px rgba(201,168,76,0.7), 0 0 100px rgba(201,168,76,0.3)' }}
          >
            DOWN
          </div>
          <p className="text-[15px] text-white/40 mb-1 tracking-[0.12em]">{N} 人のカードが揃いました</p>
          <p className="text-[12px] text-white/22 mb-12">1人ずつ順番に公開します</p>

          {isJudge ? (
            <Button variant="gold" onClick={advance}>▶ 公開スタート！</Button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 rounded-full border-2 border-[rgba(201,168,76,0.3)] border-t-[#c9a84c] animate-spin"
                style={{ animationDuration: '1.4s' }}
              />
              <p className="text-[13px] text-white/35">ジャッジが公開を始めるまで待ってください</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════
  // プレイヤー公開（1人ずつ）
  // key={step} → step が変わるたびに完全リマウント
  // ══════════════════════════════════════════════
  if (step < N) {
    return (
      <PlayerRevealPanel
        key={step}
        entry={entries[step]}
        isWinner={entries[step].player === game.winner}
        isLastStep={step === N - 1}
        isJudge={isJudge}
        total={N}
        current={step}
        onAdvance={advance}
      />
    )
  }

  // ══════════════════════════════════════════════
  // 勝者発表スクリーン
  // ══════════════════════════════════════════════
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 35%, #1e1000 0%, #080400 65%, #000 100%)' }}
    >
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-80 h-80 rounded-full animate-glow-pulse"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.2) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative flex-1 max-w-[480px] mx-auto px-6 pt-16 pb-8 flex flex-col items-center justify-center w-full">
        <div className="text-[76px] mb-3 animate-winner-pop" style={{ animationDelay: '0.05s' }}>👑</div>
        <div
          className="text-[11px] font-bold tracking-[0.4em] mb-3 animate-fade-up"
          style={{ color: '#c9a84c', animationDelay: '0.35s' }}
        >
          WINNER
        </div>
        <div
          className="font-playfair text-[42px] text-[#c9a84c] text-center animate-winner-pop mb-2"
          style={{
            textShadow: '0 0 32px rgba(201,168,76,0.9), 0 0 70px rgba(201,168,76,0.45)',
            animationDelay: '0.15s',
          }}
        >
          {game.winner}
        </div>
        <div className="text-[16px] text-white/38 mb-10 animate-fade-up" style={{ animationDelay: '0.55s' }}>
          の勝利！
        </div>

        <div
          className="w-full bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-[14px] p-5 text-center mb-6 animate-fade-up"
          style={{ animationDelay: '0.85s' }}
        >
          <div className="text-[11px] text-[#ff8a7a] tracking-[0.15em] font-bold mb-2">— 次のジャッジ —</div>
          <div className="font-playfair text-[24px] text-[#fdf6e3]">{nextJudgeName}</div>
        </div>

        <div className="w-full animate-fade-up" style={{ animationDelay: '1.1s' }}>
          <GoldDivider />
          {isJudge ? (
            <Button variant="gold" onClick={handleNextRound}>▶ 次のゲームへ</Button>
          ) : (
            <div className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.25)] rounded-[10px] px-4 py-3 text-[13px] text-white/60 text-center mb-4">
              ジャッジが次のゲームを開始するまで待ってね
            </div>
          )}
          <Button variant="ghost" onClick={() => window.location.reload()} className="mt-2">
            ← トップへ
          </Button>
        </div>
      </div>
    </div>
  )
}
