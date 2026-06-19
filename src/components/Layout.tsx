import type { ReactNode } from 'react'

const GOLD = '#c9a84c'
const GOLD_ALPHA = 'rgba(201,168,76,0.3)'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #7a1a1a 0%, #4a0c0c 55%, #2a0606 100%)',
      }}
    >
      {/* フェルトテクスチャ（控えめ） */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg,  rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 7px),
            repeating-linear-gradient(-45deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 7px)
          `,
        }}
      />
      {/* スポットライト（上から） */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(255,235,160,0.08) 0%, transparent 100%)',
        }}
      />
      <div className="relative max-w-[480px] mx-auto px-4 pb-20">
        {children}
      </div>
    </div>
  )
}

export function GoldDivider() {
  return (
    <div
      className="h-px my-6"
      style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
    />
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD_ALPHA})` }} />
      <span className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: GOLD }}>
        {children}
      </span>
      <span className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${GOLD_ALPHA}, transparent)` }} />
    </div>
  )
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[22px] font-bold text-white mb-1 pt-5 tracking-tight">
      {children}
    </h1>
  )
}

export function PageSub({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-white/45 mb-5 leading-relaxed">{children}</p>
}

export function FormPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{ background: 'rgba(0,0,0,0.32)', border: `1px solid ${GOLD_ALPHA}` }}
    >
      {children}
    </div>
  )
}

export function InfoPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-[13px] mb-4 leading-relaxed"
      style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', color: '#e0c870' }}
    >
      {children}
    </div>
  )
}

export function SuccessPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-[13px] mb-4 leading-relaxed"
      style={{ background: 'rgba(20,80,40,0.4)', border: '1px solid rgba(74,222,128,0.2)', color: '#86efac' }}
    >
      {children}
    </div>
  )
}

export function WarningPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-[13px] mb-4 leading-relaxed text-white/50"
      style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </div>
  )
}

export function RoomCodePanel({ code }: { code: string }) {
  return (
    <div
      className="rounded-2xl p-6 text-center mb-4"
      style={{
        background: 'linear-gradient(160deg, #1c0808 0%, #2a0e0e 100%)',
        border: `2px solid ${GOLD}`,
        boxShadow: `0 0 24px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.1)`,
      }}
    >
      <div className="text-[10px] font-bold tracking-[0.28em] mb-2" style={{ color: GOLD }}>
        ROOM CODE
      </div>
      <div
        className="font-playfair text-[52px] tracking-[16px] text-[#fdf6e3]"
        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
      >
        {code}
      </div>
    </div>
  )
}

export function BadgeGold({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-block px-2 py-[2px] rounded text-[10px] font-bold"
      style={{ background: 'rgba(201,168,76,0.12)', color: GOLD, border: '1px solid rgba(201,168,76,0.35)' }}
    >
      {children}
    </span>
  )
}

export function BadgeGreen({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block px-2 py-[2px] rounded text-[10px] font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-700/35">
      {children}
    </span>
  )
}

interface PhaseBannerProps { phase: string; name: string; desc: string }

const PHASE_COLOR: Record<string, { dot: string; bg: string }> = {
  change: { dot: '#facc15', bg: 'rgba(250,204,21,0.05)' },
  open:   { dot: '#fb923c', bg: 'rgba(251,146,60,0.05)' },
  judge:  { dot: '#a78bfa', bg: 'rgba(167,139,250,0.05)' },
  winner: { dot: '#a78bfa', bg: 'rgba(167,139,250,0.05)' },
}

export function PhaseBanner({ phase, name, desc }: PhaseBannerProps) {
  const c = PHASE_COLOR[phase] ?? PHASE_COLOR.change
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
      style={{ background: c.bg, border: `1px solid ${c.dot}38` }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot, boxShadow: `0 0 5px ${c.dot}` }} />
      <span className="text-[13px] font-bold text-white/90">{name}</span>
      {desc && <span className="text-[11px] text-white/38 ml-auto">{desc}</span>}
    </div>
  )
}

interface ProgressBarProps { current: number; total: number }

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="mb-3">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GOLD}, #e0c870)` }}
        />
      </div>
      <div className="text-[11px] text-white/32 text-center mt-1.5">{current} / {total} 人完了</div>
    </div>
  )
}
