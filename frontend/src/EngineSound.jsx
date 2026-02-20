import { useState, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { motion } from 'framer-motion'

export default function EngineSound() {
  const [isMuted, setIsMuted] = useState(true)
  const audioCtxRef = useRef(null)
  const oscRef = useRef(null)
  const gainRef = useRef(null)
  const lfoRef = useRef(null)

  const toggleSound = () => {
    if (isMuted) startEngine(); else stopEngine()
    setIsMuted(!isMuted)
  }

  const startEngine = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 60

    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 8
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 5
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400

    const gain = ctx.createGain()
    gain.gain.value = 0.12

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    lfo.start(); osc.start()

    oscRef.current = osc
    gainRef.current = gain
    lfoRef.current = lfo
  }

  const stopEngine = () => {
    if (audioCtxRef.current) {
      gainRef.current.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5)
      setTimeout(() => {
        oscRef.current?.stop()
        lfoRef.current?.stop()
        audioCtxRef.current?.close()
      }, 500)
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={toggleSound}
      className="relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-[0.7rem] font-semibold cursor-pointer overflow-hidden transition-all duration-300"
      style={{
        fontFamily: 'Space Grotesk, sans-serif',
        background: isMuted ? 'rgba(255,255,255,0.05)' : 'rgba(225,6,0,0.12)',
        border: isMuted ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(225,6,0,0.4)',
        color: isMuted ? 'rgba(255,255,255,0.4)' : '#e10600',
        boxShadow: isMuted ? 'none' : '0 0 15px rgba(225,6,0,0.2)',
      }}>
      {isMuted
        ? <VolumeX size={14} />
        : <Volume2 size={14} className="animate-pulse" />
      }
      <span className="tracking-[0.1em] uppercase text-[0.62rem]">
        {isMuted ? 'Engine Off' : 'Live Audio'}
      </span>
      {/* Active glow shimmer */}
      {!isMuted && (
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'linear-gradient(90deg, transparent, #e10600, transparent)', animation: 'border-march 2s linear infinite', backgroundSize: '200% 100%' }} />
      )}
    </motion.button>
  )
}