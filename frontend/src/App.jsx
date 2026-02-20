import { useState, useEffect } from 'react'
import axios from 'axios'
import { Activity, Trophy, Settings2, Gauge, Radio, BarChart3, Wind, Thermometer, MapPin, Zap, Server } from 'lucide-react'
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import Background3D from './Background3D'
import EngineSound from './EngineSound'

// --- CONSTANTS ---
const DRIVER_DATA = {
  VER: { name: 'Max Verstappen', team: 'Red Bull Racing', color: '#3671C6', img: 'https://placehold.co/200x250/3671C6/FFFFFF.png?text=VER&font=oswald' },
  HAM: { name: 'Lewis Hamilton', team: 'Mercedes AMG', color: '#00D2BE', img: 'https://placehold.co/200x250/00d2be/000000.png?text=HAM&font=oswald' },
  LEC: { name: 'Charles Leclerc', team: 'Ferrari', color: '#E80020', img: 'https://placehold.co/200x250/e80020/FFFFFF.png?text=LEC&font=oswald' },
  NOR: { name: 'Lando Norris', team: 'McLaren', color: '#FF8000', img: 'https://placehold.co/200x250/ff8000/000000.png?text=NOR&font=oswald' }
}

const TRACK_DATA = {
  Bahrain: { name: 'Bahrain International', code: 'BHR', type: 'High Degradation', temp: '32°C', trackTemp: '45°C', humidity: '12%', weather: 'DRY', path: "M 50 20 L 180 20 Q 200 20 200 40 L 200 80 Q 200 100 180 100 L 150 100 L 130 130 L 100 130 L 80 100 L 50 100 Q 30 100 30 80 L 30 40 Q 30 20 50 20 Z" },
  Monaco: { name: 'Circuit de Monaco', code: 'MON', type: 'Street / Low Grip', temp: '24°C', trackTemp: '31°C', humidity: '65%', weather: 'WET', path: "M 50 50 L 80 50 L 90 30 L 110 30 L 120 50 L 180 50 Q 190 50 190 60 L 190 120 Q 190 130 180 130 L 150 130 L 140 110 L 120 110 L 110 130 L 50 130 Q 40 130 40 120 L 40 60 Q 40 50 50 50 Z" },
  Monza: { name: 'Autodromo Nazionale', code: 'ITA', type: 'Low Downforce', temp: '29°C', trackTemp: '40°C', humidity: '40%', weather: 'SUNNY', path: "M 40 40 L 200 40 Q 220 40 220 60 L 220 100 C 220 140, 180 140, 180 100 L 180 80 L 60 80 L 60 100 C 60 140, 20 140, 20 100 L 20 60 Q 20 40 40 40 Z" }
}

// --- UTILS ---
const playClick = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05)
    g.gain.setValueAtTime(0.05, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    osc.start(); osc.stop(ctx.currentTime + 0.05)
  } catch (e) { }
}

// --- COMPONENTS ---
const Panel = ({ title, icon: Icon, children, className }) => (
  <div className={`bg-black/65 backdrop-blur-xl border border-white/[0.08] rounded-lg overflow-hidden flex flex-col ${className || ''}`}>
    <div className="px-5 py-3 border-b border-white/[0.05] flex justify-between items-center bg-black/20">
      <div className="flex items-center gap-2.5 font-bold text-[0.8rem] text-[#ccc] tracking-widest uppercase">
        {Icon && <Icon size={14} color="#e10600" />} {title}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-[#333] rounded-full" />)}
      </div>
    </div>
    <div className="p-5 flex-1 overflow-y-auto">{children}</div>
  </div>
)

const WeatherData = ({ label, value, icon: Icon, color }) => (
  <div className="flex items-center gap-3 bg-white/[0.02] px-3 py-2 rounded border border-white/[0.05]">
    <Icon size={18} color={color} />
    <div>
      <div className="text-[0.6rem] text-[#666] font-bold uppercase">{label}</div>
      <div className="text-[0.9rem] font-bold font-mono text-[#eee]">{value}</div>
    </div>
  </div>
)

const DriverRow = ({ driverKey, isRival, pitLap, setPitLap, tire, setTire, onSelectRival }) => {
  const data = DRIVER_DATA[driverKey];
  return (
    <div className="mb-5">
      <div className="flex justify-between mb-2 items-center">
        <div className="flex gap-2 items-center">
          {/* Driver color bar — dynamic color must stay inline */}
          <div style={{ width: 3, height: 16, background: data.color }} />
          <span className="font-black text-[0.9rem] text-white">{data.name.split(' ').pop().toUpperCase()}</span>
          {isRival && (
            <select value={driverKey} onChange={(e) => onSelectRival(e.target.value)}
              className="bg-black border border-[#333] text-[#888] text-[0.7rem] px-1.5 py-0.5 rounded">
              {Object.keys(DRIVER_DATA).filter(k => k !== 'VER').map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
        </div>
        {/* Driver accent color — dynamic, must stay inline */}
        <span style={{ color: data.color }} className="font-mono text-[0.7rem]">BOX: LAP {pitLap}</span>
      </div>
      <div className="flex gap-2.5 bg-black/30 p-2.5 rounded-md border border-white/[0.05]">
        <div className="flex gap-1">
          {['S', 'M', 'H'].map(t => {
            const full = t === 'S' ? 'SOFT' : t === 'M' ? 'MED' : 'HARD';
            const c = t === 'S' ? '#ff3333' : t === 'M' ? '#ffcc00' : '#fff';
            const active = tire === full;
            return (
              <div key={t} onClick={() => { playClick(); setTire(full); }}
                style={{
                  background: active ? c : 'transparent',
                  borderColor: active ? '#fff' : '#333',
                  color: active ? '#000' : '#666'
                }}
                className="w-6 h-6 rounded-full border flex items-center justify-center text-[0.6rem] font-bold cursor-pointer">
                {t}
              </div>
            )
          })}
        </div>
        {/* accentColor must stay inline — not a Tailwind utility in v4 */}
        <input type="range" min="10" max="50" value={pitLap} onChange={(e) => setPitLap(e.target.value)}
          style={{ accentColor: data.color }} className="flex-1 cursor-pointer" />
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

  // --- API CONNECTION LOGIC ---
  const runSim = async () => {
    try {
      const API_BASE = "https://f1oracle-api.onrender.com/"
      const url = `${API_BASE}/duel?d1=VER&d2=${rival}&d1_pit=${pitLap}&d2_pit=${rivalPit}&track=${track}&d1_tire=${myTire}&d2_tire=${rivalTire}`
      const res = await axios.get(url, { timeout: 5000 })
      setData(res.data)
    } catch (e) {
      console.warn("API Offline or Sleeping, using Demo Data")
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

  // Debounced Auto-Update
  useEffect(() => {
    if (booted) {
      const t = setTimeout(runSim, 600);
      return () => clearTimeout(t)
    }
  }, [booted, track, pitLap, rival, rivalPit, myTire, rivalTire])

  return (
    <>
      {/* --- LAYER 1: 3D BACKGROUND (Z-INDEX 0) --- */}
      <div className="fixed inset-0 z-0">
        <Background3D />
      </div>

      {/* --- LAYER 2: UI (Z-INDEX 10) --- */}
      <div className="relative z-10 h-screen pointer-events-none">
        <div className="pointer-events-auto h-full">
          <AnimatePresence>
            {!booted && (
              <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.8 }}
                className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white">
                <Activity size={60} color="#e10600" className="mb-5" />
                <div className="tracking-[4px] text-[0.8rem] text-[#666] mb-2.5">RACE STRATEGY SIMULATION</div>
                <h1 className="text-[4rem] font-black italic m-0">ORACLE <span className="text-[#e10600]">PITWALL</span></h1>
                <button
                  onClick={() => { playClick(); setBooted(true); }}
                  className="mt-10 bg-[#e10600] border-none text-white px-10 py-3 font-bold rounded cursor-pointer hover:brightness-110 transition-all">
                  CONNECT TO SESSION
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {booted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen flex flex-col text-white overflow-hidden">

              {/* HEADER */}
              <header className="h-[70px] flex items-center justify-between px-[30px] bg-gradient-to-b from-black/90 to-transparent border-b border-white/[0.05]">
                <div className="flex items-center gap-[15px]">
                  <Activity color="#e10600" size={28} />
                  <div>
                    <div className="font-black text-[1.2rem] leading-none italic">ORACLE <span className="text-[#e10600]">PITWALL</span></div>
                    <div className="text-[0.65rem] text-[#666] tracking-widest">RACE CONTROL SYSTEM v3.1</div>
                  </div>
                </div>
                <div className="flex gap-5 items-center">
                  <EngineSound />
                  <div className="flex items-center gap-2 bg-[#111] px-3 py-1.5 rounded border border-[#333] text-[0.7rem] font-bold text-[#ccc]">
                    <div className="animate-pulse w-1.5 h-1.5 bg-[#00ff00] rounded-full" /> LIVE TELEMETRY
                  </div>
                </div>
              </header>

              {/* MAIN GRID */}
              <div className="flex-1 p-[30px] grid gap-[25px] overflow-hidden" style={{ gridTemplateColumns: '350px 1fr 400px' }}>

                {/* COLUMN 1 — STRATEGY CONFIGURATION */}
                <Panel title="STRATEGY CONFIGURATION" icon={Settings2}>
                  <div className="mb-6">
                    <label className="text-[0.7rem] text-[#666] font-bold mb-2 block">CIRCUIT SELECTION</label>
                    <div className="flex gap-2.5 mb-2.5 items-center">
                      <MapPin size={16} color="#e10600" />
                      <span className="font-black">{TRACK_DATA[track].name.toUpperCase()}</span>
                    </div>
                    <select value={track} onChange={(e) => { playClick(); setTrack(e.target.value) }}
                      className="w-full bg-[#0a0a0a] border border-[#333] text-white p-2.5 rounded cursor-pointer">
                      {Object.keys(TRACK_DATA).map(k => <option key={k} value={k}>{TRACK_DATA[k].code} - {k}</option>)}
                    </select>
                  </div>
                  <div className="h-px bg-[#222] my-5" />
                  <DriverRow driverKey="VER" isRival={false} pitLap={pitLap} setPitLap={setPitLap} tire={myTire} setTire={setMyTire} />
                  <DriverRow driverKey={rival} isRival={true} pitLap={rivalPit} setPitLap={setRivalPit} tire={rivalTire} setTire={setRivalTire} onSelectRival={setRival} />
                </Panel>

                {/* COLUMN 2 — WEATHER + CHART */}
                <div className="flex flex-col gap-[25px]">
                  <div className="grid grid-cols-3 gap-[15px]">
                    <WeatherData label="AIR TEMP" value={TRACK_DATA[track].temp} icon={Thermometer} color="#ff9900" />
                    <WeatherData label="TRACK TEMP" value={TRACK_DATA[track].trackTemp} icon={Thermometer} color="#e10600" />
                    <WeatherData label="HUMIDITY" value={TRACK_DATA[track].humidity} icon={Wind} color="#00ccff" />
                  </div>
                  <Panel title="LIVE INTERVAL GAP DELTA" icon={BarChart3} className="flex-1">
                    <div className="h-full w-full min-h-[300px]">
                      {data ? (
                        <ResponsiveContainer>
                          <AreaChart data={data.results.lap_history}>
                            <defs>
                              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#e10600" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#e10600" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="lap" stroke="#444" tick={{ fontSize: 10 }} axisLine={false} />
                            <YAxis stroke="#444" tick={{ fontSize: 10 }} axisLine={false} />
                            <Tooltip contentStyle={{ background: '#000', border: '1px solid #333' }} />
                            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                            <Area type="monotone" dataKey="gap" stroke="#e10600" strokeWidth={3} fill="url(#grad)" animationDuration={500} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : <div className="h-full flex items-center justify-center text-[#444]">AWAITING DATA LINK...</div>}
                    </div>
                  </Panel>
                </div>

                {/* COLUMN 3 — WIN PROB + TRACK STATUS */}
                <div className="flex flex-col gap-[25px]">
                  <Panel title="WIN PROBABILITY" icon={Trophy}>
                    <div className="text-center py-10">
                      {data ? (
                        <>
                          <div className="text-[5rem] font-black leading-[0.8] text-white">
                            {data.results.d1_win_prob.toFixed(0)}<span className="text-[2rem] text-[#e10600]">%</span>
                          </div>
                          <div className="mt-2.5 font-black text-[1.2rem] text-[#3671C6]">VERSTAPPEN</div>
                          <div className="mt-10 border-t border-[#222] pt-5">
                            <div className="text-[2rem] font-black text-[#666]">{data.results.d2_win_prob.toFixed(0)}%</div>
                            <div className="text-[0.8rem] font-bold text-[#444]">{rival}</div>
                          </div>
                        </>
                      ) : <div className="animate-pulse text-[#666]">CALCULATING...</div>}
                    </div>
                  </Panel>
                  <Panel title="TRACK STATUS" icon={Radio}>
                    <div className="flex items-center gap-5 h-full">
                      <Gauge size={60} strokeWidth={1.5} color={TRACK_DATA[track].weather === 'WET' ? '#00ccff' : '#00ff00'} />
                      <div>
                        <div className="text-[1.5rem] font-black italic">{TRACK_DATA[track].weather === 'WET' ? 'WET TRACK' : 'GREEN FLAG'}</div>
                        <div style={{ color: TRACK_DATA[track].weather === 'WET' ? '#00ccff' : '#00ff00' }} className="text-[0.75rem] font-bold">
                          {TRACK_DATA[track].weather === 'WET' ? 'INTERMEDIATE TYRES ADVISED' : 'OPTIMAL CONDITIONS'}
                        </div>
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>

              {/* FOOTER */}
              <div className="px-[30px] h-10 border-t border-white/[0.05] flex items-center justify-between text-[0.7rem] text-[#444] bg-[#050505]">
                <div className="flex gap-5">
                  <span className="flex items-center gap-1.5"><Server size={12} /> ORACLE CLOUD: CONNECTED</span>
                  <span className="flex items-center gap-1.5"><Zap size={12} /> LATENCY: 24ms</span>
                </div>
                <div>ENCRYPTED CONNECTION // RED BULL RACING</div>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}