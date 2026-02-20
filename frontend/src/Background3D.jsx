import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Scanline, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

// --- 1. NEON WIREFRAME CAR ---
// Matches the glowing blue outline in your video
function HeroCar() {
  const carRef = useRef()
  const wheelsRef = useRef([])

  // The "Hologram" Material
  const materials = useMemo(() => ({
    wireframe: new THREE.MeshBasicMaterial({
      color: "#00ffff",
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      toneMapped: false // Glows brighter
    }),
    solidGlow: new THREE.MeshBasicMaterial({
      color: "#0088ff",
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  }), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (carRef.current) {
      // Gentle "Floating" motion
      carRef.current.position.y = -0.5 + Math.sin(t * 2) * 0.05
      carRef.current.rotation.x = 0.05 // Slight nose up
      carRef.current.rotation.y = Math.sin(t * 0.5) * 0.1 // Slight turning
    }
    // Wheels spin
    wheelsRef.current.forEach(w => { if (w) w.rotation.x = -t * 20 })
  })

  return (
    <group ref={carRef} position={[0, -0.5, 0]}>
      {/* --- CAR BODY (Simplified shapes) --- */}

      {/* Main Body */}
      <mesh position={[0, 0.2, 0]} material={materials.wireframe}><boxGeometry args={[0.8, 0.25, 2.4]} /></mesh>
      <mesh position={[0, 0.2, 0]} material={materials.solidGlow}><boxGeometry args={[0.79, 0.24, 2.39]} /></mesh>

      {/* Sidepods */}
      <mesh position={[0.5, 0.2, 0.2]} material={materials.wireframe}><boxGeometry args={[0.3, 0.25, 1.2]} /></mesh>
      <mesh position={[-0.5, 0.2, 0.2]} material={materials.wireframe}><boxGeometry args={[0.3, 0.25, 1.2]} /></mesh>

      {/* Rear Wing */}
      <group position={[0, 0.6, 1.8]}>
        <mesh material={materials.wireframe}><boxGeometry args={[1.8, 0.05, 0.4]} /></mesh>
        <mesh position={[0.8, -0.3, 0]} material={materials.wireframe}><boxGeometry args={[0.05, 0.6, 0.4]} /></mesh>
        <mesh position={[-0.8, -0.3, 0]} material={materials.wireframe}><boxGeometry args={[0.05, 0.6, 0.4]} /></mesh>
      </group>

      {/* Front Wing */}
      <group position={[0, -0.05, -2.1]}>
        <mesh material={materials.wireframe}><boxGeometry args={[2.0, 0.05, 0.5]} /></mesh>
      </group>

      {/* Wheels */}
      {[[-0.9, 0.15, -1.2], [0.9, 0.15, -1.2], [-0.9, 0.15, 1.4], [0.9, 0.15, 1.4]].map((pos, i) => (
        <group key={i} ref={el => wheelsRef.current[i] = el} position={pos}>
          {/* Wireframe Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]} material={materials.wireframe}>
            <cylinderGeometry args={[0.35, 0.35, 0.4, 16]} />
          </mesh>
          {/* Glowing Inner Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]} material={materials.solidGlow}>
            <cylinderGeometry args={[0.25, 0.25, 0.41, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// --- 2. LASER SPEED LINES ---
// Matches the horizontal red/blue streaks in your video
function LaserStreaks() {
  const mesh = useRef()
  const count = 100
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const particles = useMemo(() => new Array(count).fill(0).map((_, i) => ({
    x: (Math.random() - 0.5) * 40, // Wide spread
    y: (Math.random() - 0.5) * 15, // Height spread
    z: -Math.random() * 100,
    speed: 50 + Math.random() * 50,
    length: 10 + Math.random() * 30, // Long streaks
    color: Math.random() > 0.5 ? new THREE.Color("#00ffff") : new THREE.Color("#ff0033") // Cyan & Red
  })), [])

  useFrame((_, delta) => {
    particles.forEach((p, i) => {
      p.z += p.speed * delta
      if (p.z > 20) p.z = -100 // Reset

      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.set(0.1, 0.1, p.length) // Thin and long
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      mesh.current.setColorAt(i, p.color)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.8} />
    </instancedMesh>
  )
}

function Scene() {
  return (
    <>
      {/* Deep Blue Gradient Background */}
      <color attach="background" args={['#000510']} />
      <fog attach="fog" args={['#000510', 20, 60]} />

      <HeroCar />
      <LaserStreaks />

      {/* Grid Floor */}
      <gridHelper args={[100, 40, "#0044ff", "#001133"]} position={[0, -0.8, 0]} />

      {/* No real lights needed, everything is self-illuminated */}

      {/* Post Processing for the "Neon" Look */}
      <EffectComposer disableNormalPass multisampling={0}>
        {/* Strong Glow */}
        <Bloom luminanceThreshold={0.1} mipmapBlur intensity={2.5} radius={0.5} />
        {/* Scanlines for retro feel */}
        <Scanline density={1.5} opacity={0.15} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  )
}

export default function Background3D() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1, -5], fov: 60 }} // Camera behind looking forward
        gl={{ powerPreference: "high-performance", antialias: false, stencil: false, depth: true }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}