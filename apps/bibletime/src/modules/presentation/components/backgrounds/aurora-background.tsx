// Adapted from the React Bits "Aurora" background concept, rebuilt with this app's OGL conventions (see `dark-veil-background.tsx`).
import { useEffect, useRef } from "react"
import { Mesh, Program, Renderer, Triangle } from "ogl"

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

const fragment = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uAmplitude;
uniform float uBlend;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;

  vec3 rampColor = uv.x < 0.5
    ? mix(uColor1, uColor2, uv.x / 0.5)
    : mix(uColor2, uColor3, (uv.x - 0.5) / 0.5);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = uv.y * 2.0 - height + 0.2;
  float intensity = 0.6 * height;

  float midPoint = 0.2;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  vec3 auroraColor = intensity * rampColor;

  gl_FragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`

export interface AuroraBackgroundProps {
  colorStop1?: string
  colorStop2?: string
  colorStop3?: string
  amplitude?: number
  blend?: number
}

/** A soft aurora-borealis glow across the top of the frame, blended between three colors — no mouse interaction. */
export function AuroraBackground({
  colorStop1 = "#3a1c71",
  colorStop2 = "#d76d77",
  colorStop3 = "#ffaf7b",
  amplitude = 1.0,
  blend = 0.5,
}: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uBlend: { value: blend },
        uColor1: { value: hexToNormalizedRGB(colorStop1) },
        uColor2: { value: hexToNormalizedRGB(colorStop2) },
        uColor3: { value: hexToNormalizedRGB(colorStop3) },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight)
    }

    window.addEventListener("resize", resize)
    resize()

    const start = performance.now()
    let frame = 0

    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000
      program.uniforms.uAmplitude.value = amplitude
      program.uniforms.uBlend.value = blend
      program.uniforms.uColor1.value = hexToNormalizedRGB(colorStop1)
      program.uniforms.uColor2.value = hexToNormalizedRGB(colorStop2)
      program.uniforms.uColor3.value = hexToNormalizedRGB(colorStop3)
      renderer.render({ scene: mesh })
      frame = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
    }
  }, [colorStop1, colorStop2, colorStop3, amplitude, blend])

  return <canvas ref={canvasRef} className="block size-full" />
}
