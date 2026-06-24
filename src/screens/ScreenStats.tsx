import { useState, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'
import { Button } from '../components/Button'
import { Layout, PageTitle } from '../components/Layout'

interface CardStat {
  card_name: string
  appeared_count: number
  used_count: number
  adoption_rate: number
  color: string
}

type SortKey = 'adoption' | 'appeared' | 'used'
type SortDir = 'desc' | 'asc'

const COLORS = [
  '#534AB7','#0F6E56','#993C1D','#993556','#185FA5',
  '#3B6D11','#854F0B','#A32D2D','#5F5E5A',
]

function colorFromName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface ScreenStatsProps {
  onBack: () => void
}

export function ScreenStats({ onBack }: ScreenStatsProps) {
  const [stats, setStats] = useState<CardStat[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('adoption')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: statsData }, { data: membersData }] = await Promise.all([
        supabase.from('card_stats').select('card_name, appeared_count, used_count'),
        supabase.from('members').select('name, color'),
      ])

      const colorMap = new Map((membersData ?? []).map(m => [m.name, m.color as string]))

      const result: CardStat[] = (statsData ?? []).map(s => ({
        card_name: s.card_name,
        appeared_count: s.appeared_count,
        used_count: s.used_count,
        adoption_rate: s.appeared_count > 0
          ? Math.round((s.used_count / s.appeared_count) * 1000) / 10
          : 0,
        color: colorMap.get(s.card_name) ?? colorFromName(s.card_name),
      }))

      setStats(result)
      setLoading(false)
    }
    load()
  }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...stats].sort((a, b) => {
    const va = sortKey === 'adoption' ? a.adoption_rate
             : sortKey === 'appeared' ? a.appeared_count
             : a.used_count
    const vb = sortKey === 'adoption' ? b.adoption_rate
             : sortKey === 'appeared' ? b.appeared_count
             : b.used_count
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const SORT_COLS: { key: SortKey; label: string }[] = [
    { key: 'adoption', label: '採用率' },
    { key: 'appeared', label: '出現数' },
    { key: 'used',     label: '使用数' },
  ]

  return (
    <Layout>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 pt-4 mb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all text-[18px]"
        >
          ←
        </button>
        <PageTitle>カード統計</PageTitle>
      </div>

      {/* 説明 */}
      <div className="bg-black/25 border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-3 text-[12px] text-white/45 mb-4 leading-relaxed">
        <span className="text-[#c9a84c] font-bold">採用率</span> = ショーダウンで使用された回数 ÷ 手札に配られた回数
      </div>

      {/* ソートタブ */}
      <div className="flex gap-1.5 mb-5">
        {SORT_COLS.map(({ key, label }) => {
          const active = sortKey === key
          return (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold transition-all flex items-center justify-center gap-1"
              style={{
                background: active ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.3)',
                border: `1.5px solid ${active ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.1)'}`,
                color: active ? '#c9a84c' : 'rgba(255,255,255,0.35)',
              }}
            >
              {label}
              <span className="text-[10px]">{active ? (sortDir === 'desc' ? '▼' : '▲') : ''}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[rgba(201,168,76,0.3)] border-t-[#c9a84c] animate-spin" />
          <span className="text-white/40 text-[13px]">読み込み中...</span>
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-[48px] mb-4">📊</div>
          <div className="text-[15px] text-white/50 font-bold mb-2">まだデータがありません</div>
          <div className="text-[12px] text-white/30">ゲームをプレイすると統計が表示されます</div>
        </div>
      ) : (
        <>
          <div className="text-[11px] text-white/30 tracking-[0.15em] mb-3 text-right">
            {stats.length} 件
          </div>
          <div className="space-y-2.5 pb-6">
            {sorted.map((card, i) => {
              const rate = card.adoption_rate
              const barColor = rate >= 70
                ? 'linear-gradient(90deg, #c9a84c, #f5d060)'
                : rate >= 40
                ? 'linear-gradient(90deg, #534AB7, #a89cf7)'
                : 'rgba(255,255,255,0.2)'
              const rateColor = rate >= 70 ? '#f5d060' : rate >= 40 ? '#a89cf7' : 'rgba(255,255,255,0.4)'

              return (
                <div
                  key={card.card_name}
                  className="bg-black/30 border border-[rgba(201,168,76,0.15)] rounded-[14px] px-4 py-3 animate-fade-up"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    {/* 順位 */}
                    <span className="text-[12px] text-white/25 w-5 text-center flex-shrink-0">{i + 1}</span>
                    {/* アバター */}
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[14px] font-bold text-white"
                      style={{ background: card.color, border: '1.5px solid rgba(255,255,255,0.15)' }}
                    >
                      {card.card_name.slice(0, 1)}
                    </div>
                    {/* 名前 */}
                    <span className="text-[14px] font-bold text-[#fdf6e3] flex-1 truncate">
                      {card.card_name}
                    </span>
                    {/* 採用率 */}
                    <span
                      className="text-[20px] font-bold font-playfair flex-shrink-0"
                      style={{ color: rateColor }}
                    >
                      {rate.toFixed(1)}%
                    </span>
                  </div>

                  {/* プログレスバー */}
                  <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(rate, 100)}%`, background: barColor }}
                    />
                  </div>

                  {/* 詳細数値 */}
                  <div className="flex gap-4 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span>出現 <span className="text-white/60 font-bold">{card.appeared_count}</span> 回</span>
                    <span>使用 <span className="text-white/60 font-bold">{card.used_count}</span> 回</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Button variant="ghost" onClick={onBack}>← 戻る</Button>
    </Layout>
  )
}
