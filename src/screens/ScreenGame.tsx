import { useState, useEffect, useRef } from 'react'
import { useGame, supabase } from '../hooks/useSupabase'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import {
  Layout, PhaseBanner, SuccessPanel, SectionLabel,
  GoldDivider, BadgeGold,
} from '../components/Layout'
import { applyCardChange } from '../utils/gameLogic'
import type { CardMember, CardGroup, GameRow, PlayerHand } from '../types/game'

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
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // ─── 役の内訳グループ割り当て ───
  // cardGroups: 手札index → グループラベル（ツーペア・フルハウス用）
  const [cardGroups, setCardGroups] = useState<Record<number, string>>({})
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  // cardOrder: 手札indexの配列（ストレートの順番用、先頭=1位）
  const [cardOrder, setCardOrder] = useState<number[]>([])

  // グループ定義（役の種類 → グループ構造）
  const GROUP_DEFS: Record<string, { label: string; count: number; color: string }[]> = {
    'ツーペア':   [{ label: 'ペア①', count: 2, color: '#534AB7' }, { label: 'ペア②', count: 2, color: '#993C1D' }],
    'フルハウス': [{ label: 'スリー', count: 3, color: '#534AB7' }, { label: 'ペア',  count: 2, color: '#993C1D' }],
  }
  const STRAIGHT_TYPES = ['ストレート', 'ストレートフラッシュ']

  // フェーズが切り替わったらリセット
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'change' || phase === 'change2') {
      setDiscardSelected([])
      setChangeSubmitted(myHand?.changed ?? false)
    }
    if (phase === 'open') {
      setOpenSelected([0, 1, 2, 3, 4])
      setYakuType('')
      setYakuText('')
      setCardGroups({})
      setActiveGroup(null)
      setCardOrder([])
      const myEntry = showdown.find(s => s.playerIndex === myPlayerIndex)
      setOpenSubmitted(!!myEntry)
    }
  }, [phase]) // phase のみ意図的に監視

  // 役の種類が変わったらグループ割り当てをリセット
  useEffect(() => {
    setCardGroups({})
    setActiveGroup(null)
    setCardOrder([])
  }, [yakuType])

  // オープンフェーズのタイマーカウントダウン＆自動提出
  const submitOpenRef = useRef(submitOpen)
  useEffect(() => { submitOpenRef.current = submitOpen })

  useEffect(() => {
    const deadline = currentGame.open_deadline
    if (!deadline || !currentGame.timer_enabled || phase !== 'open' || openSubmitted) {
      setTimeLeft(null)
      return
    }
    const deadlineMs = new Date(deadline).getTime()
    const tick = () => {
      const remaining = Math.max(0, deadlineMs - Date.now())
      setTimeLeft(remaining)
      if (remaining === 0) submitOpenRef.current(true)
    }
    tick()
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [currentGame.open_deadline, currentGame.timer_enabled, phase, openSubmitted])

  const PHASE_INFO: Record<string, { name: string; desc: string }> = {
    change:  { name: 'チェンジフェーズ（1回目）', desc: '捨てるカードを選んでチェンジしよう' },
    change2: { name: 'チェンジフェーズ（2回目）', desc: 'もう一度チェンジできます（0枚でもOK）' },
    open:    { name: 'オープンフェーズ', desc: '役を入力してカードを出そう' },
    judge:   { name: '判定フェーズ', desc: 'ジャッジが勝者を決定中...' },
    winner:  { name: '結果発表', desc: '' },
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

  async function submitOpen(force = false) {
    if (!myHand || submitting || openSubmitted) return
    const finalYaku = force ? (yakuCombined || '(時間切れ)') : yakuCombined
    const finalCards = force ? (openSelected.length > 0 ? openSelected : [0, 1, 2, 3, 4]) : openSelected
    if (!force && !finalYaku) { alert('役を選択 or 入力してね'); return }
    if (!force && finalCards.length === 0) { alert('出すカードを1枚以上選んでね'); return }
    setSubmitting(true)

    // 役の内訳グループを構築
    let groups: CardGroup[] | undefined
    const groupDefs = GROUP_DEFS[yakuType]
    if (groupDefs) {
      const built = groupDefs.map(g => ({
        label: g.label,
        cards: Object.entries(cardGroups)
          .filter(([, label]) => label === g.label)
          .map(([idx]) => myHand.cards[Number(idx)]),
      })).filter(g => g.cards.length > 0)
      if (built.length > 0) groups = built
    } else if (STRAIGHT_TYPES.includes(yakuType) && cardOrder.length > 0) {
      groups = [{ label: 'ストレート', cards: cardOrder.map(i => myHand.cards[i]) }]
    }

    // ストレートは cardOrder を優先して cards 配列の順番を決める
    const submittedCards = (STRAIGHT_TYPES.includes(yakuType) && cardOrder.length > 0)
      ? [
          ...cardOrder.map(i => myHand.cards[i]),
          ...finalCards.filter(i => !cardOrder.includes(i)).map(i => myHand.cards[i]),
        ]
      : finalCards.map(i => myHand.cards[i])

    const { data } = await supabase.from('games').select('showdown').eq('id', roomCode).single()
    const currentSD = (data?.showdown ?? showdown).filter((s: any) => s.playerIndex !== myPlayerIndex)
    currentSD.push({
      playerIndex: myPlayerIndex,
      player: myHand.player,
      yaku: finalYaku,
      cards: submittedCards,
      ...(groups ? { groups } : {}),
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
    const wasSelected = openSelected.includes(i)
    setOpenSelected(prev => wasSelected ? prev.filter(x => x !== i) : [...prev, i])
    if (wasSelected) {
      // カードが外されたらグループ割り当てとストレート順番からも除去
      setCardGroups(prev => { const n = { ...prev }; delete n[i]; return n })
      setCardOrder(prev => prev.filter(ci => ci !== i))
    }
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

      {/* チェンジフェーズ（1回目・2回目共通） */}
      {(phase === 'change' || phase === 'change2') && (
        changeSubmitted ? (
          <>
            <div className="animate-slide-down">
              <SuccessPanel>
                {phase === 'change2'
                  ? '✅ 2回目のチェンジ完了！次のフェーズが始まるまで待ってね'
                  : '✅ チェンジ完了！2回目のチェンジが始まるまで待ってね'}
              </SuccessPanel>
            </div>
            <SectionLabel>あなたの手札</SectionLabel>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {myHand.cards.map((c, i) => <Card key={i} card={c} size="lg" selected dealIndex={i} />)}
            </div>
          </>
        ) : (
          <>
            <SectionLabel>捨てるカードを選ぼう（0〜5枚）</SectionLabel>
            <div className="flex justify-center mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold"
                style={{
                  background: 'rgba(201,168,76,0.12)',
                  border: '1.5px solid rgba(201,168,76,0.3)',
                  color: '#c9a84c',
                }}
              >
                🔄 シャッフル残り {phase === 'change' ? '2回' : '1回'}
              </span>
            </div>
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
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                  送信中...
                </>
              ) : '🔄 チェンジ完了'}
            </Button>
          </>
        )
      )}

      {/* オープンフェーズ */}
      {phase === 'open' && timeLeft !== null && (
        <div className="flex justify-center mb-3">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-bold font-playfair"
            style={{
              background: timeLeft < 30000 ? 'rgba(192,57,43,0.15)' : 'rgba(201,168,76,0.1)',
              border: `1.5px solid ${timeLeft < 30000 ? 'rgba(192,57,43,0.5)' : 'rgba(201,168,76,0.3)'}`,
              color: timeLeft < 30000 ? '#ff8a7a' : '#c9a84c',
              animation: timeLeft < 10000 ? 'pulse 1s ease-in-out infinite' : undefined,
            }}
          >
            ⏱ {Math.floor(timeLeft / 60000)}:{String(Math.floor((timeLeft % 60000) / 1000)).padStart(2, '0')}
          </div>
        </div>
      )}
      {phase === 'open' && (
        openSubmitted ? (
          <>
            <div className="animate-slide-down">
              <SuccessPanel>✅ オープン完了！ジャッジが判定するまで待ってね</SuccessPanel>
            </div>
            {(() => {
              const myEntry = showdown.find(s => s.playerIndex === myPlayerIndex)
              return myEntry ? (
                <>
                  <div className="font-playfair text-[20px] text-[#c9a84c] text-center mb-4">「{myEntry.yaku}」</div>
                  {myEntry.groups && myEntry.groups.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {myEntry.groups.map((g, gi) => (
                        <div key={gi}>
                          <div className="text-[10px] text-white/40 tracking-wider text-center mb-1">{g.label}</div>
                          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${g.cards.length}, 1fr)` }}>
                            {g.cards.map((c, ci) => <Card key={ci} card={c} size="lg" selected dealIndex={ci} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {myEntry.cards.map((c, i) => <Card key={i} card={c} size="lg" selected dealIndex={i} />)}
                    </div>
                  )}
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
                  deselected={!openSelected.includes(i)}
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
                  placeholder="入力してください"
                />
              </div>
            </div>

            {/* ─── ツーペア / フルハウス：グループ割り当てUI ─── */}
            {GROUP_DEFS[yakuType] && openSelected.length > 0 && (
              <div className="bg-black/30 border border-[rgba(201,168,76,0.2)] rounded-[14px] p-4 mb-4">
                <div className="text-[11px] text-white/40 tracking-widest mb-3">
                  役の内訳を振り分けよう
                </div>
                {/* グループ選択ボタン */}
                <div className="flex gap-2 mb-3">
                  {GROUP_DEFS[yakuType].map(g => {
                    const assigned = Object.values(cardGroups).filter(v => v === g.label).length
                    const full = assigned >= g.count
                    const isActive = activeGroup === g.label
                    return (
                      <button
                        key={g.label}
                        onClick={() => setActiveGroup(isActive ? null : g.label)}
                        className="flex-1 py-2 rounded-lg text-[12px] font-bold border-2 transition-all"
                        style={{
                          borderColor: isActive ? '#c9a84c' : g.color + '50',
                          background: isActive ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.25)',
                          color: isActive ? '#c9a84c' : full ? '#a0a0a0' : g.color,
                        }}
                      >
                        {g.label}
                        <span className="ml-1 opacity-70 text-[10px]">({assigned}/{g.count})</span>
                      </button>
                    )
                  })}
                </div>
                {/* カード割り当てグリッド */}
                {activeGroup ? (
                  <>
                    <p className="text-[11px] text-white/30 text-center mb-2">
                      カードをタップして「{activeGroup}」に振り分け
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {openSelected.map((cardIdx, i) => {
                        const group = cardGroups[cardIdx]
                        const gDef = GROUP_DEFS[yakuType]?.find(g => g.label === group)
                        const isInActive = group === activeGroup
                        return (
                          <div
                            key={i}
                            className="relative cursor-pointer"
                            onClick={() => {
                              setCardGroups(prev => {
                                const next = { ...prev }
                                if (next[cardIdx] === activeGroup) {
                                  delete next[cardIdx]
                                } else {
                                  next[cardIdx] = activeGroup!
                                }
                                return next
                              })
                            }}
                          >
                            <Card
                              card={myHand.cards[cardIdx]}
                              size="lg"
                              selected={isInActive}
                              deselected={!!group && !isInActive}
                              dealIndex={i}
                            />
                            {group && (
                              <div
                                className="absolute top-0.5 left-0.5 text-[9px] font-bold text-white px-1 py-0.5 rounded leading-none pointer-events-none"
                                style={{ background: gDef?.color ?? '#534AB7' }}
                              >
                                {group === 'スリー' ? '3' : group === 'ペア' ? 'P' : group.slice(-1)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-white/30 text-center py-2">
                    上のボタンを押してカードを振り分けよう
                  </p>
                )}
              </div>
            )}

            {/* ─── ストレート / ストレートフラッシュ：順番UIー ─── */}
            {STRAIGHT_TYPES.includes(yakuType) && openSelected.length > 0 && (
              <div className="bg-black/30 border border-[rgba(201,168,76,0.2)] rounded-[14px] p-4 mb-4">
                <div className="text-[11px] text-white/40 tracking-widest mb-3">
                  順番に並べよう（タップで追加・外す）
                </div>
                {/* 順番スロット */}
                <div className="flex gap-1 mb-3">
                  {openSelected.map((_, pos) => {
                    const cardIdx = cardOrder[pos]
                    return (
                      <div key={pos} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                        <div className="text-[10px] text-[#c9a84c] font-bold leading-none mb-0.5">{pos + 1}</div>
                        {cardIdx !== undefined ? (
                          <div
                            className="cursor-pointer w-full"
                            onClick={() => setCardOrder(prev => prev.filter(i => i !== cardIdx))}
                          >
                            <Card card={myHand.cards[cardIdx]} size="sm" selected dealIndex={pos} />
                          </div>
                        ) : (
                          <div
                            className="aspect-[2/3] w-full border-2 border-dashed border-white/15 rounded-lg flex items-center justify-center text-white/20"
                            style={{ fontSize: '14px' }}
                          >
                            ?
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* 未配置カード */}
                {openSelected.filter(i => !cardOrder.includes(i)).length > 0 ? (
                  <>
                    <p className="text-[11px] text-white/30 text-center mb-2">↓ タップして順番に追加</p>
                    <div className="grid grid-cols-5 gap-1">
                      {openSelected.filter(i => !cardOrder.includes(i)).map((cardIdx, pi) => (
                        <div
                          key={cardIdx}
                          className="cursor-pointer"
                          onClick={() => setCardOrder(prev => [...prev, cardIdx])}
                        >
                          <Card card={myHand.cards[cardIdx]} size="sm" dealIndex={pi} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-[#c9a84c] text-center opacity-70">
                    ✓ 順番が設定されました！スロットのカードをタップすると外せます
                  </p>
                )}
              </div>
            )}

            <Button variant="gold" onClick={() => submitOpen()} disabled={submitting}>
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                  送信中...
                </>
              ) : '⚡ オープン！'}
            </Button>
          </>
        )
      )}

      {/* 判定待ち */}
      {phase === 'judge' && (
        <div className="flex flex-col items-center justify-center py-16 gap-5">
          <div
            className="w-12 h-12 rounded-full border-2 border-[rgba(201,168,76,0.3)] border-t-[#c9a84c] animate-spin"
            style={{ animationDuration: '1.4s' }}
          />
          <div className="text-center">
            <p className="text-[16px] text-[#e8cc80] font-bold mb-1">⚖️ ジャッジが勝者を決定中...</p>
            <p className="text-[13px] text-white/35">もうすぐショーダウンが始まります</p>
          </div>
        </div>
      )}

      <GoldDivider />
      <Button variant="ghost" onClick={() => window.location.reload()}>← ゲームを離れる</Button>
    </Layout>
  )
}
