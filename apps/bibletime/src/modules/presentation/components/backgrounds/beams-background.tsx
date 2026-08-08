// Adapted from the React Bits "Beams" background concept, built with @react-three/fiber (see `silk-background.tsx`).
import { useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type { RootState } from "@react-three/fiber"
import { Color } from "three"
import type { Group, Mesh } from "three"

type NormalizedRGB = [number, number, number]

const hexToNormalizedRGB = (hex: string): NormalizedRGB => {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return [r, g, b]
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
uniform float uSpeed;
uniform float uNoiseIntensity;
uniform float uNoiseScale;
uniform float uSeed;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

float noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float a = hash(ip.x + ip.y * 57.0);
  float b = hash(ip.x + 1.0 + ip.y * 57.0);
  float c = hash(ip.x + (ip.y + 1.0) * 57.0);
  float d = hash(ip.x + 1.0 + (ip.y + 1.0) * 57.0);
  vec2 u = fp * fp * (3.0 - 2.0 * fp);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  float flow = fract(vUv.y - uTime * uSpeed * 0.25 + uSeed);
  float body = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
  float freq = mix(2.0, 14.0, clamp(uNoiseScale, 0.0, 1.0));
  float n = noise(vec2(vUv.x * freq + uSeed * 10.0, uTime * uSpeed * 0.3 + uSeed * 5.0));
  float flicker = mix(1.0, n, clamp(uNoiseIntensity * 0.5, 0.0, 1.0));
  float pulse = 0.5 + 0.5 * sin(flow * 6.283);
  float glow = body * mix(0.35, 1.0, pulse) * flicker;
  float alpha = clamp(glow, 0.0, 1.0);
  gl_FragColor = vec4(uColor, alpha);
}
`

interface BeamProps {
  index: number
  count: number
  x: number
  width: number
  height: number
  color: NormalizedRGB
  speed: number
  noiseIntensity: number
  noiseScale: number
}

function Beam({ index, count, x, width, height, color, speed, noiseIntensity, noiseScale }: BeamProps) {
  const meshRef = useRef<Mesh>(null)
  const seed = useMemo(() => (index / Math.max(count, 1)) * 3.7 + 0.13, [index, count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uNoiseIntensity: { value: noiseIntensity },
      uNoiseScale: { value: noiseScale },
      uColor: { value: new Color(...color) },
      uSeed: { value: seed },
    }),
    []
  )

  useFrame((_state: RootState, delta: number) => {
    uniforms.uTime.value += delta
    uniforms.uSpeed.value = speed
    uniforms.uNoiseIntensity.value = noiseIntensity
    uniforms.uNoiseScale.value = noiseScale
    uniforms.uColor.value.setRGB(...color)
  })

  return (
    <mesh ref={meshRef} position={[x, 0, 0]}>
      <planeGeometry args={[width * 0.55, height, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

interface BeamsSceneProps {
  beamWidth: number
  beamHeight: number
  beamNumber: number
  color: NormalizedRGB
  speed: number
  noiseIntensity: number
  scale: number
  rotation: number
}

function BeamsScene({
  beamWidth,
  beamHeight,
  beamNumber,
  color,
  speed,
  noiseIntensity,
  scale,
  rotation,
}: BeamsSceneProps) {
  const groupRef = useRef<Group>(null)
  const { viewport } = useThree()
  const count = Math.max(1, Math.round(beamNumber))
  const span = viewport.width * 1.1

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    group.rotation.z = (rotation * Math.PI) / 180
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, index) => {
        const t = count > 1 ? index / (count - 1) : 0.5
        return (
          <Beam
            key={index}
            index={index}
            count={count}
            x={(t - 0.5) * span}
            width={beamWidth}
            height={beamHeight}
            color={color}
            speed={speed}
            noiseIntensity={noiseIntensity}
            noiseScale={scale}
          />
        )
      })}
    </group>
  )
}

export interface BeamsBackgroundProps {
  beamWidth?: number
  beamHeight?: number
  beamNumber?: number
  lightColor?: string
  speed?: number
  noiseIntensity?: number
  scale?: number
  rotation?: number
}

/** A field of soft vertical light beams flowing upward over a black canvas — no mouse interaction. */
export function BeamsBackground({
  beamWidth = 2,
  beamHeight = 15,
  beamNumber = 12,
  lightColor = "#ffffff",
  speed = 2,
  noiseIntensity = 1.75,
  scale = 0.2,
  rotation = 0,
}: BeamsBackgroundProps) {
  const color = hexToNormalizedRGB(lightColor)

  return (
    <Canvas dpr={[1, 2]} orthographic camera={{ zoom: 40, position: [0, 0, 10] }} frameloop="always">
      <color attach="background" args={["#000000"]} />
      <BeamsScene
        beamWidth={beamWidth}
        beamHeight={beamHeight}
        beamNumber={beamNumber}
        color={color}
        speed={speed}
        noiseIntensity={noiseIntensity}
        scale={scale}
        rotation={rotation}
      />
    </Canvas>
  )
}
