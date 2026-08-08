// Adapted from the React Bits "Soft Aurora" background concept — a layered, mouse-reactive variant of `aurora-background.tsx`.
import { useEffect, useRef } from "react"
import { Mesh, Program, Renderer, Triangle, Vec2 } from "ogl"

type NormalizedRGB = [number, number, number]

const hexToNormalizedRGB = (hex: string): NormalizedRGB => {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return [r, g, b]
}

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const OCTAVES = 4

const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uNoiseFrequency;
uniform float uNoiseAmplitude;
uniform float uBandHeight;
uniform float uBandSpread;
uniform float uOctaveDecay;
uniform float uLayerOffset;
uniform float uColorSpeed;
uniform vec2 uMouse;
uniform float uMouseInfluence;
uniform float uMouseInteraction;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 uv = vUv * uScale;
  float t = uTime * uSpeed;

  float mouseLift = 0.0;
  if (uMouseInteraction > 0.5) {
    vec2 mouseUv = uMouse / uResolution;
    float dist = distance(vUv, mouseUv);
    mouseLift = uMouseInfluence * smoothstep(0.5, 0.0, dist);
  }

  float bands = 0.0;
  float amplitude = 1.0;
  for (int i = 0; i < ${OCTAVES}; i++) {
    float fi = float(i);
    vec2 samplePoint = vec2(uv.x * uNoiseFrequency + fi * uLayerOffset, t * 0.15 + fi * uBandSpread);
    float layer = noise(samplePoint) * uNoiseAmplitude;
    float band = smoothstep(0.0, uBandHeight + 0.001, 1.0 - abs(vUv.y - (0.3 + fi * uBandSpread * 0.12) - layer * 0.2 - mouseLift));
    bands += band * amplitude;
    amplitude *= uOctaveDecay;
  }

  float colorPhase = 0.5 + 0.5 * sin(vUv.x * 3.0 + t * uColorSpeed);
  vec3 rampColor = mix(uColor1, uColor2, colorPhase);

  vec3 color = rampColor * bands * uBrightness;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), clamp(bands, 0.0, 1.0));
}
`

export interface SoftAuroraBackgroundProps {
  speed?: number
  scale?: number
  brightness?: number
  color1?: string
  color2?: string
  noiseFrequency?: number
  noiseAmplitude?: number
  bandHeight?: number
  bandSpread?: number
  octaveDecay?: number
  layerOffset?: number
  colorSpeed?: number
  mouseInteraction?: boolean
  mouseInfluence?: number
}

/** Layered, softly-decaying aurora bands blending two colors — brightens near the pointer when mouse interaction is on. */
export function SoftAuroraBackground({
  speed = 0.6,
  scale = 1.5,
  brightness = 1,
  color1 = "#f7f7f7",
  color2 = "#e100ff",
  noiseFrequency = 2.5,
  noiseAmplitude = 1,
  bandHeight = 0.5,
  bandSpread = 1,
  octaveDecay = 0.1,
  layerOffset = 0,
  colorSpeed = 1,
  mouseInteraction = true,
  mouseInfluence = 0.25,
}: SoftAuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef(new Vec2(0, 0))

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const renderer = new Renderer({ canvas, alpha: true, premultipliedAlpha: true, dpr: Math.min(window.devicePixelRatio, 2) })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    const geometry = new Triangle(gl)

    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      uniforms: {
        uResolution: { value: new Vec2() },
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uScale: { value: scale },
        uBrightness: { value: brightness },
        uColor1: { value: hexToNormalizedRGB(color1) },
        uColor2: { value: hexToNormalizedRGB(color2) },
        uNoiseFrequency: { value: noiseFrequency },
        uNoiseAmplitude: { value: noiseAmplitude },
        uBandHeight: { value: bandHeight },
        uBandSpread: { value: bandSpread },
        uOctaveDecay: { value: octaveDecay },
        uLayerOffset: { value: layerOffset },
        uColorSpeed: { value: colorSpeed },
        uMouse: { value: new Vec2(0, 0) },
        uMouseInfluence: { value: mouseInfluence },
        uMouseInteraction: { value: mouseInteraction ? 1 : 0 },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * gl.canvas.width
      const y = (1 - (event.clientY - rect.top) / rect.height) * gl.canvas.height
      mouseRef.current.set(x, y)
    }

    window.addEventListener("resize", resize)
    container.addEventListener("pointermove", handlePointerMove)
    resize()

    const start = performance.now()
    let frame = 0

    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000
      program.uniforms.uSpeed.value = speed
      program.uniforms.uScale.value = scale
      program.uniforms.uBrightness.value = brightness
      program.uniforms.uColor1.value = hexToNormalizedRGB(color1)
      program.uniforms.uColor2.value = hexToNormalizedRGB(color2)
      program.uniforms.uNoiseFrequency.value = noiseFrequency
      program.uniforms.uNoiseAmplitude.value = noiseAmplitude
      program.uniforms.uBandHeight.value = bandHeight
      program.uniforms.uBandSpread.value = bandSpread
      program.uniforms.uOctaveDecay.value = octaveDecay
      program.uniforms.uLayerOffset.value = layerOffset
      program.uniforms.uColorSpeed.value = colorSpeed
      program.uniforms.uMouse.value.copy(mouseRef.current)
      program.uniforms.uMouseInfluence.value = mouseInfluence
      program.uniforms.uMouseInteraction.value = mouseInteraction ? 1 : 0

      renderer.render({ scene: mesh })
      frame = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      container.removeEventListener("pointermove", handlePointerMove)
    }
  }, [
    speed,
    scale,
    brightness,
    color1,
    color2,
    noiseFrequency,
    noiseAmplitude,
    bandHeight,
    bandSpread,
    octaveDecay,
    layerOffset,
    colorSpeed,
    mouseInteraction,
    mouseInfluence,
  ])

  return <canvas ref={canvasRef} className="block size-full" />
}
