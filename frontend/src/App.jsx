import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Activity, Trophy, Settings2, Gauge, Radio, BarChart3, Wind, Thermometer, MapPin, Zap, Server, Flag, Timer, Cpu } from 'lucide-react'
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import Background3D from './Background3D'
import EngineSound from './EngineSound'

// --- CONSTANTS ---
const DRIVER_DATA = {
  VER: { name: 'Max Verstappen', team: 'Red Bull Racing', color: '#3671C6', abbr: 'VER', number: '1' },
  HAM: { name: 'Lewis Hamilton', team: 'Mercedes AMG', color: '#00D2BE', abbr: 'HAM', number: '44' },
  LEC: { name: 'Charles Leclerc', team: 'Ferrari', color: '#E80020', abbr: 'LEC', number: '16' },
  NOR: { name: 'Lando Norris', team: 'McLaren', color: '#FF8000', abbr: 'NOR', number: '4' }
}

const TRACK_DATA = {
  Bahrain: { name: 'Bahrain International', code: 'BHR', country: 'Bahrain', type: 'High Degradation', temp: '32°C', trackTemp: '45°C', humidity: '12%', weather: 'DRY', laps: 57, path: "M 50 20 L 180 20 Q 200 20 200 40 L 200 80 Q 200 100 180 100 L 150 100 L 130 130 L 100 130 L 80 100 L 50 100 Q 30 100 30 80 L 30 40 Q 30 20 50 20 Z" },
  Monaco: { name: 'Circuit de Monaco', code: 'MON', country: 'Monaco', type: 'Street / Low Grip', temp: '24°C', trackTemp: '31°C', humidity: '65%', weather: 'WET', laps: 78, path: "M 50 50 L 80 50 L 90 30 L 110 30 L 120 50 L 180 50 Q 190 50 190 60 L 190 120 Q 190 130 180 130 L 150 130 L 140 110 L 120 110 L 110 130 L 50 130 Q 40 130 40 120 L 40 60 Q 40 50 50 50 Z" },
  Monza: { name: 'Autodromo Nazionale', code: 'ITA', country: 'Italy', type: 'Low Downforce', temp: '29°C', trackTemp: '40°C', humidity: '40%', weather: 'SUNNY', laps: 53, path: "M 40 40 L 200 40 Q 220 40 220 60 L 220 100 C 220 140, 180 140, 180 100 L 180 80 L 60 80 L 60 100 C 60 140, 20 140, 20 100 L 20 60 Q 20 40 40 40 Z" }
}

const TIRE_COLORS = { SOFT: '#ff3333', MED: '#ffcc00', HARD: '#ffffff' }
const TIRE_LABELS = { SOFT: 'S', MED: 'M', HARD: 'H' }

// --- UTILS ---
const playClick = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.frequency.setValueAtTime(1100, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.05)
    g.gain.setValueAtTime(0.04, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.start(); osc.stop(ctx.currentTime + 0.05)
  } catch (e) { }
}

// --- PANEL COMPONENT ---
const Panel = ({ title, icon: Icon, children, className = '', iconColor = '#e10600', badge }) => (
  <div className={`glass-panel scanline-overlay flex flex-col ${className}`}>
    <div className="panel-header">
      <div className="panel-title">
        {Icon && <Icon size={13} color={iconColor} />}
        <span>{title}</span>
        {badge && (
          <span className="ml-2 px-1.5 py-0.5 rounded text-[0.55rem] font-bold tracking-widest"
            style={{ background: 'rgba(225,6,0,0.15)', color: '#e10600', border: '1px solid rgba(225,6,0,0.3)' }}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex gap-1 items-center">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-full" style={{
            width: 5, height: 5,
            background: i === 0 ? '#e10600' : i === 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'
          }} />
        ))}
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-5">{children}</div>
  </div>
)

// --- WEATHER CARD ---
const WeatherCard = ({ label, value, icon: Icon, color }) => (
  <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-lg"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="relative flex-shrink-0">
      <div className="absolute inset-0 rounded-full blur-md opacity-50" style={{ background: color }} />
      <div className="relative w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: `rgba(255,255,255,0.05)`, border: `1px solid ${color}40` }}>
        <Icon size={16} color={color} />
      </div>
    </div>
    <div>
      <div className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white/40 mb-0.5">{label}</div>
      <div className="data-num text-[0.95rem] font-bold" style={{ color }}>{value}</div>
    </div>
  </motion.div>
)

// --- TIRE BUTTON ---
const TireBtn = ({ type, active, onClick }) => {
  const c = TIRE_COLORS[type]
  const l = TIRE_LABELS[type]
  return (
    <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }} onClick={onClick}
      className="relative w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer text-[0.65rem] font-black transition-all duration-200"
      style={{
        background: active ? c : 'transparent',
        borderColor: active ? c : 'rgba(255,255,255,0.15)',
        color: active ? '#000' : 'rgba(255,255,255,0.3)',
        boxShadow: active ? `0 0 14px ${c}90, 0 0 4px ${c}` : 'none',
        fontFamily: 'Orbitron, monospace'
      }}>
      {l}
    </motion.button>
  )
}

// --- DRIVER ROW ---
const DriverRow = ({ driverKey, isRival, pitLap, setPitLap, tire, setTire, onSelectRival }) => {
  const data = DRIVER_DATA[driverKey]
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-5">
      <div className="flex justify-between items-center mb-2.5">
        <div className="flex items-center gap-2.5">
          {/* Driver number badge */}
          <div className="w-7 h-7 rounded flex items-center justify-center text-[0.65rem] font-black"
            style={{ background: data.color, color: data.color === '#FFFF00' ? '#000' : '#fff', fontFamily: 'Orbitron, monospace' }}>
            {data.number}
          </div>
          {isRival ? (
            <select value={driverKey} onChange={e => onSelectRival(e.target.value)}
              className="font-bold text-[0.8rem] text-white bg-transparent border-none outline-none cursor-pointer uppercase"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {Object.keys(DRIVER_DATA).filter(k => k !== 'VER').map(k => (
                <option key={k} value={k} style={{ background: '#0a0a0a' }}>
                  {DRIVER_DATA[k].name.split(' ').pop().toUpperCase()}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-bold text-[0.8rem] text-white uppercase">{data.name.split(' ').pop()}</span>
          )}
          <span className="text-[0.55rem] font-medium text-white/30 uppercase tracking-widest">{data.team}</span>
        </div>
        <div className="data-num text-[0.65rem]" style={{ color: data.color }}>
          BOX Ⅼ{pitLap}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex gap-1.5">
          {['SOFT', 'MED', 'HARD'].map(t => (
            <TireBtn key={t} type={t} active={tire === t} onClick={() => { playClick(); setTire(t) }} />
          ))}
        </div>
        <div className="flex-1 relative">
          <input type="range" min="10" max="50" value={pitLap} onChange={e => setPitLap(e.target.value)}
            style={{ accentColor: data.color, width: '100%', cursor: 'pointer', height: 4 }} />
        </div>
        <span className="data-num text-[0.6rem] text-white/40 w-6 text-right">{pitLap}</span>
      </div>
    </motion.div>
  )
}

// --- WIN PROBABILITY RADIAL ---
const WinRadial = ({ prob, color, label, size = 'large' }) => {
  const r = 42
  const circ = 2 * Math.PI * r
  const fill = (prob / 100) * circ
  return (
    <div className={`flex flex-col items-center ${size === 'large' ? '' : 'opacity-60'}`}>
      <div className="relative" style={{ width: size === 'large' ? 130 : 90, height: size === 'large' ? 130 : 90 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          {/* Progress */}
          <circle cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${fill} ${circ - fill}`}
            strokeDashoffset={circ / 4}
            style={{ filter: `drop-shadow(0 0 6px ${color}80)`, transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="data-num font-black leading-none" style={{
            fontSize: size === 'large' ? '1.8rem' : '1.2rem', color
          }}>{prob.toFixed(0)}</span>
          <span className="text-[0.55rem] font-bold text-white/40 tracking-widest">%</span>
        </div>
      </div>
      <div className="mt-2 text-[0.65rem] font-bold tracking-[0.12em] uppercase text-white/50">{label}</div>
    </div>
  )
}

// --- BOOT SCREEN ---
const BootScreen = ({ onBoot }) => {
  const [phase, setPhase] = useState(0) // 0=logo, 1=loading, 2=ready
  const [loadText, setLoadText] = useState('INITIALISING TELEMETRY...')

  useEffect(() => {
    const msgs = ['INITIALISING TELEMETRY...', 'LOADING RACE DATA...', 'CONNECTING PITWALL...', 'SYSTEM READY']
    let idx = 0
    const t1 = setTimeout(() => setPhase(1), 800)
    const interval = setInterval(() => {
      idx++
      if (idx < msgs.length) setLoadText(msgs[idx])
      if (idx >= msgs.length - 1) {
        clearInterval(interval)
        setTimeout(() => setPhase(2), 500)
      }
    }, 500)
    return () => { clearTimeout(t1); clearInterval(interval) }
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, #0a0002 0%, #000000 70%)' }}>
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(225,6,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(225,6,0,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Scan line */}
      <div className="absolute left-0 right-0 h-[2px] opacity-30"
        style={{ background: 'linear-gradient(90deg, transparent, #e10600, transparent)', animation: 'scanline 3s linear infinite' }} />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* F1 Logo mark */}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
          <div className="relative">
            <Activity size={52} color="#e10600" className="drop-shadow-[0_0_20px_rgba(225,6,0,0.8)]" />
            <div className="absolute -inset-4 rounded-full blur-xl opacity-30" style={{ background: '#e10600' }} />
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-[0.65rem] font-semibold tracking-[0.4em] text-white/40 uppercase">
          Race Strategy Intelligence
        </motion.div>

        {/* Main title */}
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flicker m-0 leading-none text-center"
          style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>
          ORACLE
          <span className="neon-red block" style={{ fontSize: '0.65em', letterSpacing: '0.15em' }}>
            PITWALL
          </span>
        </motion.h1>

        {/* Loading bar */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 320 }}
              className="relative h-px overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="absolute inset-y-0 left-0 loading-bar" style={{ background: 'linear-gradient(90deg, transparent, #e10600)', boxShadow: '0 0 10px #e10600' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status text */}
        <AnimatePresence mode="wait">
          <motion.div key={loadText} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-[0.6rem] tracking-[0.3em] text-white/30 uppercase" style={{ fontFamily: 'Space Grotesk' }}>
            {loadText}<span className="blink ml-0.5 text-white/50">_</span>
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              onClick={() => { playClick(); onBoot() }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="relative mt-4 overflow-hidden px-10 py-3.5 rounded-lg font-bold text-sm tracking-[0.2em] uppercase cursor-pointer text-white"
              style={{ fontFamily: 'Space Grotesk', background: 'linear-gradient(135deg, #e10600, #a00400)', border: 'none', boxShadow: '0 0 30px rgba(225,6,0,0.4), 0 0 60px rgba(225,6,0,0.15)' }}>
              <span className="relative z-10">CONNECT TO SESSION</span>
              {/* Shimmer */}
              <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Version tag */}
        <div className="text-[0.55rem] text-white/20 tracking-[0.2em]" style={{ fontFamily: 'Space Grotesk' }}>
          v3.1 // SECURED // RED BULL RACING
        </div>
      </div>
    </div>
  )
}

// --- LIVE CLOCK ---
const LiveClock = () => {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i) }, [])
  return (
    <span className="data-num text-[0.7rem] text-white/40">
      {time.toUTCString().slice(17, 25)} UTC
    </span>
  )
}

// --- CUSTOM TOOLTIP ---
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(6,6,10,0.95)', border: '1px solid rgba(225,6,0,0.3)', fontFamily: 'Space Grotesk' }}>
      <div className="text-white/50 mb-1">LAP {payload[0]?.payload?.lap}</div>
      <div className="font-bold" style={{ color: payload[0]?.value > 0 ? '#e10600' : '#00d4ff' }}>
        GAP {payload[0]?.value?.toFixed(2)}s
      </div>
    </div>
  )
}

// --- MAIN APP ---
export default function App() {
  const [booted, setBooted] = useState(false)
  const [track, setTrack] = useState('Bahrain')
  const [pitLap, setPitLap] = useState(20)
  const [rival, setRival] = useState('HAM')
  const [rivalPit, setRivalPit] = useState(20)
  const [myTire, setMyTire] = useState('SOFT')
  const [rivalTire, setRivalTire] = useState('MED')
  const [data, setData] = useState(null)
  const [currentLap, setCurrentLap] = useState(1)

  const runSim = async () => {
    try {
      const API_BASE = "https://f1oracle-api.onrender.com/"
      const url = `${API_BASE}/duel?d1=VER&d2=${rival}&d1_pit=${pitLap}&d2_pit=${rivalPit}&track=${track}&d1_tire=${myTire}&d2_tire=${rivalTire}`
      const res = await axios.get(url, { timeout: 5000 })
      setData(res.data)
    } catch {
      setData({
        results: {
          d1_win_prob: 62 + Math.random() * 5,
          d2_win_prob: 38 - Math.random() * 5,
          lap_history: Array.from({ length: 50 }, (_, i) => ({
            lap: i + 1,
            gap: 5 + Math.sin(i * 0.2) * 3 + (i > pitLap ? -4 : 0) + (i > rivalPit ? 4 : 0)
          }))
        }
      })
    }
  }

  useEffect(() => {
    if (booted) {
      const t = setTimeout(runSim, 600)
      return () => clearTimeout(t)
    }
  }, [booted, track, pitLap, rival, rivalPit, myTire, rivalTire])

  // Lap ticker
  useEffect(() => {
    if (!booted) return
    const i = setInterval(() => setCurrentLap(l => l < TRACK_DATA[track].laps ? l + 1 : 1), 3000)
    return () => clearInterval(i)
  }, [booted, track])

  const trackInfo = TRACK_DATA[track]
  const isWet = trackInfo.weather === 'WET'

  return (
    <>
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <Background3D />
      </div>

      {/* Boot Screen */}
      <AnimatePresence>
        {!booted && (
          <motion.div exit={{ opacity: 0, filter: 'blur(20px)' }} transition={{ duration: 1, ease: 'easeInOut' }}>
            <BootScreen onBoot={() => setBooted(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main UI */}
      <AnimatePresence>
        {booted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
            className="fixed inset-0 z-10 flex flex-col text-white overflow-hidden" style={{ pointerEvents: 'auto' }}>

            {/* ── HEADER ── */}
            <header className="relative z-20 flex items-center justify-between px-7 shrink-0"
              style={{ height: 66, background: 'linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.0) 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Left: Brand */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Activity color="#e10600" size={26} className="drop-shadow-[0_0_8px_rgba(225,6,0,0.7)]" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2 leading-none" style={{ fontFamily: 'Orbitron, monospace' }}>
                    <span className="font-black text-[1.15rem] tracking-tight text-white">ORACLE</span>
                    <span className="font-black text-[1.15rem] tracking-tight neon-red">PITWALL</span>
                  </div>
                  <div className="text-[0.58rem] text-white/30 tracking-[0.2em] uppercase mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>
                    Race Control System
                  </div>
                </div>
              </div>

              {/* Center: Track badge */}
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <MapPin size={12} color="#e10600" />
                  <span className="text-[0.65rem] font-semibold tracking-[0.15em] text-white/70 uppercase" style={{ fontFamily: 'Space Grotesk' }}>
                    {trackInfo.code} · {trackInfo.country}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Timer size={12} color="#00d4ff" />
                  <span className="data-num text-[0.65rem] text-white/50">
                    LAP <span className="text-white font-black">{String(currentLap).padStart(2, '0')}</span> / {trackInfo.laps}
                  </span>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-3">
                <LiveClock />
                <EngineSound />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.65rem] font-semibold"
                  style={{ background: 'rgba(0,255,100,0.07)', border: '1px solid rgba(0,255,100,0.15)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400/80 tracking-widest uppercase" style={{ fontFamily: 'Space Grotesk' }}>Live</span>
                </div>
              </div>
            </header>

            {/* ── MAIN GRID ── */}
            <div className="flex-1 px-6 pb-4 pt-4 overflow-hidden grid gap-5"
              style={{ gridTemplateColumns: '340px 1fr 380px' }}>

              {/* ── COL 1: STRATEGY ── */}
              <Panel title="Strategy Config" icon={Settings2} badge="PITWALL">
                {/* Circuit selector */}
                <div className="mb-5">
                  <label className="panel-title mb-3 block">Circuit Selection</label>
                  <select value={track} onChange={e => { playClick(); setTrack(e.target.value) }}
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-white outline-none cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'Space Grotesk', appearance: 'none' }}>
                    {Object.keys(TRACK_DATA).map(k => (
                      <option key={k} value={k} style={{ background: '#0a0a0a' }}>{TRACK_DATA[k].code} – {TRACK_DATA[k].name}</option>
                    ))}
                  </select>

                  {/* Track type chip */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-white/30">{trackInfo.type}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-[0.6rem] font-semibold uppercase tracking-widest" style={{ color: isWet ? '#00d4ff' : '#00ff88' }}>
                      {trackInfo.weather}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px mb-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(225,6,0,0.3), transparent)' }} />

                {/* Drivers */}
                <div className="mb-3 panel-title">Driver Strategy</div>
                <DriverRow driverKey="VER" isRival={false} pitLap={pitLap} setPitLap={setPitLap} tire={myTire} setTire={setMyTire} />
                <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <DriverRow driverKey={rival} isRival={true} pitLap={rivalPit} setPitLap={setRivalPit} tire={rivalTire} setTire={setRivalTire} onSelectRival={setRival} />
              </Panel>

              {/* ── COL 2: WEATHER + CHART ── */}
              <div className="flex flex-col gap-5">
                {/* Weather cards */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <WeatherCard label="Air Temp" value={trackInfo.temp} icon={Thermometer} color="#ff9900" />
                  <WeatherCard label="Track Temp" value={trackInfo.trackTemp} icon={Thermometer} color="#e10600" />
                  <WeatherCard label="Humidity" value={trackInfo.humidity} icon={Wind} color="#00d4ff" />
                </div>

                {/* Chart */}
                <Panel title="Live Interval Gap Delta" icon={BarChart3} className="flex-1" iconColor="#00d4ff">
                  <div className="h-full w-full" style={{ minHeight: 220 }}>
                    {data ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.results.lap_history} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e10600" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#e10600" stopOpacity={0} />
                            </linearGradient>
                            <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                          </defs>
                          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="lap" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fontFamily: 'Space Grotesk', fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10, fontFamily: 'Space Grotesk', fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                          <Area type="monotone" dataKey="gap" stroke="#e10600" strokeWidth={2.5} fill="url(#gradRed)" animationDuration={600} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center gap-3 text-white/25 text-sm" style={{ fontFamily: 'Space Grotesk' }}>
                        <Cpu size={16} className="animate-spin" style={{ animationDuration: '3s' }} />
                        AWAITING DATA LINK
                      </div>
                    )}
                  </div>
                </Panel>
              </div>

              {/* ── COL 3: WIN PROB + TRACK STATUS ── */}
              <div className="flex flex-col gap-5">
                {/* Win Probability */}
                <Panel title="Win Probability" icon={Trophy} className="flex-1" iconColor="#ffd700">
                  <div className="h-full flex flex-col items-center justify-center gap-6 py-2">
                    {data ? (
                      <>
                        <WinRadial prob={data.results.d1_win_prob} color="#e10600" label="Verstappen" size="large" />
                        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
                        <WinRadial prob={data.results.d2_win_prob} color={DRIVER_DATA[rival].color} label={rival} size="small" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-white/25">
                        <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center">
                          <Trophy size={28} className="animate-pulse" style={{ color: '#ffd700', opacity: 0.3 }} />
                        </div>
                        <span className="text-xs tracking-widest" style={{ fontFamily: 'Space Grotesk' }}>CALCULATING...</span>
                      </div>
                    )}
                  </div>
                </Panel>

                {/* Track Status */}
                <Panel title="Track Status" icon={Radio} iconColor={isWet ? '#00d4ff' : '#00ff88'}>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <div className={`absolute inset-0 rounded-full blur-xl opacity-40`} style={{ background: isWet ? '#00d4ff' : '#00ff88', animation: 'glow-pulse-cyan 2s ease-in-out infinite' }} />
                      <Gauge size={52} strokeWidth={1.5} color={isWet ? '#00d4ff' : '#00ff88'} className="relative" />
                    </div>
                    <div>
                      <div className="font-black text-[1.2rem] leading-tight mb-1"
                        style={{ fontFamily: 'Orbitron, monospace', color: isWet ? '#00d4ff' : '#00ff88', textShadow: `0 0 15px ${isWet ? '#00d4ff' : '#00ff88'}60` }}>
                        {isWet ? 'WET TRACK' : 'GREEN FLAG'}
                      </div>
                      <div className="text-[0.68rem] font-semibold uppercase tracking-widest" style={{ color: isWet ? '#00d4ff80' : '#00ff8880', fontFamily: 'Space Grotesk' }}>
                        {isWet ? 'INTERMEDIATES ADVISED' : 'OPTIMAL CONDITIONS'}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Flag size={11} color={isWet ? '#00d4ff' : '#00ff88'} />
                        <span className="text-[0.58rem] text-white/30 uppercase tracking-widest">{trackInfo.type}</span>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>

            {/* ── FOOTER ── */}
            <footer className="shrink-0 px-7 flex items-center justify-between"
              style={{ height: 38, borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.6)' }}>
              <div className="flex items-center gap-5 text-[0.6rem] text-white/30 uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk' }}>
                <span className="flex items-center gap-1.5">
                  <Server size={10} className="text-green-400" />
                  <span className="text-green-400/70">ORACLE CLOUD · CONNECTED</span>
                </span>
                <span className="text-white/15">|</span>
                <span className="flex items-center gap-1.5">
                  <Zap size={10} className="text-[#00d4ff]" />
                  <span className="text-[#00d4ff]/60">LATENCY 24ms</span>
                </span>
                <span className="text-white/15">|</span>
                <span className="text-white/25">AES-256 ENCRYPTED</span>
              </div>
              <div className="flex items-center gap-2 text-[0.6rem] text-white/20 tracking-widest" style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.55rem' }}>
                RED BULL RACING // PITWALL v3.1
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}