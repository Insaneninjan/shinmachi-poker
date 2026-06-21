import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { GoldDivider } from '../components/Layout'
import type { GameRow, CardMember, ShowdownEntry } from '../types/game'
import { useNextRound } from '../hooks/useSupabase'

// ─── 進行ドット ────────────────────────────────────────────────────────────
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

// ─── ランク別スタイル定義 ──────────────────────────────────────────────────
function getRankStyle(place: number) {
  if (place === 1) return {
    bg:           'radial-gradient(ellipse at 50% 22%, #2a1500 0%, #0d0600 65%, #000 100%)',
    color:        '#f5d060',
    glowColor:    'rgba(245,208,96,0.75)',
    cardFilter:   'drop-shadow(0 0 12px rgba(201,168,76,0.9)) drop-shadow(0 0 28px rgba(201,168,76,0.5))',
    emoji:        '👑',
    rankLabel:    '優勝',
    placeLabel:   '1位',
    badge:        { bg: 'rgba(201,168,76,0.22)', border: '2px solid rgba(201,168,76,0.75)', color: '#f5d060' },
    avatarBorder: '3px solid #c9a84c',
    avatarShadow: '0 0 0 6px rgba(201,168,76,0.25), 0 0 60px rgba(201,168,76,0.65)',
    yakuShadow:   '0 0 28px rgba(245,208,96,0.85), 0 0 70px rgba(201,168,76,0.4)',
    scoreBg:      'rgba(201,168,76,0.25)',
    scoreBorder:  '2px solid rgba(201,168,76,0.8)',
    medalIcon:    '🥇',
  }
  if (place === 2) return {
    bg:           'radial-gradient(ellipse at 50% 22%, #0e1522 0%, #040710 65%, #000 100%)',
    color:        '#b8cfe8',
    glowColor:    'rgba(184,207,232,0.55)',
    cardFilter:   'drop-shadow(0 0 8px rgba(184,207,232,0.5)) drop-shadow(0 0 20px rgba(184,207,232,0.25))',
    emoji:        '🥈',
    rankLabel:    '2位',
    placeLabel:   '2位',
    badge:        { bg: 'rgba(184,207,232,0.12)', border: '1.5px solid rgba(184,207,232,0.55)', color: '#b8cfe8' },
    avatarBorder: '3px solid rgba(184,207,232,0.65)',
    avatarShadow: '0 0 0 5px rgba(184,207,232,0.12), 0 0 35px rgba(184,207,232,0.4)',
    yakuShadow:   '0 0 20px rgba(184,207,232,0.65)',
    scoreBg:      'rgba(184,207,232,0.12)',
    scoreBorder:  '1.5px solid rgba(184,207,232,0.55)',
    medalIcon:    '🥈',
  }
  if (place === 3) return {
    bg:           'radial-gradient(ellipse at 50% 22%, #1c0f02 0%, #070400 65%, #000 100%)',
    color:        '#cd8840',
    glowColor:    'rgba(205,136,64,0.55)',
    cardFilter:   'drop-shadow(0 0 8px rgba(205,136,64,0.5)) drop-shadow(0 0 20px rgba(205,136,64,0.25))',
    emoji:        '🥉',
    rankLabel:    '3位',
    placeLabel:   '3位',
    badge:        { bg: 'rgba(205,136,64,0.12)', border: '1.5px solid rgba(205,136,64,0.55)', color: '#cd8840' },
    avatarBorder: '3px solid rgba(205,136,64,0.65)',
    avatarShadow: '0 0 0 5px rgba(205,136,64,0.12), 0 0 32px rgba(205,136,64,0.4)',
    yakuShadow:   '0 0 18px rgba(205,136,64,0.6)',
    scoreBg:      'rgba(205,136,64,0.12)',
    scoreBorder:  '1.5px solid rgba(205,136,64,0.55)',
    medalIcon:    '🥉',
  }
  return {
    bg:           'radial-gradient(ellipse at 50% 22%, #080a0e 0%, #020304 65%, #000 100%)',
    color:        'rgba(255,255,255,0.32)',
    glowColor:    'rgba(255,255,255,0.08)',
    cardFilter:   'none',
    emoji:        '',
    rankLabel:    `${place}位`,
    placeLabel:   `${place}位`,
    badge:        { bg: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.32)' },
    avatarBorder: '3px solid rgba(255,255,255,0.2)',
    avatarShadow: '0 0 0 4px rgba(255,255,255,0.04)',
    yakuShadow:   '0 0 12px rgba(201,168,76,0.28)',
    scoreBg:      'rgba(255,255,255,0.07)',
    scoreBorder:  '1px solid rgba(255,255,255,0.18)',
    medalIcon:    `${place}`,
  }
}

// ─── ランク別タイミング ────────────────────────────────────────────────────
function getTimings(place: number) {
  if (place === 1) return { yaku: 700, cards: 1500, score: 2500, done: 3400 }
  if (place <= 3)  return { yaku: 500, cards: 1050, score: 1800, done: 2450 }
  return                 { yaku: 320, cards: 750,  score: 1250, done: 1750 }
}

// ─── 1プレイヤー公開パネル ─────────────────────────────────────────────────
// key={step} で毎回完全リマウント → アニメが必ず最初から再生

type RevealPhase = 'rank' | 'yaku' | 'cards' | 'score' | 'done'

interface PlayerRevealPanelProps {
  entry: ShowdownEntry
  place: number          // 1 = winner, N = last place
  isWinner: boolean
  isLastStep: boolean
  total: number
  current: number
  isJudge: boolean
  onAdvance: () => void
}

function PlayerRevealPanel({
  entry, place, isWinner, isLastStep, total, current, isJudge, onAdvance,
}: PlayerRevealPanelProps) {
  const [phase, setPhase] = useState<RevealPhase>('rank')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const style   = getRankStyle(place)
  const timings = getTimings(place)
  const hasScore = entry.judgeScore !== undefined
  const ncols    = Math.min(entry.cards.length, 5)
  const hidePlayerName = hasScore || isJudge

  const { yaku: tYaku, cards: tCards, score: tScore, done: tDone } = timings
  useEffect(() => {
    timers.current = [
      setTimeout(() => setPhase('yaku'),  tYaku),
      setTimeout(() => setPhase('cards'), tCards),
      setTimeout(() => setPhase('score'), tScore),
      setTimeout(() => setPhase('done'),  tDone),
    ]
    return () => { timers.current.forEach(clearTimeout) }
  }, [tYaku, tCards, tScore, tDone])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: style.bg }}>
      {/* 上位3位：背景グロー演出 */}
      {place <= 3 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% -10%, ${style.glowColor.replace(/[\d.]+\)$/, '0.12)')} 0%, transparent 55%)`,
          }}
        />
      )}
      {/* 優勝のみ：追加の床面グロー */}
      {place === 1 && (
        <div
          className="fixed bottom-0 left-0 right-0 h-64 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(201,168,76,0.18) 0%, transparent 65%)',
          }}
        />
      )}

      <div className="relative flex-1 max-w-[480px] mx-auto px-4 pt-6 pb-4 w-full flex flex-col">
        <ProgressDots total={total} current={current} />

        {/* ① ランクバッジ（マウント直後から表示） */}
        <div className="flex justify-center mb-5 animate-reveal-spotlight">
          <div
            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full"
            style={{
              background: style.badge.bg,
              border: style.badge.border,
              boxShadow: place <= 3
                ? `0 0 30px ${style.glowColor.replace(/[\d.]+\)$/, '0.25)')}, inset 0 0 20px ${style.glowColor.replace(/[\d.]+\)$/, '0.08)')}`
                : 'none',
            }}
          >
            {style.emoji && <span style={{ fontSize: place === 1 ? '22px' : '18px' }}>{style.emoji}</span>}
            <span
              className="font-playfair font-bold tracking-[0.06em]"
              style={{
                fontSize: place === 1 ? '26px' : '20px',
                color: style.color,
                textShadow: place <= 3 ? `0 0 24px ${style.glowColor}` : 'none',
              }}
            >
              {style.rankLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {/* ② アバター */}
          <div
            className="mb-5 animate-reveal-spotlight"
            style={{ borderRadius: '50%', boxShadow: style.avatarShadow }}
          >
            <div
              className="rounded-full flex items-center justify-center font-bold text-white overflow-hidden"
              style={{
                width: place === 1 ? '110px' : '96px',
                height: place === 1 ? '110px' : '96px',
                background: hidePlayerName
                  ? `rgba(0,0,0,0.55)`
                  : (entry.cards[0]?.color ?? '#534AB7'),
                border: style.avatarBorder,
              }}
            >
              {hidePlayerName ? (
                <span
                  className="font-playfair font-bold"
                  style={{
                    fontSize: place === 1 ? '30px' : '24px',
                    color: style.color,
                    textShadow: place <= 3 ? `0 0 16px ${style.glowColor}` : 'none',
                  }}
                >
                  {place}
                </span>
              ) : entry.cards[0]?.photo ? (
                <img src={entry.cards[0].photo} className="w-full h-full object-cover" alt="" />
              ) : (
                <span style={{ fontSize: place === 1 ? '36px' : '28px' }}>
                  {entry.player.slice(0, 1)}
                </span>
              )}
            </div>
          </div>

          {/* プレイヤー名（匿名でない場合） */}
          {!hidePlayerName && (
            <div
              className="font-playfair text-center mb-1 animate-fade-up"
              style={{
                fontSize: place === 1 ? '30px' : '26px',
                color: '#fdf6e3',
                textShadow: '0 2px 14px rgba(0,0,0,0.9)',
              }}
            >
              {entry.player}
            </div>
          )}

          {/* 順位ラベル（匿名時は名前の代わり） */}
          {hidePlayerName && (
            <div
              className="text-[12px] tracking-[0.2em] mb-1 animate-fade-up"
              style={{ color: style.color, opacity: 0.6 }}
            >
              {style.placeLabel}
            </div>
          )}

          {/* ③ 役名（yaku フェーズ以降） */}
          {phase !== 'rank' && (
            <div
              className="font-playfair text-center px-4 animate-yaku-appear mb-8"
              style={{
                fontSize: place === 1 ? '27px' : place <= 3 ? '23px' : '20px',
                color: place <= 3 ? style.color : '#c9a84c',
                textShadow: style.yakuShadow,
                animationDelay: '0.1s',
                lineHeight: 1.35,
                marginTop: hidePlayerName ? '0.75rem' : '0.25rem',
              }}
            >
              「{entry.yaku}」
            </div>
          )}

          {/* ④ カード（cards フェーズ以降） */}
          {(phase === 'cards' || phase === 'score' || phase === 'done') && (
            <div
              className="animate-fade-up w-full"
              style={{ filter: style.cardFilter }}
            >
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

          {/* ⑤ スコア + WINNER バッジ（score フェーズ以降） */}
          {(phase === 'score' || phase === 'done') && (
            <div className="flex flex-wrap justify-center mt-7 gap-3 animate-winner-pop">
              {hasScore && (
                <span
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full font-bold font-playfair"
                  style={{
                    fontSize: place === 1 ? '24px' : '19px',
                    background: style.scoreBg,
                    border: style.scoreBorder,
                    color: style.color,
                    boxShadow: place <= 3
                      ? `0 0 24px ${style.glowColor.replace(/[\d.]+\)$/, '0.35)')}`
                      : 'none',
                  }}
                >
                  {entry.judgeScore}点
                </span>
              )}
              {isWinner && (
                <span
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold animate-winner-pop"
                  style={{
                    fontSize: '16px',
                    background: 'rgba(201,168,76,0.25)',
                    border: '2px solid #c9a84c',
                    color: '#f5d060',
                    boxShadow: '0 0 28px rgba(201,168,76,0.75)',
                    animationDelay: '0.2s',
                  }}
                >
                  👑 WINNER
                </span>
              )}
              {/* スコアなし・勝者の場合のWINNERバッジ */}
              {!hasScore && isWinner && !isWinner && (
                <span
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold"
                  style={{
                    fontSize: '16px',
                    background: 'rgba(201,168,76,0.25)',
                    border: '2px solid #c9a84c',
                    color: '#f5d060',
                    boxShadow: '0 0 28px rgba(201,168,76,0.75)',
                  }}
                >
                  👑 WINNER
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ⑥ ボタンエリア（done フェーズ） */}
      {phase === 'done' && (
        <div className="relative max-w-[480px] mx-auto px-4 pb-10 pt-6 w-full mt-auto animate-fade-up">
          <Button variant="gold" onClick={onAdvance}>
            {isLastStep
              ? '👑 勝者発表へ！'
              : `${place - 1}位を発表 →`}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── メインコンポーネント ──────────────────────────────────────────────────
interface ScreenShowdownProps {
  game: GameRow
  isJudge: boolean
  members: CardMember[]
  onNextRound: () => void
}

export function ScreenShowdown({ game, isJudge, members, onNextRound }: ScreenShowdownProps) {
  const { startNextRound } = useNextRound()

  // judgeScore がある場合は昇順（最下位から発表）、なければ提出順
  const hasJudgeScores = (game.showdown ?? []).some(e => e.judgeScore !== undefined)
  const entries: ShowdownEntry[] = hasJudgeScores
    ? [...(game.showdown ?? [])].sort((a, b) => (a.judgeScore ?? 0) - (b.judgeScore ?? 0))
    : [...(game.showdown ?? [])]
  const N = entries.length

  // -1 = イントロ / 0..N-1 = プレイヤー公開 / N = 勝者発表
  const [step, setStep] = useState(-1)

  const nextJudgeIndex = (game.judge_index + 1) % game.player_names.length
  const nextJudgeName  = game.player_names[nextJudgeIndex]

  function advance() { setStep(prev => prev + 1) }

  async function handleNextRound() {
    await startNextRound(game, members)
    onNextRound()
  }

  // ══════════════════════════════════════════════════════════════
  // イントロスクリーン
  // ══════════════════════════════════════════════════════════════
  if (step === -1) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #1a0505 0%, #050000 100%)' }}
      >
        <div className="text-center px-8 animate-page-enter w-full max-w-[480px]">
          {/* 装飾ライン */}
          <div className="flex items-center gap-3 mb-8 opacity-25">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c)' }} />
            <span className="text-[#c9a84c] text-[10px] tracking-[0.35em]">POKER</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #c9a84c, transparent)' }} />
          </div>

          {/* SHOWDOWN タイトル */}
          <div
            className="font-playfair text-[64px] leading-[0.95] text-[#c9a84c] tracking-[0.05em]"
            style={{ textShadow: '0 0 40px rgba(201,168,76,0.75), 0 0 100px rgba(201,168,76,0.3)' }}
          >
            SHOW
          </div>
          <div
            className="font-playfair text-[64px] leading-[0.95] text-[#c9a84c] tracking-[0.05em] mb-8"
            style={{ textShadow: '0 0 40px rgba(201,168,76,0.75), 0 0 100px rgba(201,168,76,0.3)' }}
          >
            DOWN
          </div>

          <p className="text-[15px] text-white/45 mb-2 tracking-[0.12em]">{N} 人のカードが揃いました</p>

          {/* ランク順プレビュー */}
          {hasJudgeScores && N > 1 && (
            <div className="flex items-center justify-center gap-1.5 mb-8 flex-wrap">
              {Array.from({ length: N }, (_, i) => {
                const placeNum = N - i
                const s = getRankStyle(placeNum)
                return (
                  <span key={i} className="flex items-center gap-1">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                      style={{
                        background: s.badge.bg,
                        border: s.badge.border,
                        color: s.color,
                      }}
                    >
                      {s.emoji || placeNum} {placeNum}位
                    </span>
                    {i < N - 1 && <span className="text-white/20 text-[10px]">→</span>}
                  </span>
                )
              })}
            </div>
          )}

          {!hasJudgeScores && (
            <p className="text-[12px] text-white/22 mb-12">1人ずつ順番に公開します</p>
          )}

          <Button variant="gold" onClick={advance}>▶ 公開スタート！</Button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // プレイヤー公開（1人ずつ）
  // place = N - step（1=winner, N=最下位）
  // ══════════════════════════════════════════════════════════════
  if (step < N) {
    const place = N - step
    return (
      <PlayerRevealPanel
        key={step}
        entry={entries[step]}
        place={place}
        isWinner={entries[step].player === game.winner}
        isLastStep={step === N - 1}
        total={N}
        current={step}
        isJudge={isJudge}
        onAdvance={advance}
      />
    )
  }

  // ══════════════════════════════════════════════════════════════
  // 勝者発表スクリーン
  // ══════════════════════════════════════════════════════════════
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
        <div className="text-[16px] text-white/38 mb-8 animate-fade-up" style={{ animationDelay: '0.55s' }}>
          の勝利！
        </div>

        {/* 今回の採点ランキング */}
        {hasJudgeScores && (
          <div className="w-full mb-6 animate-fade-up" style={{ animationDelay: '0.65s' }}>
            <div className="text-[10px] text-white/35 tracking-[0.25em] text-center mb-3">— 今回の採点 —</div>
            <div className="space-y-2">
              {[...entries]
                .sort((a, b) => (b.judgeScore ?? 0) - (a.judgeScore ?? 0))
                .map((e, idx) => {
                  const placeNum = idx + 1
                  const rankStyle = getRankStyle(placeNum)
                  const isEntryWinner = e.player === game.winner
                  return (
                    <div
                      key={e.playerIndex}
                      className="flex items-center gap-3 rounded-[12px] px-3 py-2.5"
                      style={{
                        background: placeNum <= 3
                          ? rankStyle.badge.bg
                          : isEntryWinner ? 'rgba(201,168,76,0.12)' : 'rgba(0,0,0,0.3)',
                        border: placeNum <= 3
                          ? rankStyle.badge.border
                          : isEntryWinner ? '1.5px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      {/* メダルバッジ */}
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                        style={{
                          background: rankStyle.badge.bg,
                          border: rankStyle.badge.border,
                          color: rankStyle.color,
                        }}
                      >
                        {placeNum <= 3 ? rankStyle.medalIcon : placeNum}
                      </span>
                      <span
                        className="text-[14px] flex-1 font-bold"
                        style={{ color: placeNum <= 3 ? rankStyle.color : '#fdf6e3' }}
                      >
                        {isJudge ? `Player #${e.playerIndex + 1}` : e.player}
                      </span>
                      {isEntryWinner && <span className="text-[12px]">👑</span>}
                      <span
                        className="text-[22px] font-bold font-playfair"
                        style={{ color: placeNum <= 3 ? rankStyle.color : 'rgba(255,255,255,0.4)' }}
                      >
                        {e.judgeScore ?? 0}
                      </span>
                      <span className="text-[11px] text-white/30">点</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* 累計スコアボード */}
        {game.scores && Object.keys(game.scores).length > 0 && (
          <div className="w-full mb-6 animate-fade-up" style={{ animationDelay: '0.7s' }}>
            <div className="text-[10px] text-white/35 tracking-[0.25em] text-center mb-3">— SCORE —</div>
            <div className="space-y-2">
              {game.player_names
                .map(name => ({ name, score: game.scores?.[name] ?? 0 }))
                .sort((a, b) => b.score - a.score)
                .map(({ name, score }, i) => {
                  const isWinnerRow = name === game.winner
                  return (
                    <div
                      key={name}
                      className="flex items-center gap-3 rounded-[12px] px-4 py-2.5"
                      style={{
                        background: isWinnerRow ? 'rgba(201,168,76,0.12)' : 'rgba(0,0,0,0.3)',
                        border: isWinnerRow ? '1.5px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <span className="text-[12px] text-white/30 w-4 text-center">{i + 1}</span>
                      <span className="text-[14px] text-[#fdf6e3] flex-1 font-bold">{name}</span>
                      {isWinnerRow && (
                        <span className="text-[10px] text-[#c9a84c] border border-[rgba(201,168,76,0.4)] rounded-full px-2 py-0.5">
                          +1 👑
                        </span>
                      )}
                      <span
                        className="text-[22px] font-bold font-playfair"
                        style={{ color: score > 0 ? '#c9a84c' : 'rgba(255,255,255,0.2)' }}
                      >
                        {score}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* 次のジャッジ */}
        <div
          className="w-full bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-[14px] p-5 text-center mb-6 animate-fade-up"
          style={{ animationDelay: '0.95s' }}
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
