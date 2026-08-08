// Adapted from the React Bits "Dither" background concept, rebuilt with this app's OGL conventions (see `dark-veil-background.tsx`).
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
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const fragment = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform float uColorNum;
uniform float uPixelSize;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform vec2 uMouse;
uniform float uMouseRadius;
uniform float uMouseInteraction;

float bayerValue(vec2 cell) {
  int x = int(mod(cell.x, 4.0));
  int y = int(mod(cell.y, 4.0));
  int index = x + y * 4;
  if (index == 0) return 0.0;
  if (index == 1) return 8.0;
  if (index == 2) return 2.0;
  if (index == 3) return 10.0;
  if (index == 4) return 12.0;
  if (index == 5) return 4.0;
  if (index == 6) return 14.0;
  if (index == 7) return 6.0;
  if (index == 8) return 3.0;
  if (index == 9) return 11.0;
  if (index == 10) return 1.0;
  if (index == 11) return 9.0;
  if (index == 12) return 15.0;
  if (index == 13) return 7.0;
  if (index == 14) return 13.0;
  return 5.0;
}

void main() {
  vec2 pixelSize = vec2(max(uPixelSize, 1.0));
  vec2 pixelCoord = floor(gl_FragCoord.xy / pixelSize) * pixelSize;
  vec2 uv = pixelCoord / uResolution;

  vec2 warp = vec2(0.0);
  if (uMouseInteraction > 0.5) {
    float dist = distance(pixelCoord, uMouse);
    float influence = smoothstep(uMouseRadius, 0.0, dist);
    warp = normalize(pixelCoord - uMouse + 0.001) * influence * 40.0;
  }

  float wave = sin((uv.x * uWaveFrequency + warp.x * 0.01) * 6.283 + uTime * uWaveSpeed)
    * cos((uv.y * uWaveFrequency + warp.y * 0.01) * 6.283 - uTime * uWaveSpeed * 0.7);
  float brightness = clamp(0.5 + 0.5 * wave * uWaveAmplitude, 0.0, 1.0);

  float levels = max(uColorNum, 2.0);
  float ditherOffset = (bayerValue(floor(pixelCoord / pixelSize)) / 16.0 - 0.5) / levels;
  float value = clamp(brightness + ditherOffset, 0.0, 1.0);
  float quantized = floor(value * (levels - 1.0) + 0.5) / (levels - 1.0);

  gl_FragColor = vec4(uColor * quantized, 1.0);
}
`

export interface DitherBackgroundProps {
  color?: string
  disableAnimation?: boolean
  mouseInteraction?: boolean
  mouseRadius?: number
  colorNum?: number
  pixelSize?: number
  waveAmplitude?: number
  waveFrequency?: number
  waveSpeed?: number
}

/** A retro, ordered-dithered wave field — quantized colors, optional mouse-reactive ripple. */
export function DitherBackground({
  color = "#5226ff",
  disableAnimation = false,
  mouseInteraction = true,
  mouseRadius = 1,
  colorNum = 4,
  pixelSize = 2,
  waveAmplitude = 0.3,
  waveFrequency = 3,
  waveSpeed = 0.05,
}: DitherBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef(new Vec2(0, 0))

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio, 2) })
    const gl = renderer.gl
    const geometry = new Triangle(gl)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uResolution: { value: new Vec2() },
        uTime: { value: 0 },
        uColor: { value: hexToNormalizedRGB(color) },
        uColorNum: { value: colorNum },
        uPixelSize: { value: pixelSize },
        uWaveAmplitude: { value: waveAmplitude },
        uWaveFrequency: { value: waveFrequency },
        uWaveSpeed: { value: waveSpeed },
        uMouse: { value: new Vec2(0, 0) },
        uMouseRadius: { value: mouseRadius * 200 },
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
    let elapsed = 0
    let lastNow = start
    let frame = 0

    const loop = () => {
      const now = performance.now()
      if (!disableAnimation) elapsed += now - lastNow
      lastNow = now

      program.uniforms.uTime.value = elapsed / 1000
      program.uniforms.uColor.value = hexToNormalizedRGB(color)
      program.uniforms.uColorNum.value = colorNum
      program.uniforms.uPixelSize.value = pixelSize
      program.uniforms.uWaveAmplitude.value = waveAmplitude
      program.uniforms.uWaveFrequency.value = waveFrequency
      program.uniforms.uWaveSpeed.value = waveSpeed
      program.uniforms.uMouse.value.copy(mouseRef.current)
      program.uniforms.uMouseRadius.value = mouseRadius * 200
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
  }, [color, disableAnimation, mouseInteraction, mouseRadius, colorNum, pixelSize, waveAmplitude, waveFrequency, waveSpeed])

  return <canvas ref={canvasRef} className="block size-full" />
}
