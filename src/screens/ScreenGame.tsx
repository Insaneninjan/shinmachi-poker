import { useState, useEffect } from 'react'
import { useGame, supabase } from '../hooks/useSupabase'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import {
  Layout, PhaseBanner, SuccessPanel, SectionLabel,
  GoldDivider, BadgeGold,
} from '../components/Layout'
import { applyCardChange, sortShowdown } from '../utils/gameLogic'
import type { CardMember, GameRow, PlayerHand } from '../types/game'

interface ScreenGameProps {
  roomCode: string
  myPlayerIndex: number
  members: CardMember[]
  initialGame: GameRow
}

export function ScreenGame({ roomCode, myPlayerIndex, members, initialGame }: ScreenGameProps) {
  const { game } = useGame({
    roomCode,
    myPlayerIndex,
    isJudge: false,
    members,
  })

  const currentGame = game ?? initialGame
  const { phase, hands = [], showdown = [] } = currentGame
  const myHand: PlayerHand | undefined = hands.find(h => h.index === myPlayerIndex)

  const [discardSelected, setDiscardSelected] = useState<number[]>([])
  const [openSelected, setOpenSelected] = useState<number[]>([0, 1, 2, 3, 4])
  const [yakuType, setYakuType] = useState('')   // プルダウンで選ぶ役の種類
  const [yakuText, setYakuText] = useState('')   // 自由入力の役名（大喜利）
  const [submitting, setSubmitting] = useState(false)
  const [changeSubmitted, setChangeSubmitted] = useState(myHand?.changed ?? false)
  const [openSubmitted, setOpenSubmitted] = useState(false)

  // フェーズが切り替わったらリセット
  // ※ myHand・showdown・myPlayerIndex を deps に含めると
  //   Realtime更新の度にリセットされるため phase のみを監視する。
  //   ただし参照する値はレンダー時の最新値を使う（クロージャ問題なし）。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'change') {
      setDiscardSelected([])
      setChangeSubmitted(myHand?.changed ?? false)
    }
    if (phase === 'open') {
      setOpenSelected([0, 1, 2, 3, 4])
      setYakuType('')
      setYakuText('')
      const myEntry = showdown.find(s => s.playerIndex === myPlayerIndex)
      setOpenSubmitted(!!myEntry)
    }
  }, [phase]) // phase のみ意図的に監視（コメント参照）

  const PHASE_INFO: Record<string, { name: string; desc: string }> = {
    change: { name: 'チェンジフェーズ', desc: '捨てるカードを選んでチェンジしよう' },
    open:   { name: 'オープンフェーズ', desc: '役を入力してカードを出そう' },
    judge:  { name: '判定フェーズ', desc: 'ジャッジが勝者を決定中...' },
    winner: { name: '結果発表', desc: '' },
  }
  const pi = PHASE_INFO[phase] ?? PHASE_INFO.change

  async function submitChange() {
    if (!myHand || submitting) return
    setSubmitting(true)
    const { data } = await supabase.from('games').select('hands,members').eq('id', roomCode).single()
    const latestHands = (data?.hands ?? hands) as PlayerHand[]
    // Use members prop if provided, otherwise fall back to DB-stored members
    const deck = (members && members.length > 0) ? members : (data?.members ?? [])
    const newHands = applyCardChange(latestHands, myPlayerIndex, discardSelected, deck)
    await supabase.from('games').update({ hands: newHands }).eq('id', roomCode)
    setChangeSubmitted(true)
    setSubmitting(false)
  }

  // 役タイプ + 大喜利名を合体させた最終的な役文字列
  const yakuCombined = [yakuType, yakuText.trim()].filter(Boolean).join(' / ')

  async function submitOpen() {
    if (!myHand || submitting) return
    if (!yakuCombined) { alert('役を選択 or 入力してね'); return }
    if (openSelected.length === 0) { alert('出すカードを1枚以上選んでね'); return }
    setSubmitting(true)
    const { data } = await supabase.from('games').select('showdown').eq('id', roomCode).single()
    const currentSD = (data?.showdown ?? showdown).filter((s: any) => s.playerIndex !== myPlayerIndex)
    currentSD.push({
      playerIndex: myPlayerIndex,
      player: myHand.player,
      yaku: yakuCombined,
      cards: openSelected.map(i => myHand.cards[i]),
    })
    await supabase.from('games').update({ showdown: currentSD }).eq('id', roomCode)
    setOpenSubmitted(true)
    setSubmitting(false)
  }

  function toggleDiscard(i: number) {
    setDiscardSelected(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  function toggleOpen(i: number) {
    setOpenSelected(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  if (!myHand) return (
    <Layout>
      <div className="text-center py-20 text-white/50">手札を読み込み中...</div>
    </Layout>
  )

  return (
    <Layout>
      {/* ヘッダー */}
      <div className="text-center pt-4 mb-4 animate-fade-up">
        <div className="text-[12px] text-white/40 tracking-[0.15em] mb-1">YOUR HAND</div>
        <div className="font-playfair text-[28px] text-[#c9a84c]" style={{ textShadow: '0 0 20px rgba(201,168,76,0.4)' }}>
          {myHand.player}
        </div>
        <BadgeGold>Player {myPlayerIndex + 1}</BadgeGold>
      </div>

      <PhaseBanner phase={phase} name={pi.name} desc={pi.desc} />

      {/* チェンジフェーズ */}
      {phase === 'change' && (
        changeSubmitted ? (
          <>
            <SuccessPanel>✅ チェンジ完了！次のフェーズが始まるまで待ってね</SuccessPanel>
            <SectionLabel>あなたの手札</SectionLabel>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {myHand.cards.map((c, i) => <Card key={i} card={c} size="lg" selected dealIndex={i} />)}
            </div>
          </>
        ) : (
          <>
            <SectionLabel>捨てるカードを選ぼう（0〜5枚）</SectionLabel>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {myHand.cards.map((c, i) => (
                <Card
                  key={i}
                  card={c}
                  size="lg"
                  discarding={discardSelected.includes(i)}
                  onClick={() => toggleDiscard(i)}
                  dealIndex={i}
                />
              ))}
            </div>
            <p className="text-[12px] text-white/35 text-center mb-4">
              タップしたカードを捨てて引き直します（0枚でもOK）
            </p>
            <Button variant="gold" onClick={submitChange} disabled={submitting}>
              {submitting ? '送信中...' : '🔄 チェンジ完了'}
            </Button>
          </>
        )
      )}

      {/* オープンフェーズ */}
      {phase === 'open' && (
        openSubmitted ? (
          <>
            <SuccessPanel>✅ オープン完了！ジャッジが判定するまで待ってね</SuccessPanel>
            {(() => {
              const myEntry = showdown.find(s => s.playerIndex === myPlayerIndex)
              return myEntry ? (
                <>
                  <div className="font-playfair text-[20px] text-[#c9a84c] text-center mb-4">「{myEntry.yaku}」</div>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {myEntry.cards.map((c, i) => <Card key={i} card={c} size="lg" selected dealIndex={i} />)}
                  </div>
                </>
              ) : null
            })()}
          </>
        ) : (
          <>
            <SectionLabel>出すカードを選ぼう（複数選択OK）</SectionLabel>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {myHand.cards.map((c, i) => (
                <Card
                  key={i}
                  card={c}
                  size="lg"
                  selected={openSelected.includes(i)}
                  onClick={() => toggleOpen(i)}
                  dealIndex={i}
                />
              ))}
            </div>
            <p className="text-[12px] text-white/35 text-center mb-4">
              選んだカードがショーダウンで公開されます
            </p>
            <SectionLabel>役を申告しよう</SectionLabel>
            <div className="bg-black/30 border border-[rgba(201,168,76,0.2)] rounded-[14px] p-4 mb-4 space-y-3">
              {/* プレビュー */}
              <div className="font-playfair text-[20px] text-[#c9a84c] text-center min-h-8">
                {yakuCombined || '—'}
              </div>

              {/* 役の種類プルダウン */}
              <div>
                <div className="text-[11px] text-white/40 tracking-widest mb-1">役の種類（任意）</div>
                <select
                  value={yakuType}
                  onChange={e => setYakuType(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-[rgba(201,168,76,0.3)] rounded-lg text-[15px] text-[#fdf6e3] outline-none focus:border-[#c9a84c] appearance-none cursor-pointer"
                >
                  <option value="">── 選択しない ──</option>
                  <option value="ノーペア">ノーペア</option>
                  <option value="ワンペア">ワンペア</option>
                  <option value="ツーペア">ツーペア</option>
                  <option value="スリーカード">スリーカード</option>
                  <option value="ストレート">ストレート</option>
                  <option value="フラッシュ">フラッシュ</option>
                  <option value="フルハウス">フルハウス</option>
                  <option value="フォーカード">フォーカード</option>
                  <option value="ストレートフラッシュ">ストレートフラッシュ</option>
                  <option value="ファイブカード">ファイブカード</option>
                </select>
              </div>

              {/* 大喜利名（自由入力） */}
              <div>
                <div className="text-[11px] text-white/40 tracking-widest mb-1">役名（自由入力）</div>
                <input
                  className="w-full px-4 py-3 bg-black/40 border border-[rgba(201,168,76,0.3)] rounded-lg text-[15px] text-[#fdf6e3] outline-none focus:border-[#c9a84c] placeholder-white/30"
                  value={yakuText}
                  onChange={e => setYakuText(e.target.value)}
                  placeholder="例: 元カノフラッシュ、団地5カード…"
                />
              </div>
            </div>
            <Button variant="gold" onClick={submitOpen} disabled={submitting}>
              {submitting ? '送信中...' : '⚡ オープン！'}
            </Button>
          </>
        )
      )}

      {/* 判定待ち */}
      {phase === 'judge' && (
        <>
          <div className="bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] rounded-[10px] px-4 py-3 text-[13px] text-[#e8cc80] mb-4 text-center">
            ⚖️ ジャッジが勝者を決定中...<br />結果を待ってね
          </div>
          <SectionLabel>全員の役</SectionLabel>
          {sortShowdown(showdown).map(s => {
            const ncols = Math.min(s.cards.length, 5)
            return (
              <div key={s.playerIndex} className="bg-black/35 border border-[rgba(201,168,76,0.25)] rounded-[16px] p-4 mb-3 animate-flip-in">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white overflow-hidden"
                    style={{ background: s.cards[0]?.color ?? '#534AB7' }}
                  >
                    {s.cards[0]?.photo ? <img src={s.cards[0].photo} className="w-full h-full object-cover" alt="" /> : s.player.slice(0, 1)}
                  </div>
                  <span className="text-[14px] font-bold text-[#fdf6e3] flex-1">{s.player}</span>
                  <BadgeGold>P{s.playerIndex + 1}</BadgeGold>
                </div>
                <div className="font-playfair text-[16px] text-[#c9a84c] text-center mb-2 py-2 bg-[rgba(201,168,76,0.08)] rounded-lg">
                  「{s.yaku}」
                </div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ncols}, 1fr)` }}>
                  {s.cards.map((c, ci) => <Card key={ci} card={c} size="lg" dealIndex={ci} />)}
                </div>
              </div>
            )
          })}
        </>
      )}

      <GoldDivider />
      <Button variant="ghost" onClick={() => window.location.reload()}>← ゲームを離れる</Button>
    </Layout>
  )
}
