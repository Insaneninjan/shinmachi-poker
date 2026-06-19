import { useGame } from '../hooks/useSupabase'
import { supabase } from '../hooks/useSupabase'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import {
  Layout, RoomCodePanel, PhaseBanner, ProgressBar,
  SuccessPanel, WarningPanel, SectionLabel, BadgeGreen, BadgeGold, GoldDivider,
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

  async function declareWinner(name: string) {
    if (!game) return
    if (!window.confirm(`「${name}」を勝者にしますか？`)) return
    await supabase.from('games').update({ phase: 'winner', winner: name }).eq('id', roomCode)
    onWinnerDeclared({ ...game, phase: 'winner', winner: name })
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
  const readyCount = phase === 'change'
    ? hands.filter(h => h.changed).length
    : showdown.length
  const allReady = readyCount === total && total > 0

  const PHASE_INFO: Record<string, { name: string; desc: string }> = {
    change: { name: 'チェンジフェーズ', desc: '各プレイヤーがカードを交換中' },
    open:   { name: 'オープンフェーズ', desc: '各プレイヤーが役を申告中' },
    judge:  { name: '判定フェーズ', desc: '勝者を決定してください' },
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

      {/* 判定フェーズ */}
      {phase === 'judge' && (
        <>
          <PhaseBanner phase="judge" name="判定フェーズ" desc="勝者を決定してください" />
          <SectionLabel>全員の役</SectionLabel>
          {sortShowdown(showdown).map(s => {
            const ncols = Math.min(s.cards.length, 5)
            return (
              <div
                key={s.playerIndex}
                className="bg-black/35 border border-[rgba(201,168,76,0.25)] rounded-[16px] p-4 mb-4 animate-flip-in"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white overflow-hidden flex-shrink-0"
                    style={{ background: s.cards[0]?.color ?? '#534AB7', border: '2px solid rgba(201,168,76,0.4)' }}
                  >
                    {s.cards[0]?.photo ? <img src={s.cards[0].photo} className="w-full h-full object-cover" alt="" /> : s.player.slice(0, 1)}
                  </div>
                  <span className="text-[15px] font-bold text-[#fdf6e3] flex-1">{s.player}</span>
                  <BadgeGold>P{s.playerIndex + 1}</BadgeGold>
                </div>
                <div className="font-playfair text-[17px] text-[#c9a84c] text-center mb-3 px-2 py-2 bg-[rgba(201,168,76,0.08)] rounded-lg">
                  「{s.yaku}」
                </div>
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${ncols}, 1fr)` }}
                >
                  {s.cards.map((c, ci) => (
                    <Card key={ci} card={c} size="lg" dealIndex={ci} />
                  ))}
                </div>
                <Button
                  variant="gold"
                  onClick={() => declareWinner(s.player)}
                  className="mt-3"
                >
                  👑 この人を勝者にする
                </Button>
              </div>
            )
          })}
        </>
      )}

      <GoldDivider />
      <SectionLabel>全員の手札（確認用）</SectionLabel>
      {hands.map(h => {
        const ready = phase === 'change' ? h.changed : showdown.some(s => s.playerIndex === h.index)
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
              {h.player}
              {ready && <BadgeGreen>{phase === 'change' ? 'チェンジ完了' : 'オープン完了'}</BadgeGreen>}
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
