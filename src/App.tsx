import { useState, useEffect } from 'react'
import { supabase } from './hooks/useSupabase'
import { generateRoomCode, amIJudge } from './utils/gameLogic'
import { ScreenWelcome } from './screens/ScreenWelcome'
import { ScreenJoin } from './screens/ScreenJoin'
import { ScreenLobby } from './screens/ScreenLobby'
import { ScreenHost } from './screens/ScreenHost'
import { ScreenGame } from './screens/ScreenGame'
import { ScreenShowdown } from './screens/ScreenShowdown'
import { ScreenGate } from './screens/ScreenGate'
import { ScreenObserverWait } from './screens/ScreenObserverWait'
import { ScreenStats } from './screens/ScreenStats'
import type { GameRow, CardMember, ClientState, MyRole } from './types/game'

type AppScreen = 'welcome' | 'join' | 'lobby' | 'host' | 'game' | 'showdown' | 'observer' | 'stats'

export default function App() {
  // セッション内で合言葉を突破済みかチェック
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem('gate_unlocked') === '1'
  )
  const [screen, setScreen] = useState<AppScreen>('welcome')
  const [transitioning, setTransitioning] = useState(false)
  const [game, setGame] = useState<GameRow | null>(null)
  const [client, setClient] = useState<ClientState>({
    roomCode: null, role: null, myPlayerIndex: 0,
    myPlayerName: null, discardSelected: [], openSelected: [],
  })
  const [members, setMembers] = useState<CardMember[]>([])

  function navigate(to: AppScreen) {
    setTransitioning(true)
    setTimeout(() => { setScreen(to); setTransitioning(false); window.scrollTo(0, 0) }, 200)
  }

  // winner / 次ラウンドの Realtime 監視
  useEffect(() => {
    if (!client.roomCode) return
    const channel = supabase
      .channel(`winner-watch:${client.roomCode}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${client.roomCode}` },
        (payload) => {
          // payload.new は差分のみのため、前の state と merge する
          const diff = payload.new as Partial<GameRow>
          // showdown が配列でない場合（Realtime の JSONB シリアライズ不具合対策）は空配列に正規化
          const safeShowdown = Array.isArray(diff.showdown) ? diff.showdown : undefined
          const safeDiff = safeShowdown !== undefined ? { ...diff, showdown: safeShowdown } : diff
          if (safeDiff.phase === 'winner') {
            // payload.new は差分のみのケースがあり showdown が欠落する。
            // DBから完全な行を取得してから遷移する。
            supabase
              .from('games')
              .select('*')
              .eq('id', client.roomCode!)
              .single()
              .then(({ data }) => {
                if (data) {
                  setGame(data as GameRow)
                } else {
                  setGame(prev => ({ ...(prev ?? {} as GameRow), ...safeDiff } as GameRow))
                }
                navigate('showdown')
              })
          }
          if (safeDiff.phase === 'change' && (screen === 'showdown' || screen === 'observer')) {
            setGame(prev => {
              const merged = { ...(prev ?? {} as GameRow), ...safeDiff } as GameRow
              if (!Array.isArray(merged.showdown)) merged.showdown = []
              return merged
            })
            if (client.role === 'observer') {
              navigate('observer')
            } else {
              const iAmNowJudge = amIJudge(client.myPlayerIndex, safeDiff.judge_index ?? 0)
              setClient(prev => ({ ...prev, role: iAmNowJudge ? 'judge' : 'player' }))
              navigate(iAmNowJudge ? 'host' : 'game')
            }
          }
        }
      ).subscribe()
    return () => { channel.unsubscribe() }
  }, [client.roomCode, screen, client.myPlayerIndex])

  // ─── ホストが部屋を作る ───
  async function handleCreateLobby(hostName: string, cardMembers: CardMember[], timerEnabled: boolean) {
    setMembers(cardMembers)
    const code = generateRoomCode()
    const row: GameRow = {
      id: code,
      phase: 'lobby',
      player_names: [hostName],   // ホストだけが最初にいる
      hands: [],
      showdown: [],
      judge_index: 0,
      winner: null,
      scores: {},
      members: cardMembers,
      timer_enabled: timerEnabled,
      open_deadline: null,
      lobby_roles: { [hostName]: 'judge' },
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('games').upsert(row)
    if (error) { alert(`エラー: ${error.message}`); return }
    setGame(row)
    setClient({
      roomCode: code,
      role: 'judge',              // ホストは最初のジャッジ
      myPlayerIndex: 0,
      myPlayerName: hostName,
      discardSelected: [],
      openSelected: [],
    })
    navigate('lobby')
  }

  // ─── プレイヤーがロビーに参加する ───
  async function handleJoinLobby(g: GameRow, playerName: string) {
    // 最新の player_names と lobby_roles を取得してから追加（競合防止）
    const { data } = await supabase
      .from('games')
      .select('player_names, lobby_roles')
      .eq('id', g.id)
      .single()
    const currentNames = (data?.player_names ?? g.player_names) as string[]
    const currentRoles = (data?.lobby_roles ?? g.lobby_roles ?? {}) as Record<string, string>
    const playerIndex = currentNames.length   // 新しいプレイヤーは末尾
    const newNames = [...currentNames, playerName]
    const newRoles = { ...currentRoles, [playerName]: 'player' }
    const { error } = await supabase
      .from('games')
      .update({ player_names: newNames, lobby_roles: newRoles })
      .eq('id', g.id)
    if (error) { alert(`参加に失敗しました: ${error.message}`); return }
    setGame({ ...g, player_names: newNames })
    setClient({
      roomCode: g.id,
      role: 'player',
      myPlayerIndex: playerIndex,
      myPlayerName: playerName,
      discardSelected: [],
      openSelected: [],
    })
    navigate('lobby')
  }

  // ─── ロビーからゲーム開始（Realtime 経由で全員に通知される） ───
  function handleLobbyGameStarted(g: GameRow, myRole: MyRole) {
    setGame(g)
    if (Array.isArray(g.members) && g.members.length > 0) setMembers(g.members)
    setClient(prev => ({ ...prev, role: myRole }))
    if (myRole === 'observer') navigate('observer')
    else if (myRole === 'judge') navigate('host')
    else navigate('game')
  }

  // ─── 進行中のゲームに再参加（ScreenJoin 経由） ───
  function handleJoinAsJudge(g: GameRow, playerIndex: number) {
    setGame(g)
    setClient({ roomCode: g.id, role: 'judge', myPlayerIndex: playerIndex, myPlayerName: g.player_names[playerIndex], discardSelected: [], openSelected: [] })
    navigate('host')
  }

  function handleJoinAsPlayer(g: GameRow, playerIndex: number) {
    setGame(g)
    const name = g.hands.find(h => h.index === playerIndex)?.player ?? g.player_names[playerIndex] ?? ''
    setClient({ roomCode: g.id, role: 'player', myPlayerIndex: playerIndex, myPlayerName: name, discardSelected: [], openSelected: [] })
    navigate('game')
  }

  function handleJoinAsObserver(g: GameRow) {
    setGame(g)
    setClient({ roomCode: g.id, role: 'observer', myPlayerIndex: -1, myPlayerName: null, discardSelected: [], openSelected: [] })
    if (g.phase === 'winner') {
      navigate('showdown')
    } else {
      navigate('observer')
    }
  }

  function handleNextRound() {
    // buildNextRound は ScreenShowdown 内の useNextRound が呼ぶ
    // Realtime 経由で全員に change フェーズが伝わる
  }

  if (!unlocked) {
    return <ScreenGate onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div
      key={screen}
      className={transitioning ? 'opacity-0 pointer-events-none' : 'animate-page-enter'}
    >
      {screen === 'welcome' && (
        <ScreenWelcome
          onCreateLobby={(h, m, t) => handleCreateLobby(h, m, t)}
          onJoin={() => navigate('join')}
          onStats={() => navigate('stats')}
        />
      )}
      {screen === 'stats' && (
        <ScreenStats onBack={() => navigate('welcome')} />
      )}
      {screen === 'join' && (
        <ScreenJoin
          onJoinLobby={handleJoinLobby}
          onJoinAsJudge={handleJoinAsJudge}
          onJoinAsPlayer={handleJoinAsPlayer}
          onJoinAsObserver={handleJoinAsObserver}
          onBack={() => navigate('welcome')}
        />
      )}
      {screen === 'lobby' && client.roomCode && game && (
        <ScreenLobby
          roomCode={client.roomCode}
          myPlayerIndex={client.myPlayerIndex}
          isHost={client.myPlayerIndex === 0}
          members={members}
          onGameStarted={handleLobbyGameStarted}
        />
      )}
      {screen === 'host' && client.roomCode && game && (
        <ScreenHost
          roomCode={client.roomCode}
          myPlayerIndex={client.myPlayerIndex}
          members={members}
          onWinnerDeclared={(g) => { setGame(g); navigate('showdown') }}
        />
      )}
      {screen === 'game' && client.roomCode && game && (
        <ScreenGame
          roomCode={client.roomCode}
          myPlayerIndex={client.myPlayerIndex}
          members={members}
          initialGame={game}
        />
      )}
      {screen === 'showdown' && game && (
        <ScreenShowdown
          game={game}
          isJudge={client.role === 'judge'}
          members={members}
          onNextRound={handleNextRound}
        />
      )}
      {screen === 'observer' && client.roomCode && (
        <ScreenObserverWait
          roomCode={client.roomCode}
          game={game}
        />
      )}
    </div>
  )
}
