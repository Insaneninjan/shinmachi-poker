import { useState, useEffect } from 'react'
import { supabase } from './hooks/useSupabase'
import { shuffleArray, generateRoomCode, amIJudge } from './utils/gameLogic'
import { ScreenWelcome } from './screens/ScreenWelcome'
import { ScreenJoin } from './screens/ScreenJoin'
import { ScreenHost } from './screens/ScreenHost'
import { ScreenGame } from './screens/ScreenGame'
import { ScreenShowdown } from './screens/ScreenShowdown'
import type { GameRow, CardMember, ClientState } from './types/game'

type AppScreen = 'welcome' | 'join' | 'host' | 'game' | 'showdown'

export default function App() {
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
            setGame(prev => ({ ...(prev ?? {} as GameRow), ...safeDiff } as GameRow))
            navigate('showdown')
          }
          if (safeDiff.phase === 'change' && screen === 'showdown') {
            setGame(prev => {
              const merged = { ...(prev ?? {} as GameRow), ...safeDiff } as GameRow
              // showdown が配列でない場合は強制的に空配列にリセット
              if (!Array.isArray(merged.showdown)) merged.showdown = []
              return merged
            })
            const iAmNowJudge = amIJudge(client.myPlayerIndex, safeDiff.judge_index ?? 0)
            setClient(prev => ({ ...prev, role: iAmNowJudge ? 'judge' : 'player' }))
            navigate(iAmNowJudge ? 'host' : 'game')
          }
        }
      ).subscribe()
    return () => { channel.unsubscribe() }
  }, [client.roomCode, screen, client.myPlayerIndex])

  async function handleStartGame(hostName: string, playerNames: string[], cardMembers: CardMember[]) {
    setMembers(cardMembers)
    const code = generateRoomCode()
    const allNames = [hostName, ...playerNames]
    const playerOnlyNames = allNames.slice(1)
    const shuffled = shuffleArray(cardMembers)
    // playerOnlyNames corresponds to player_names starting at index 1 (0 is host)
    // Ensure each hand.index matches the position in player_names to avoid collisions
    const hands = playerOnlyNames.map((name, i) => ({
      player: name,
      index: i + 1, // shift by 1 so indices align with player_names
      cards: shuffled.slice(i * 5, i * 5 + 5),
      changed: false, opened: false,
    }))
    const row: GameRow = {
      id: code, phase: 'change', hands, showdown: [],
      judge_index: 0, player_names: allNames, winner: null,
      members: cardMembers,
      created_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('games').upsert(row)
    if (error) { alert(`エラー: ${error.message}`); return }
    setGame(row)
    setClient({ roomCode: code, role: 'judge', myPlayerIndex: 0, myPlayerName: hostName, discardSelected: [], openSelected: [] })
    navigate('host')
  }

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

  function handleNextRound() {
    // buildNextRound は ScreenShowdown 内の useNextRound が呼ぶ
    // Realtime 経由で全員に change フェーズが伝わる
  }

  return (
    <div
      key={screen}
      className={transitioning ? 'opacity-0 pointer-events-none' : 'animate-page-enter'}
    >
      {screen === 'welcome' && <ScreenWelcome onStartGame={handleStartGame} onJoin={() => navigate('join')} />}
      {screen === 'join' && <ScreenJoin onJoinAsJudge={handleJoinAsJudge} onJoinAsPlayer={handleJoinAsPlayer} onBack={() => navigate('welcome')} />}
      {screen === 'host' && client.roomCode && game && (
        <ScreenHost roomCode={client.roomCode} myPlayerIndex={client.myPlayerIndex} members={members} onWinnerDeclared={(g) => { setGame(g); navigate('showdown') }} />
      )}
      {screen === 'game' && client.roomCode && game && (
        <ScreenGame roomCode={client.roomCode} myPlayerIndex={client.myPlayerIndex} members={members} initialGame={game} />
      )}
      {screen === 'showdown' && game && (
        <ScreenShowdown game={game} isJudge={client.role === 'judge'} members={members} onNextRound={handleNextRound} />
      )}
    </div>
  )
}
