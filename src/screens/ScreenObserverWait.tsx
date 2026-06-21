import { Layout, RoomCodePanel } from '../components/Layout'
import { Button } from '../components/Button'
import type { GameRow } from '../types/game'

const PHASE_LABEL: Record<string, string> = {
  change:  'チェンジフェーズ（1回目）',
  change2: 'チェンジフェーズ（2回目）',
  open:    'オープンフェーズ',
  judge:   '採点フェーズ',
  winner:  '結果発表',
  lobby:   'ロビー',
}

interface ScreenObserverWaitProps {
  roomCode: string
  game: GameRow | null
}

export function ScreenObserverWait({ roomCode, game }: ScreenObserverWaitProps) {
  const phase = game?.phase ?? 'lobby'
  const phaseLabel = PHASE_LABEL[phase] ?? phase

  return (
    <Layout>
      <div className="flex items-center justify-between pt-4 mb-3">
        <h1 className="font-playfair text-[22px] text-[#fdf6e3]">観戦中 👁</h1>
        <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-bold bg-black/30 text-white/40 border border-white/10">
          OBSERVER
        </span>
      </div>

      <RoomCodePanel code={roomCode} />

      <div className="flex flex-col items-center justify-center py-14 gap-6">
        <div
          className="w-14 h-14 rounded-full border-2 border-[rgba(201,168,76,0.3)] border-t-[#c9a84c] animate-spin"
          style={{ animationDuration: '1.6s' }}
        />
        <div className="text-center">
          <p className="text-[16px] text-[#e8cc80] font-bold mb-2">ショーダウンを待っています...</p>
          <p className="text-[13px] text-white/35 mb-4">ゲームが終わると自動的に画面が切り替わります</p>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px]"
            style={{
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: 'rgba(201,168,76,0.7)',
            }}
          >
            現在のフェーズ：{phaseLabel}
          </div>
        </div>
      </div>

      <Button variant="ghost" onClick={() => window.location.reload()}>← トップへ戻る</Button>
    </Layout>
  )
}
