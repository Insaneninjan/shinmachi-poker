import { useState, useEffect } from 'react'
import { useGame, supabase } from '../hooks/useSupabase'
import { Button } from '../components/Button'
import { Layout, RoomCodePanel, SectionLabel, GoldDivider } from '../components/Layout'
import { shuffleArray } from '../utils/gameLogic'
import type { CardMember, GameRow, MyRole, PlayerHand } from '../types/game'

interface ScreenLobbyProps {
  roomCode: string
  myPlayerIndex: number
  isHost: boolean
  members: CardMember[]
  onGameStarted: (game: GameRow, myRole: MyRole) => void
}

// ─── ロール定義 ──────────────────────────────────────────────────────────────
const ROLES: { value: 'judge' | 'player' | 'observer'; label: string; icon: string }[] = [
  { value: 'judge',    label: 'ジャッジ',   icon: '⚖️' },
  { value: 'player',   label: 'プレイヤー', icon: '🎮' },
  { value: 'observer', label: '観戦',       icon: '👁' },
]

const ROLE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  judge:    { bg: 'rgba(192,57,43,0.2)',   border: 'rgba(192,57,43,0.5)',   color: '#ff8a7a' },
  player:   { bg: 'rgba(83,74,183,0.2)',   border: 'rgba(83,74,183,0.5)',   color: '#a89cf7' },
  observer: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.4)' },
}

function getEffectiveRole(
  name: string,
  index: number,
  lobbyRoles: Record<string, 'judge' | 'player' | 'observer'>,
): 'judge' | 'player' | 'observer' {
  return lobbyRoles[name] ?? (index === 0 ? 'judge' : 'player')
}

// ─── ロールバッジ ────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: 'judge' | 'player' | 'observer' }) {
  const s = ROLE_STYLE[role]
  const r = ROLES.find(r => r.value === role)!
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[3px] rounded text-[11px] font-bold flex-shrink-0"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {r.icon} {r.label}
    </span>
  )
}

export function ScreenLobby({ roomCode, myPlayerIndex, isHost, members, onGameStarted }: ScreenLobbyProps) {
  const { game } = useGame({ roomCode, myPlayerIndex, isJudge: false, members })
  const [starting, setStarting] = useState(false)
  const [changingRole, setChangingRole] = useState(false)

  const playerNames = game?.player_names ?? []
  const lobbyRoles = (game?.lobby_roles ?? {}) as Record<string, 'judge' | 'player' | 'observer'>

  // ロールを考慮したゲーム開始可否チェック
  const judgeCount  = playerNames.filter((n, i) => getEffectiveRole(n, i, lobbyRoles) === 'judge').length
  const playerCount = playerNames.filter((n, i) => getEffectiveRole(n, i, lobbyRoles) === 'player').length
  const canStart = judgeCount === 1 && playerCount >= 1

  // ── フェーズが change になったら全員でゲーム画面へ遷移 ──
  useEffect(() => {
    if (!game || game.phase !== 'change') return
    const myName = game.player_names[myPlayerIndex]
    const myRole = getEffectiveRole(myName, myPlayerIndex, game.lobby_roles ?? {})
    onGameStarted(game, myRole)
  }, [game?.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 自分のロールを変更 ──
  async function handleRoleChange(newRole: 'judge' | 'player' | 'observer') {
    if (!game || changingRole) return
    const myName = game.player_names[myPlayerIndex]
    const currentRole = getEffectiveRole(myName, myPlayerIndex, lobbyRoles)
    if (currentRole === newRole) return

    setChangingRole(true)
    // judge を選んだ場合、今のジャッジを player に降格
    const updatedRoles: Record<string, 'judge' | 'player' | 'observer'> = { ...lobbyRoles }
    if (newRole === 'judge') {
      game.player_names.forEach((name, i) => {
        if (getEffectiveRole(name, i, lobbyRoles) === 'judge') {
          updatedRoles[name] = 'player'
        }
      })
    }
    updatedRoles[myName] = newRole
    await supabase.from('games').update({ lobby_roles: updatedRoles }).eq('id', roomCode)
    setChangingRole(false)
  }

  // ── ゲーム開始 ──
  async function handleStartGame() {
    if (!game || !canStart || starting) return
    setStarting(true)
    try {
      const deck = (game.members && game.members.length > 0) ? game.members : members
      const shuffled = shuffleArray(deck)

      // judge_index を lobby_roles から決定
      let newJudgeIndex = 0
      playerNames.forEach((name, i) => {
        if (getEffectiveRole(name, i, lobbyRoles) === 'judge') newJudgeIndex = i
      })

      // player ロールの人だけに手札を配る
      let cardSlot = 0
      const hands: PlayerHand[] = []
      playerNames.forEach((name, i) => {
        if (getEffectiveRole(name, i, lobbyRoles) === 'player') {
          hands.push({
            player: name,
            index: i,
            cards: shuffled.slice(cardSlot * 5, (cardSlot + 1) * 5),
            changed: false,
            opened: false,
          })
          cardSlot++
        }
      })

      const { error } = await supabase
        .from('games')
        .update({ phase: 'change', hands, judge_index: newJudgeIndex })
        .eq('id', roomCode)
      if (error) { alert(`エラー: ${error.message}`); setStarting(false) }
    } catch {
      setStarting(false)
    }
  }

  return (
    <Layout>
      <RoomCodePanel code={roomCode} />

      <SectionLabel>参加者 {playerNames.length > 0 ? `（${playerNames.length}人）` : ''}</SectionLabel>

      <div className="space-y-2 mb-6">
        {playerNames.map((name, i) => {
          const isMe = i === myPlayerIndex
          const role = getEffectiveRole(name, i, lobbyRoles)
          const s = ROLE_STYLE[role]

          return (
            <div
              key={i}
              className="bg-black/30 border rounded-[14px] px-4 py-3 animate-fade-up transition-all"
              style={{
                borderColor: isMe ? s.border : 'rgba(201,168,76,0.2)',
                background: isMe ? s.bg.replace('0.2', '0.08').replace('0.06', '0.03') : 'rgba(0,0,0,0.3)',
                animationDelay: `${i * 0.06}s`,
              }}
            >
              {/* 上段：アバター・名前・バッジ */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                  style={{
                    background: role === 'judge' ? '#993C1D' : role === 'player' ? '#534AB7' : '#333',
                    border: '2px solid rgba(201,168,76,0.3)',
                  }}
                >
                  {name.slice(0, 1)}
                </div>
                <span className="text-[15px] font-bold text-[#fdf6e3] flex-1 truncate">{name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isMe && (
                    <span className="text-[10px] text-[#c9a84c] border border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.08)] rounded px-1.5 py-[2px]">
                      あなた
                    </span>
                  )}
                  {i === 0 && (
                    <span className="text-[10px] text-[#ff8a7a] border border-[rgba(192,57,43,0.4)] bg-[rgba(192,57,43,0.08)] rounded px-1.5 py-[2px]">
                      ホスト
                    </span>
                  )}
                  {!isMe && <RoleBadge role={role} />}
                </div>
              </div>

              {/* 下段：ロール選択ボタン（自分の行のみ） */}
              {isMe && (
                <div className="flex gap-1.5 mt-3">
                  {ROLES.map(r => {
                    const selected = role === r.value
                    const rs = ROLE_STYLE[r.value]
                    return (
                      <button
                        key={r.value}
                        onClick={() => handleRoleChange(r.value)}
                        disabled={changingRole}
                        className="flex-1 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1"
                        style={{
                          background: selected ? rs.bg : 'rgba(0,0,0,0.35)',
                          border: `1.5px solid ${selected ? rs.border : 'rgba(255,255,255,0.1)'}`,
                          color: selected ? rs.color : 'rgba(255,255,255,0.3)',
                          boxShadow: selected ? `0 0 10px ${rs.border}40` : 'none',
                        }}
                      >
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 待機インジケーター */}
        <div className="flex items-center gap-3 border border-dashed border-[rgba(201,168,76,0.15)] rounded-[14px] px-4 py-3">
          <div className="w-9 h-9 rounded-full flex-shrink-0 border-2 border-dashed border-white/20 flex items-center justify-center text-white/25 text-sm">+</div>
          <span className="text-[14px] text-white/30">参加を待っています…</span>
        </div>
      </div>

      <GoldDivider />

      {isHost ? (
        <>
          {/* バリデーション警告 */}
          {judgeCount === 0 && (
            <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-[10px] px-4 py-3 text-[13px] text-[#ff8a7a] text-center mb-3">
              ⚖️ ジャッジを決めてください（誰かがジャッジを選択してね）
            </div>
          )}
          {judgeCount > 1 && (
            <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-[10px] px-4 py-3 text-[13px] text-[#ff8a7a] text-center mb-3">
              ジャッジは1人にしてください（現在 {judgeCount}人）
            </div>
          )}
          {playerCount === 0 && judgeCount === 1 && (
            <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.3)] rounded-[10px] px-4 py-3 text-[13px] text-[#ff8a7a] text-center mb-3">
              🎮 プレイヤーが必要です（最低1人）
            </div>
          )}

          {canStart ? (
            <Button variant="gold" onClick={handleStartGame} disabled={starting}>
              {starting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                  開始中...
                </>
              ) : `▶ ゲーム開始！（⚖️×${judgeCount} 🎮×${playerCount}）`}
            </Button>
          ) : (
            <Button variant="gold" onClick={handleStartGame} disabled>
              ▶ ゲーム開始
            </Button>
          )}
          <p className="text-[12px] text-white/35 text-center mt-3">
            上のルームコードを参加者にシェアしてね
          </p>
        </>
      ) : (
        <div className="bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.2)] rounded-[12px] px-4 py-5 text-center">
          <div className="text-[28px] mb-2">⏳</div>
          <div className="text-[14px] text-white/70 font-bold mb-1">ホストのゲーム開始を待っています</div>
          <div className="text-[12px] text-white/35">ロールを選択して待ってね</div>
        </div>
      )}
    </Layout>
  )
}
