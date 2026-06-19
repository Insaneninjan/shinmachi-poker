import { useState } from 'react'
import { Button } from '../components/Button'

const SECRET = 'poker2026'

interface ScreenGateProps {
  onUnlock: () => void
}

export function ScreenGate({ onUnlock }: ScreenGateProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value === SECRET) {
      sessionStorage.setItem('gate_unlocked', '1')
      onUnlock()
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #7a1a1a 0%, #4a0c0c 55%, #2a0606 100%)',
      }}
    >
      <div className="w-full max-w-[340px]">
        {/* ロゴ */}
        <div className="text-center mb-10">
          <div
            className="font-playfair text-[36px] tracking-widest mb-1"
            style={{ color: '#c9a84c', textShadow: '0 0 20px rgba(201,168,76,0.5)' }}
          >
            POKER
          </div>
          <div className="text-[11px] text-white/30 tracking-[0.3em]">PRIVATE ACCESS</div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            placeholder="合言葉を入力"
            autoFocus
            className="w-full px-4 py-4 mb-3 rounded-[10px] text-[16px] text-[#fdf6e3] bg-black/50 outline-none placeholder-white/20 tracking-widest text-center"
            style={{
              border: error
                ? '2px solid rgba(192,57,43,0.8)'
                : '2px solid rgba(201,168,76,0.3)',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'rgba(201,168,76,0.7)'
            }}
            onBlur={e => {
              e.target.style.borderColor = error
                ? 'rgba(192,57,43,0.8)'
                : 'rgba(201,168,76,0.3)'
            }}
          />

          {error && (
            <p className="text-[12px] text-[#ff8a7a] text-center mb-3">
              合言葉が違います
            </p>
          )}

          <Button type="submit" variant="gold" disabled={value.length === 0}>
            入室する
          </Button>
        </form>
      </div>
    </div>
  )
}
