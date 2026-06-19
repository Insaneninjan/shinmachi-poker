import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Layout, GoldDivider, SectionLabel } from '../components/Layout'
import { sortShowdown } from '../utils/gameLogic'
import type { GameRow, CardMember } from '../types/game'
import { useNextRound } from '../hooks/useSupabase'

interface ScreenShowdownProps {
  game: GameRow
  isJudge: boolean
  members: CardMember[]
  onNextRound: () => void
}

export function ScreenShowdown({ game, isJudge, members, onNextRound }: ScreenShowdownProps) {
  const { startNextRound } = useNextRound()
  const sorted = sortShowdown(Array.isArray(game.showdown) ? game.showdown : [])
  const nextJudgeIndex = (game.judge_index + 1) % game.player_names.length
  const nextJudgeName = game.player_names[nextJudgeIndex]

  async function handleNextRound() {
    await startNextRound(game, members)
    onNextRound()
  }

  return (
    <Layout>
      {/* 勝者発表 */}
      <div className="text-center py-8 animate-winner-pop" style={{ animationDelay: '0.2s' }}>
        <span className="text-[56px] block mb-2">👑</span>
        <div
          className="font-playfair text-[32px] text-[#c9a84c]"
          style={{ textShadow: '0 0 20px rgba(201,168,76,0.6)' }}
        >
          {game.winner}
        </div>
        <div className="text-[14px] text-white/50 mt-1">の勝利！</div>
      </div>

      {/* 次のジャッジ */}
      <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-[14px] p-5 text-center mb-6">
        <div className="text-[11px] text-[#ff8a7a] tracking-[0.15em] font-bold mb-2">— 次のジャッジ —</div>
        <div className="font-playfair text-[24px] text-[#fdf6e3]">{nextJudgeName}</div>
      </div>

      {/* 全員のオープン結果 */}
      <SectionLabel>全員の役</SectionLabel>
      {sorted.map((s, idx) => {
        const ncols = Math.min(s.cards.length, 5)
        const isWinner = s.player === game.winner
        return (
          <div
            key={s.playerIndex}
            className={`rounded-[16px] p-4 mb-4 border overflow-hidden animate-flip-in ${
              isWinner
                ? 'bg-[rgba(201,168,76,0.08)] border-[#c9a84c] shadow-[0_0_20px_rgba(201,168,76,0.3)]'
                : 'bg-black/35 border-[rgba(201,168,76,0.25)]'
            }`}
            style={{ animationDelay: `${idx * 0.12}s` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold text-white overflow-hidden"
                style={{ background: s.cards[0]?.color ?? '#534AB7', border: '2px solid rgba(201,168,76,0.4)' }}
              >
                {s.cards[0]?.photo ? <img src={s.cards[0].photo} className="w-full h-full object-cover" alt="" /> : s.player.slice(0, 1)}
              </div>
              <span className="text-[15px] font-bold text-[#fdf6e3] flex-1">{s.player}</span>
              {isWinner && <span className="text-[20px]">👑</span>}
            </div>
            <div className="font-playfair text-[17px] text-[#c9a84c] text-center mb-3 px-2 py-2 bg-[rgba(201,168,76,0.08)] rounded-lg">
              「{s.yaku}」
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ncols}, 1fr)` }}>
              {s.cards.map((c, ci) => <Card key={ci} card={c} size="lg" dealIndex={ci} />)}
            </div>
          </div>
        )
      })}

      <GoldDivider />
      {isJudge ? (
        <Button variant="gold" onClick={handleNextRound}>▶ 次のゲームへ</Button>
      ) : (
        <div className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.25)] rounded-[10px] px-4 py-3 text-[13px] text-white/60 text-center mb-4">
          ジャッジが次のゲームを開始するまで待ってね
        </div>
      )}
      <Button variant="ghost" onClick={() => window.location.reload()}>← トップへ</Button>
    </Layout>
  )
}
