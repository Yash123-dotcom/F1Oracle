import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export default function EngineSound() {
  const [isMuted, setIsMuted] = useState(true)
  const audioCtxRef = useRef(null)
  const oscRef = useRef(null)
  const gainRef = useRef(null)
  const lfoRef = useRef(null) // Low Frequency Oscillator for the "rumble"

  const toggleSound = () => {
    if (isMuted) {
      startEngine()
    } else {
      stopEngine()
    }
    setIsMuted(!isMuted)
  }

  const startEngine = () => {
    // 1. Create Audio Context
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    // 2. The "Engine" (Sawtooth wave sounds buzzy/mechanical)
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth' 
    osc.frequency.value = 60 // 60Hz = Low idle rumble

    // 3. The "Rumble" (LFO modulates pitch slightly)
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 8 // 8Hz vibration speed
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 5 // Depth of vibration
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency) // Connect rumble to engine pitch

    // 4. Filter (Muffles the harsh buzz to sound like it's in a garage)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400 

    // 5. Volume Control
    const gain = ctx.createGain()
    gain.gain.value = 0.15 // Keep it subtle background noise
    
    // Connect the chain: LFO -> Osc -> Filter -> Gain -> Speakers
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    lfo.start()
    osc.start()

    // Store refs to stop them later
    oscRef.current = osc
    gainRef.current = gain
    lfoRef.current = lfo
  }

  const stopEngine = () => {
    if (audioCtxRef.current) {
      // Smooth fade out
      gainRef.current.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5)
      setTimeout(() => {
        oscRef.current.stop()
        lfoRef.current.stop()
        audioCtxRef.current.close()
      }, 500)
    }
  }

  return (
    <button 
      onClick={toggleSound}
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '50px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: isMuted ? '#888' : '#e10600',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        transition: 'all 0.3s'
      }}
    >
      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="animate-pulse"/>}
      {isMuted ? "START ENGINE" : "LIVE AUDIO"}
    </button>
  )
}