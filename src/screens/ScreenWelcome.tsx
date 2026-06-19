import { useState, useRef, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'
import { Button } from '../components/Button'
import {
  Layout,
  GoldDivider,
  FormPanel,
  PageTitle,
  PageSub,
  SectionLabel,
} from '../components/Layout'
import type { CardMember } from '../types/game'

const COLORS = [
  '#534AB7','#0F6E56','#993C1D','#993556','#185FA5',
  '#3B6D11','#854F0B','#A32D2D','#5F5E5A','#0F6E56',
]
const SUITS: CardMember['suit'][] = ['♠', '♥', '♦', '♣']
const DUMMY_NAMES = [
  '田中太郎','鈴木花子','佐藤健一','山田美咲','伊藤拓海',
  '渡辺さくら','小林大輔','加藤彩花','吉田翔太','山本葵',
  '中村隼人','松本優子','井上裕介','木村菜々','林竜也',
  '清水あかり','池田浩二','橋本みのり','前田昭夫','石川ゆき',
  '岡田真一','長谷川恵','藤原宗介','西川奈緒','村上慶太',
  '金子ひろ','近藤武史','坂本麻衣','遠藤亮','斉藤千夏',
  '三浦豪太','柴田梨沙','福田正樹','高橋莉子','森田悠斗',
  '原田みく','上田徹','小川ひなた','谷口賢二','野村あゆみ',
  '関口晴彦','松田りん','杉本大樹','上野さな','橋田光司',
  '大野香織','川口雄介','宮崎えみ','本田浩一','内田はるか',
]

interface ScreenWelcomeProps {
  onStartGame: (hostName: string, playerNames: string[], members: CardMember[]) => Promise<void>
  onJoin: () => void
}

type SubScreen = 'home' | 'menu' | 'cards' | 'players'

export function ScreenWelcome({ onStartGame, onJoin }: ScreenWelcomeProps) {
  const [sub, setSub] = useState<SubScreen>('home')
  const [members, setMembers] = useState<CardMember[]>(
    DUMMY_NAMES.map((name, i) => ({
      name,
      photo: null,
      color: COLORS[i % COLORS.length],
      suit: SUITS[i % SUITS.length],
    }))
  )
const [playerNames, setPlayerNames] = useState<string[]>(['', '', ''])
  const [hostName, setHostName] = useState('')
  const [newName, setNewName] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [avatarsAvailable, setAvatarsAvailable] = useState<boolean | null>(null)
  const [avatarsError, setAvatarsError] = useState<string | null>(null)
  const [avatarsList, setAvatarsList] = useState<Array<{ name?: string; id?: string | null; updated_at?: string | null }> | null>(null)
  const [avatarsListLoading, setAvatarsListLoading] = useState(false)
  const [showMembersDebug, setShowMembersDebug] = useState(false)

  // on mount, try to load persisted members from Supabase members table and create signed URLs for private avatars
  useEffect(() => {
    let mounted = true
    async function loadMembers() {
      try {
        const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: true })
        if (error) {
          console.warn('Failed to fetch members from Supabase:', error.message)
          return
        }
        if (!mounted) return
        if (data && data.length > 0) {
          // map DB rows to CardMember shape
          const mapped = data.map((r: any) => ({
            name: r.name as string,
            photo: r.photo ?? null,
            color: r.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
            suit: (r.suit as CardMember['suit']) ?? SUITS[Math.floor(Math.random() * SUITS.length)],
          }))
          setMembers(mapped)
        }
      } catch (err) {
        console.warn('Error loading members:', err)
      }
    }
    loadMembers()
    return () => { mounted = false }
  }, [avatarsAvailable])

  // (debug helper removed) Use the component's effect to refresh members instead

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 120
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')!
        const s = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        setPendingPhoto(dataUrl)
        setPreviewUrl(dataUrl)
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  async function addMember() {
    if (!newName.trim()) { alert('名前を入力してね'); return }
    const i = members.length
    const color = COLORS[i % COLORS.length]
    const suit = SUITS[i % SUITS.length]

    setLoading(true)
    let photoUrl: string | null = null

    try {
      if (pendingPhoto) {
        // pendingPhoto is a data URL; convert to Blob
        const res = await fetch(pendingPhoto)
        const blob = await res.blob()
        const fileName = `cards/${Date.now()}-${newName.trim().replace(/\s+/g, '_')}.jpg`
        const { error: uploadError } = await supabase.storage.from('cards').upload(fileName, blob, { contentType: 'image/jpeg' })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('cards').getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }

      // Try to insert into members table; if it doesn't exist, catch and fallback
      const insertPayload = { name: newName.trim(), photo: photoUrl, color, suit }
      const { error: dbError } = await supabase.from('members').insert(insertPayload)
      if (dbError) {
        // Table might not exist or other DB error — inform user and fallback
        console.warn('members table insert failed, falling back to local state:', dbError.message)
        alert(`メンバー登録はローカルでのみ保存されました（DB保存に失敗しました）: ${dbError.message}`)
      }
    } catch (err: unknown) {
  const msg = err && typeof err === 'object' && 'message' in err ? (err as Record<string, unknown>)['message'] : String(err)
      console.warn('upload/insert failed, falling back to local state', msg)
      // continue to local state update
    } finally {
      // Update local state regardless of success/failure
      setMembers(prev => [...prev, {
        name: newName.trim(),
        photo: photoUrl ?? pendingPhoto,
        color,
        suit,
      }])
      setNewName('')
      setPendingPhoto(null)
      setPreviewUrl(null)
      if (fileRef.current) fileRef.current.value = ''
      setLoading(false)
    }
  }

  function removeMember(i: number) {
    setMembers(members.filter((_, idx) => idx !== i))
  }

  function addPlayer() { setPlayerNames([...playerNames, '']) }
  function removePlayer(i: number) {
    if (playerNames.length <= 2) { alert('最低2人必要です'); return }
    setPlayerNames(playerNames.filter((_, idx) => idx !== i))
  }

  async function handleStart() {
    const host = hostName.trim() || 'ホスト'
    const players = playerNames.map((p, i) => p.trim() || `プレイヤー${i + 1}`)
    if (players.length < 2) { alert('プレイヤーを2人以上設定してね'); return }
    if (members.length < players.length * 5) {
      alert(`カードが足りません（必要: ${players.length * 5}枚、現在: ${members.length}枚）`)
      return
    }
    setLoading(true)
    try {
      await onStartGame(host, players, members)
    } finally {
      setLoading(false)
    }
  }

  if (sub === 'home') return (
    <Layout>
      <div className="text-center py-10">
        <div
          className="w-[110px] h-[110px] rounded-full mx-auto mb-5 flex items-center justify-center text-[52px]"
          style={{
            border: '3px solid #c9a84c',
            background: 'radial-gradient(circle, #1e6b42, #0e3d26)',
            boxShadow: '0 0 30px rgba(201,168,76,0.3)',
            animation: 'pulse-ring 3s ease-in-out infinite',
          }}
        >
          🃏
        </div>
        <h1 className="font-playfair text-[32px] text-[#c9a84c]" style={{ textShadow: '0 0 20px rgba(201,168,76,0.5)' }}>
          新町ポーカー
        </h1>
        <p className="text-white/40 text-[13px] tracking-[0.12em] mt-2">
          友達の顔でポーカーを楽しもう
        </p>
      </div>
      <GoldDivider />
      <div className="space-y-3">
        <Button variant="gold" onClick={() => setSub('menu')}>♛ &nbsp;ゲームをセットアップ</Button>
        <Button variant="outline" onClick={onJoin}>♟ &nbsp;ゲームに参加する</Button>
      </div>
    </Layout>
  )

  if (sub === 'menu') return (
    <Layout>
      <PageTitle>セットアップ</PageTitle>
      <PageSub>カード登録とプレイヤー設定をしよう</PageSub>
      <FormPanel>
        <label className="text-[11px] text-[#c9a84c] font-bold tracking-[0.1em] uppercase block mb-2">
          あなたの名前（ホスト）
        </label>
        <input
          className="w-full px-4 py-3 bg-black/40 border border-[rgba(201,168,76,0.3)] rounded-lg text-[15px] text-[#fdf6e3] outline-none focus:border-[#c9a84c] placeholder-white/30"
          value={hostName}
          onChange={e => setHostName(e.target.value)}
          placeholder="例: 田中太郎"
        />
      </FormPanel>
      <div className="space-y-3 mb-4">
        <Button variant="outline" onClick={() => setSub('cards')}>🃏 &nbsp;カード登録（{members.length}人）</Button>
        <Button variant="outline" onClick={() => setSub('players')}>👥 &nbsp;プレイヤー設定（{playerNames.length}人）</Button>
      </div>
      <GoldDivider />
      <Button variant="gold" onClick={handleStart} disabled={loading}>
        {loading ? '準備中...' : '▶ &nbsp;ゲーム開始！'}
      </Button>
      <Button variant="ghost" onClick={() => setSub('home')} className="mt-2">← 戻る</Button>
    </Layout>
  )

  if (sub === 'cards') return (
    <Layout>
      <PageTitle>カード登録</PageTitle>
      <span className="inline-block bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.3)] rounded-lg px-3 py-1 text-[13px] text-[#c9a84c] mb-4">
        登録済み: {members.length}人
      </span>
      <FormPanel>
        <label className="text-[11px] text-[#c9a84c] font-bold tracking-[0.1em] uppercase block mb-2">名前</label>
        <input
          className="w-full px-4 py-3 bg-black/40 border border-[rgba(201,168,76,0.3)] rounded-lg text-[15px] text-[#fdf6e3] outline-none focus:border-[#c9a84c] placeholder-white/30 mb-3"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="田中太郎"
          onKeyDown={e => e.key === 'Enter' && addMember()}
        />
        <label className="text-[11px] text-[#c9a84c] font-bold tracking-[0.1em] uppercase block mb-2">写真（任意）</label>
        <div
          className="border border-dashed border-[rgba(201,168,76,0.4)] rounded-lg p-4 text-center cursor-pointer text-white/40 text-[13px] bg-black/20 hover:border-[#c9a84c] hover:text-[#c9a84c] transition-all mb-3"
          onClick={() => fileRef.current?.click()}
        >
          {previewUrl
            ? <img src={previewUrl} className="max-h-20 rounded mx-auto" alt="preview" />
            : '📷 タップして写真を選ぶ'}
        </div>
        <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handlePhotoChange} />
        <Button variant="gold" onClick={addMember}>＋ &nbsp;追加</Button>
      </FormPanel>
      <SectionLabel>登録メンバー</SectionLabel>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {members.map((m, i) => (
          <div key={i} className="bg-black/35 border border-[rgba(201,168,76,0.2)] rounded-xl p-3 text-center relative">
            <button
              className="absolute top-1 right-1 text-white/25 text-sm hover:text-red-400 transition-colors bg-none border-none cursor-pointer"
              onClick={() => removeMember(i)}
            >✕</button>
            <div
              className="w-[50px] h-[50px] rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-white overflow-hidden"
              style={{ background: m.color, border: '2px solid rgba(201,168,76,0.3)' }}
            >
              {m.photo ? <img src={m.photo} className="w-full h-full object-cover" alt={m.name} /> : m.name.slice(0, 1)}
            </div>
            <div className="text-[11px] text-white/80 font-medium">{m.name}</div>
          </div>
        ))}
      </div>
      <Button variant="ghost" onClick={() => setSub('menu')}>← 戻る</Button>
    </Layout>
  )

  // players
  return (
    <Layout>
      <PageTitle>プレイヤー設定</PageTitle>
      <PageSub>プレイヤー名を入力しよう（ジャッジは自動で回ります）</PageSub>
      <div className="mb-4">
        {playerNames.map((p, i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-white/[0.06]">
            <input
              className="flex-1 px-3 py-2 bg-black/40 border border-[rgba(201,168,76,0.3)] rounded-lg text-[14px] text-[#fdf6e3] outline-none focus:border-[#c9a84c] placeholder-white/30"
              value={p}
              onChange={e => {
                const updated = [...playerNames]
                updated[i] = e.target.value
                setPlayerNames(updated)
              }}
              placeholder={`プレイヤー${i + 1}`}
            />
            <button
              className="text-white/20 text-lg hover:text-red-400 transition-colors bg-none border-none cursor-pointer"
              onClick={() => removePlayer(i)}
            >✕</button>
          </div>
        ))}
      </div>
      <Button variant="outline" onClick={addPlayer} className="mb-4">＋ &nbsp;プレイヤーを追加</Button>
      <Button variant="ghost" onClick={() => setSub('menu')}>← 戻る</Button>
    </Layout>
  )
}
