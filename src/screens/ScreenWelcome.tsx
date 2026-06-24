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
  onCreateLobby: (hostName: string, members: CardMember[], timerEnabled: boolean) => Promise<void>
  onJoin: () => void
  onStats: () => void
}

type SubScreen = 'home' | 'menu' | 'cards'

export function ScreenWelcome({ onCreateLobby, onJoin, onStats }: ScreenWelcomeProps) {
  const [sub, setSub] = useState<SubScreen>('home')
  const [members, setMembers] = useState<CardMember[]>(
    DUMMY_NAMES.map((name, i) => ({
      name,
      photo: null,
      color: COLORS[i % COLORS.length],
      suit: SUITS[i % SUITS.length],
    }))
  )
  const [hostName, setHostName] = useState('')
  const [newName, setNewName] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  // 名前編集：編集中のindex（null = 非編集）と入力値
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [avatarsAvailable, setAvatarsAvailable] = useState<boolean | null>(null)
  const [avatarsError, setAvatarsError] = useState<string | null>(null)
  const [avatarsList, setAvatarsList] = useState<Array<{ name?: string; id?: string | null; updated_at?: string | null }> | null>(null)
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
          .select('id,name,color,suit,avatar_path')   // id を取得して名前重複バグを防ぐ
          .order('created_at', { ascending: true })
        if (error) {
          console.warn('Failed to fetch members from Supabase:', error.message)
          return
        }
        if (!mounted) return
        if (!data || data.length === 0) return

        // build base members without photo
        type MemberRow = { id: string; name: string; color?: string | null; suit?: CardMember['suit'] | null; avatar_path?: string | null }
        const base: CardMember[] = data.map((r: MemberRow, i: number) => ({
          id: r.id,
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
    const target = members[i]
    if (!window.confirm(`「${target.name}」を削除しますか？`)) return
    // 編集中のインデックスが削除対象以降ならリセット（別カードを誤って編集するバグ防止）
    if (editingIndex !== null && editingIndex >= i) setEditingIndex(null)
    setMembers(prev => prev.filter((_, idx) => idx !== i))
    // DB からも削除（id があれば確実に、なければ name+color で特定）
    if (target.id) {
      supabase.from('members').delete().eq('id', target.id).then(({ error }) => {
        if (error) console.warn('members delete failed:', error.message)
      })
    }
  }

  function startEditing(i: number) {
    setEditingIndex(i)
    setEditingName(members[i].name)
  }

  async function saveName(i: number) {
    const trimmed = editingName.trim()
    if (!trimmed) { setEditingIndex(null); return }
    if (trimmed === members[i].name) { setEditingIndex(null); return }

    setEditSaving(true)
    const target = members[i]
    // id で特定するのが最も安全（同名メンバーが複数いても誤更新しない）
    const filter = target.id
      ? supabase.from('members').update({ name: trimmed }).eq('id', target.id)
      : supabase.from('members').update({ name: trimmed }).eq('name', target.name).eq('color', target.color)
    const { error } = await filter
    if (error) {
      alert(`保存に失敗しました: ${error.message}`)
      setEditSaving(false)
      return
    }
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, name: trimmed } : m))
    setEditingIndex(null)
    setEditSaving(false)
  }

  async function handleCreateLobby() {
    const host = hostName.trim() || 'ホスト'
    if (members.length < 5) {
      alert(`カードが足りません（最低5枚必要、現在: ${members.length}枚）`)
      return
    }
    setLoading(true)
    try {
      await onCreateLobby(host, members, timerEnabled)
    } finally {
      setLoading(false)
    }
  }

  if (sub === 'home') return (
    <Layout>
      <div className="text-center pt-12 pb-6">
        {/* タイトルロゴ */}
        <div className="mb-6 animate-fade-up">
          {/* 上部装飾ライン */}
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c)' }} />
            <span className="text-[10px] tracking-[0.3em] font-bold" style={{ color: '#c9a84c' }}>SHINMACHI</span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, #c9a84c, transparent)' }} />
          </div>

          {/* メインタイトル */}
          <div
            className="inline-block px-8 py-4 rounded-2xl mb-3 animate-title-pulse"
            style={{
              background: 'linear-gradient(160deg, #1f5c1f 0%, #143d14 100%)',
              border: '2px solid #c9a84c',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <h1
              className="text-[32px] font-bold tracking-wider"
              style={{ color: '#f5e070', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
            >
              新町ポーカー
            </h1>
          </div>

          {/* サブタイトル */}
          <p className="text-[11px] tracking-[0.2em] text-white/40">
            友達の顔でポーカーを楽しもう
          </p>
        </div>

        {/* カードアイコン */}
        <div className="text-[38px] mb-2" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }}>
          🃏
        </div>
      </div>

      <GoldDivider />
      <div className="space-y-3">
        <Button variant="gold" onClick={() => setSub('menu')}>🏠 部屋を作る（ホスト）</Button>
        <Button variant="gold" onClick={onJoin}>📲 部屋に参加する</Button>
        <Button variant="gold" onClick={onStats}>📊 カード統計</Button>
      </div>
    </Layout>
  )

  if (sub === 'menu') return (
    <Layout>
      <PageTitle>部屋を作る</PageTitle>
      <PageSub>あなたの名前を入力してカードを準備しよう</PageSub>
      <FormPanel>
        <label className="text-[11px] text-[#c9a84c] font-bold tracking-[0.1em] uppercase block mb-2">
          あなたの名前（ホスト）
        </label>
        <input
          className="w-full px-4 py-3 bg-black/40 border border-[rgba(201,168,76,0.3)] rounded-lg text-[15px] text-[#fdf6e3] outline-none focus:border-[#c9a84c] placeholder-white/30"
          value={hostName}
          onChange={e => setHostName(e.target.value)}
          placeholder="例: 田中太郎"
          onKeyDown={e => e.key === 'Enter' && handleCreateLobby()}
        />
      </FormPanel>
      <div className="space-y-3 mb-4">
        <Button variant="outline" onClick={() => setSub('cards')}>🃏 カード登録（{members.length}枚）</Button>
      </div>

      {/* タイマー設定 */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-[12px] mb-4 cursor-pointer transition-all"
        style={{
          background: timerEnabled ? 'rgba(201,168,76,0.08)' : 'rgba(0,0,0,0.25)',
          border: timerEnabled ? '1.5px solid rgba(201,168,76,0.35)' : '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={() => setTimerEnabled(v => !v)}
      >
        <div>
          <div className="text-[14px] font-bold text-[#fdf6e3]">⏱ オープン制限タイマー</div>
          <div className="text-[11px] text-white/40 mt-0.5">
            {timerEnabled ? '3分以内に役とタイトルを入力する必要があります' : '時間制限なし'}
          </div>
        </div>
        <div
          className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all"
          style={{ background: timerEnabled ? '#c9a84c' : 'rgba(255,255,255,0.15)' }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
            style={{ left: timerEnabled ? '22px' : '2px' }}
          />
        </div>
      </div>

      <div className="bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.15)] rounded-xl px-4 py-3 text-[12px] text-white/50 mb-4">
        📌 プレイヤーはルームコードを使って後から自分で参加できます
      </div>
      <GoldDivider />
      <Button variant="gold" onClick={handleCreateLobby} disabled={loading}>
        {loading ? '部屋を作成中...' : '🏠 部屋を作る'}
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
        <Button variant="gold" onClick={addMember}>＋ 追加</Button>
      </FormPanel>
      <SectionLabel>登録メンバー</SectionLabel>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {members.map((m, i) => (
          <div key={i} className="bg-black/35 border border-[rgba(201,168,76,0.2)] rounded-xl p-3 text-center relative">
            {/* 削除ボタン */}
            <button
              className="absolute top-1 right-1 text-white/25 text-sm hover:text-red-400 transition-colors bg-none border-none cursor-pointer"
              onClick={() => removeMember(i)}
            >✕</button>
            {/* 編集ボタン */}
            {editingIndex !== i && (
              <button
                className="absolute top-1 left-1 text-white/25 text-sm hover:text-[#c9a84c] transition-colors bg-none border-none cursor-pointer"
                onClick={() => startEditing(i)}
                title="名前を編集"
              >✏️</button>
            )}
            {/* アバター */}
            <div
              className="w-[50px] h-[50px] rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-white overflow-hidden"
              style={{ background: m.color, border: '2px solid rgba(201,168,76,0.3)' }}
            >
              {m.photo ? <img src={m.photo} className="w-full h-full object-cover" alt={m.name} /> : m.name.slice(0, 1)}
            </div>
            {/* 名前 or インライン編集 */}
            {editingIndex === i ? (
              <div className="flex flex-col gap-1">
                <input
                  autoFocus
                  className="w-full px-2 py-1 bg-black/60 border border-[#c9a84c] rounded text-[12px] text-[#fdf6e3] outline-none text-center"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveName(i)
                    if (e.key === 'Escape') setEditingIndex(null)
                  }}
                />
                <div className="flex gap-1 justify-center">
                  <button
                    className="text-[10px] px-2 py-[2px] rounded bg-[rgba(201,168,76,0.3)] text-[#c9a84c] border border-[rgba(201,168,76,0.4)] cursor-pointer disabled:opacity-40"
                    onClick={() => saveName(i)}
                    disabled={editSaving}
                  >{editSaving ? '…' : '✓'}</button>
                  <button
                    className="text-[10px] px-2 py-[2px] rounded bg-black/40 text-white/50 border border-white/10 cursor-pointer"
                    onClick={() => setEditingIndex(null)}
                  >✕</button>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-white/80 font-medium">{m.name}</div>
            )}
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

  // cards 画面にフォールバック（sub === 'cards' は上でハンドル済み）
  return null
}
