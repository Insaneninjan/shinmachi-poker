import { useState, useRef, useEffect } from 'react'
import { supabase } from '../hooks/useSupabase'
import { getSignedUrlFromProxy } from '../utils/signedUrlProxyClient'
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
  const [avatarsList, setAvatarsList] = useState<Array<{ name?: string; id?: string; updated_at?: string }> | null>(null)
  const [avatarsListLoading, setAvatarsListLoading] = useState(false)
  const [showMembersDebug, setShowMembersDebug] = useState(false)

  // on mount: load members and create signed URLs for private avatars
  useEffect(() => {
    let mounted = true
    async function fetchMembers() {
      try {
        // Do NOT try to detect the bucket from the client for private buckets.
        // Instead, always fetch members and, if a signed-url proxy is configured,
        // use it to obtain signed URLs (proxy has the service role key).
        setAvatarsAvailable(null)

        const { data, error } = await supabase
          .from('members')
          .select('name,color,suit,avatar_path')
          .order('created_at', { ascending: true })
        if (error) {
          console.warn('Failed to fetch members from Supabase:', error.message)
          return
        }
        if (!mounted) return
        if (!data || data.length === 0) return

        // build base members without photo
        type MemberRow = { name: string; color?: string | null; suit?: CardMember['suit'] | null; avatar_path?: string | null }
        const base: CardMember[] = data.map((r: MemberRow, i: number) => ({
          name: r.name,
          photo: null,
          color: r.color ?? COLORS[i % COLORS.length],
          suit: (r.suit ?? SUITS[i % SUITS.length]) as CardMember['suit'],
        }))

        // collect avatar paths and request signed urls in parallel
        const paths = (data as MemberRow[]).map(r => r.avatar_path).filter(Boolean) as string[]
        if (paths.length === 0) {
          setMembers(base)
          return
        }

        // create signed url per path in parallel (Supabase currently supports single createSignedUrl per path)
        const ttl = 3600
        const signedPromises = paths.map(async (p: string) => {
          try {
            if (import.meta.env.VITE_SIGNED_URL_PROXY) {
              // Use the proxy unconditionally when configured (works with private buckets)
              const url = await getSignedUrlFromProxy(import.meta.env.VITE_SIGNED_URL_PROXY, p)
              return { data: { signedUrl: url }, error: null }
            }
            const res = await supabase.storage.from('avatars').createSignedUrl(p, ttl)
            if (res.error) console.debug('createSignedUrl error for', p, res.error)
            return res
          } catch (e) {
            console.debug('createSignedUrl threw for', p, e)
            return { data: null, error: e }
          }
        })
  const signedResults = await Promise.all(signedPromises)
  console.debug('signed-url: paths=', paths)
  console.debug('signed-url: signedResults=', signedResults)

        // Map signed URLs back into base
        let pathIndex = 0
        const withPhotos = (data as MemberRow[]).map((r, i: number) => {
          const photoPath = r.avatar_path
          if (photoPath) {
            const res = signedResults[pathIndex++]
            const url = res?.data?.signedUrl ?? null
            return { ...base[i], photo: url }
          }
          return base[i]
        })

        setMembers(withPhotos)
      } catch (err) {
        console.warn('Error loading members:', err)
      }
    }
    fetchMembers()
    return () => { mounted = false }
  }, [avatarsAvailable])

  // manual retry helper for debugging
  async function retryFetchMembers() {
    try {
      setAvatarsListLoading(true)
      await (async () => {
        // reuse effect logic by calling fetchMembers via creating a new function instance
        const { data, error } = await supabase
          .from('members')
          .select('name,color,suit,avatar_path')
          .order('created_at', { ascending: true })
        if (error) { console.warn('Failed to fetch members from Supabase:', error.message); return }
        const MemberRow = (r: any) => r
        const paths = (data as any[]).map(r => r.avatar_path).filter(Boolean) as string[]
        const ttl = 3600
        const signedPromises = paths.map(async (p: string) => {
          try {
            if (import.meta.env.VITE_SIGNED_URL_PROXY) {
              const url = await getSignedUrlFromProxy(import.meta.env.VITE_SIGNED_URL_PROXY, p)
              return { data: { signedUrl: url }, error: null }
            }
            const res = await supabase.storage.from('avatars').createSignedUrl(p, ttl)
            return res
          } catch (e) {
            return { data: null, error: e }
          }
        })
        const signedResults = await Promise.all(signedPromises)
        console.debug('retry signed-url: paths=', paths)
        console.debug('retry signed-url: signedResults=', signedResults)
      })()
    } finally {
      setAvatarsListLoading(false)
    }
  }

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
    let avatarPath: string | null = null
    let signedUrl: string | null = null

    try {
      if (pendingPhoto) {
        // convert dataURL to blob
        const res = await fetch(pendingPhoto)
        const blob = await res.blob()
        // generate safe filename
        const fileName = `user_${Date.now()}.jpg`
        const uploadRes = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: 'image/jpeg' })
        if (uploadRes?.error) {
          console.warn('avatars upload error', uploadRes.error)
          throw uploadRes.error
        }
        console.debug('avatars upload result', uploadRes)
        avatarPath = fileName
      }

      // insert into members table (avatar_path stored)
  const insertPayload: { name: string; color: string; suit: CardMember['suit']; avatar_path?: string } = { name: newName.trim(), color, suit }
      if (avatarPath) insertPayload.avatar_path = avatarPath
      const { error: dbError } = await supabase.from('members').insert(insertPayload)
      if (dbError) {
        console.warn('members table insert failed:', dbError.message)
        alert(`DB保存に失敗しました: ${dbError.message}`)
      }

      // get signed url to display immediately if we uploaded
      if (avatarPath) {
        try {
          const ttl = 3600
          const { data, error: signError } = await supabase.storage.from('avatars').createSignedUrl(avatarPath, ttl)
          if (!signError && data?.signedUrl) {
            signedUrl = data.signedUrl
          } else if (signError) {
            console.warn('createSignedUrl failed:', signError.message)
            setAvatarsError(String(signError.message))
          }
        } catch (e) {
          console.debug('createSignedUrl threw:', e)
          setAvatarsError(String(e))
        }
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as Record<string, unknown>)['message'] : String(err)
      console.warn('upload/insert failed, falling back to local state', msg)
      alert(`アップロードに失敗しました: ${msg}`)
    } finally {
      // update local state for immediate UI feedback
      setMembers(prev => [...prev, {
        name: newName.trim(),
        photo: signedUrl ?? pendingPhoto,
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
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-block bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.3)] rounded-lg px-3 py-1 text-[13px] text-[#c9a84c]">
          登録済み: {members.length}人
        </span>
        {avatarsAvailable === false && (
          <div className="text-yellow-300 text-sm">※ Supabase Storage の 'avatars' バケットが見つかりません。写真は表示されません。</div>
        )}
        {avatarsError && (
          <div className="text-red-300 text-sm">Storage error: {avatarsError}</div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={async () => {
              setAvatarsListLoading(true)
              try {
                const { data, error } = await supabase.storage.from('avatars').list('', { limit: 200 })
                if (error) {
                  setAvatarsError(error.message)
                  setAvatarsList(null)
                } else {
                  setAvatarsError(null)
                  setAvatarsList(data ?? [])
                }
              } catch (e) {
                setAvatarsError(String(e))
                setAvatarsList(null)
              } finally {
                setAvatarsListLoading(false)
              }
            }}
            className="text-sm px-3 py-1 rounded bg-black/20 hover:bg-black/30 text-white/80 border border-[rgba(201,168,76,0.15)]"
          >
            {avatarsListLoading ? '読み込み中…' : 'Debug: バケット一覧'}
          </button>
          <button
            onClick={() => setShowMembersDebug(s => !s)}
            className="text-sm px-3 py-1 rounded bg-black/20 hover:bg-black/30 text-white/80 border border-[rgba(201,168,76,0.15)]"
          >
            {showMembersDebug ? 'Hide members' : 'Debug: Members'}
          </button>
        </div>
      </div>
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
      {avatarsList && (
        <div className="mt-4 p-3 bg-black/25 border border-[rgba(201,168,76,0.08)] rounded">
          <div className="text-[13px] text-white/70 mb-2">avatars bucket contents ({avatarsList.length})</div>
          <ul className="text-[13px] text-white/60 list-disc list-inside max-h-48 overflow-auto">
            {avatarsList.map((f, idx) => (
              <li key={idx}>{f?.name ?? JSON.stringify(f)}</li>
            ))}
          </ul>
        </div>
      )}
      {showMembersDebug && (
        <div className="mt-4 p-3 bg-black/20 border border-[rgba(201,168,76,0.06)] rounded text-[13px] text-white/80">
          <div className="mb-2">members[] ({members.length})</div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-white/60"><th>#</th><th>Name</th><th>photo</th></tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={i} className="border-t border-white/[0.03]"><td className="pr-2">{i}</td><td>{m.name}</td><td className="break-all">{m.photo ?? '<null>'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
