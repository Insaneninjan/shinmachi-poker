import { useState } from 'react'
import { useGame } from '../hooks/useSupabase'
import { supabase } from '../hooks/useSupabase'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import {
  Layout, RoomCodePanel, PhaseBanner, ProgressBar,
  SuccessPanel, WarningPanel, SectionLabel, BadgeGreen, GoldDivider,
} from '../components/Layout'
import { sortShowdown } from '../utils/gameLogic'
import type { CardMember, GameRow } from '../types/game'

interface ScreenHostProps {
  roomCode: string
  myPlayerIndex: number
  members: CardMember[]
  onWinnerDeclared: (game: GameRow) => void
}

export function ScreenHost({ roomCode, myPlayerIndex, members, onWinnerDeclared }: ScreenHostProps) {
  const { game, error } = useGame({
    roomCode,
    myPlayerIndex,
    isJudge: true,
    members,
  })

  const [judgeScores, setJudgeScores] = useState<Record<number, number>>({})
  const [confirming, setConfirming] = useState(false)

  async function confirmScores() {
    if (!game || confirming) return
    setConfirming(true)
    try {
      const updatedShowdown = game.showdown.map(s => ({
        ...s,
        judgeScore: judgeScores[s.playerIndex] ?? 0,
      }))
      const winner = updatedShowdown.reduce((best, s) =>
        (s.judgeScore ?? 0) > (best.judgeScore ?? 0) ? s : best
      ).player
      const prevScores = game.scores ?? {}
      const newScores = { ...prevScores, [winner]: (prevScores[winner] ?? 0) + 1 }
      await supabase.from('games').update({
        phase: 'winner',
        winner,
        showdown: updatedShowdown,
        scores: newScores,
      }).eq('id', roomCode)
      onWinnerDeclared({ ...game, phase: 'winner', winner, showdown: updatedShowdown, scores: newScores })
    } finally {
      setConfirming(false)
    }
  }

  if (!game) return (
    <Layout>
      <div className="text-center py-20 text-white/50">
        {error ? `エラー: ${error}` : '読み込み中...'}
      </div>
    </Layout>
  )

  const { phase, hands = [], showdown = [], player_names = [], judge_index } = game
  const judgeName = player_names[judge_index]
  const total = hands.length
  const readyCount = (phase === 'change' || phase === 'change2')
    ? hands.filter(h => h.changed).length
    : showdown.length
  const allReady = readyCount === total && total > 0

  const PHASE_INFO: Record<string, { name: string; desc: string }> = {
    change:  { name: 'チェンジフェーズ（1回目）', desc: '各プレイヤーがカードを交換中' },
    change2: { name: 'チェンジフェーズ（2回目）', desc: '各プレイヤーが2回目のチェンジ中' },
    open:    { name: 'オープンフェーズ', desc: '各プレイヤーが役を申告中' },
    judge:   { name: '判定フェーズ', desc: '勝者を決定してください' },
  }
  const pi = PHASE_INFO[phase] ?? PHASE_INFO.change

  return (
    <Layout>
      <div className="flex items-center justify-between pt-4 mb-3">
        <h1 className="font-playfair text-[22px] text-[#fdf6e3]">ジャッジ画面 ⚖️</h1>
        <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-bold bg-[rgba(192,57,43,0.2)] text-[#ff8a7a] border border-[rgba(192,57,43,0.4)]">
          ⚖ {judgeName}
        </span>
      </div>

      <RoomCodePanel code={roomCode} />

      {phase !== 'judge' && (
        <>
          <PhaseBanner phase={phase} name={pi.name} desc={pi.desc} />
          <ProgressBar current={readyCount} total={total} />
          {allReady
            ? <SuccessPanel>✅ 全員完了！次のフェーズに自動で進みます...</SuccessPanel>
            : <WarningPanel>全員が完了するまで待ってね</WarningPanel>
          }
        </>
      )}

      {/* 採点フェーズ */}
      {phase === 'judge' && (
        <>
          <PhaseBanner phase="judge" name="採点フェーズ" desc="全員に1〜10点を付けよう（匿名表示）" />
          <SectionLabel>全員の役</SectionLabel>
          {sortShowdown(showdown).map((s, idx) => {
            const ncols = Math.min(s.cards.length, 5)
            const score = judgeScores[s.playerIndex]
            return (
              <div
                key={s.playerIndex}
                className="bg-black/35 border border-[rgba(201,168,76,0.25)] rounded-[16px] p-4 mb-4 overflow-hidden animate-flip-in"
              >
                {/* 匿名ヘッダー（プレイヤー名は非表示） */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)' }}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-[15px] font-bold text-white/40 flex-1">提出者 #{idx + 1}</span>
                  {score !== undefined && (
                    <span className="text-[18px] font-bold font-playfair" style={{ color: '#c9a84c' }}>
                      {score}点
                    </span>
                  )}
                </div>

                {/* 役名 */}
                <div className="font-playfair text-[17px] text-[#c9a84c] text-center mb-3 px-2 py-2 bg-[rgba(201,168,76,0.08)] rounded-lg">
                  「{s.yaku}」
                </div>

                {/* カード */}
                {s.groups && s.groups.length > 0 ? (
                  <div className="space-y-3 mb-3">
                    {s.groups.map((g, gi) => (
                      <div key={gi} className="flex flex-col items-center">
                        <div className="text-[10px] text-white/30 tracking-[0.18em] uppercase mb-1">{g.label}</div>
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${g.cards.length}, 1fr)` }}>
                          {g.cards.map((c, ci) => <Card key={ci} card={c} size="lg" dealIndex={gi * 5 + ci} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-1 mb-3" style={{ gridTemplateColumns: `repeat(${ncols}, 1fr)` }}>
                    {s.cards.map((c, ci) => <Card key={ci} card={c} size="lg" dealIndex={ci} />)}
                  </div>
                )}

                {/* 1〜10点ボタン */}
                <div className="mt-2">
                  <div className="text-[11px] text-white/40 tracking-widest text-center mb-2">点数を選ぼう</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                      const selected = score === n
                      return (
                        <button
                          key={n}
                          onClick={() => setJudgeScores(prev => ({ ...prev, [s.playerIndex]: n }))}
                          className="py-2 rounded-lg text-[14px] font-bold transition-all"
                          style={{
                            background: selected ? '#c9a84c' : 'rgba(201,168,76,0.08)',
                            border: selected ? '2px solid #c9a84c' : '1.5px solid rgba(201,168,76,0.25)',
                            color: selected ? '#000' : 'rgba(255,255,255,0.6)',
                            boxShadow: selected ? '0 0 10px rgba(201,168,76,0.5)' : 'none',
                          }}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}

          {/* 全員採点済みで確定ボタン表示 */}
          {showdown.length > 0 && Object.keys(judgeScores).length >= showdown.length && (
            <Button variant="gold" onClick={confirmScores} disabled={confirming}>
              {confirming ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                  確定中...
                </>
              ) : '✓ 採点を確定する'}
            </Button>
          )}
        </>
      )}

      <GoldDivider />
      <SectionLabel>全員の手札（確認用）</SectionLabel>
      {hands.map(h => {
        const ready = (phase === 'change' || phase === 'change2') ? h.changed : showdown.some(s => s.playerIndex === h.index)
        return (
          <div key={h.index} className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-bold text-white/70">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: ready ? '#4ade80' : 'rgba(255,255,255,0.15)',
                  boxShadow: ready ? '0 0 6px #4ade80' : 'none',
                }}
              />
              <span className="text-white/35">Player #{h.index + 1}</span>
              {ready && <BadgeGreen>{(phase === 'change' || phase === 'change2') ? 'チェンジ完了' : 'オープン完了'}</BadgeGreen>}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {h.cards.map((c, ci) => <Card key={ci} card={c} size="sm" dealIndex={ci} />)}
            </div>
          </div>
        )
      })}
    </Layout>
  )
}
