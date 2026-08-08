// An original warped-gradient + film-grain shader, built with this app's OGL conventions (see `dark-veil-background.tsx`).
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

const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainTime;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

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
  vec2 uv = vUv - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float swirl = uRotationAmount * 0.0002 * length(uv);
  float cs = cos(swirl);
  float sn = sin(swirl);
  uv = mat2(cs, -sn, sn, cs) * uv;

  vec2 noiseUv = uv * uWarpFrequency * uNoiseScale;
  float warpX = noise(noiseUv + uTime * uWarpSpeed);
  float warpY = noise(noiseUv + 19.7 + uTime * uWarpSpeed);
  uv += (vec2(warpX, warpY) - 0.5) * uWarpStrength * (uWarpAmplitude * 0.003);

  float angle = radians(uBlendAngle);
  vec2 axis = vec2(cos(angle), sin(angle));
  float projection = dot(uv, axis) + 0.5 + uColorBalance * 0.5;

  float softness = max(uBlendSoftness, 0.001);
  vec3 gradient = projection < 0.5
    ? mix(uColor1, uColor2, smoothstep(0.5 - softness, 0.5 + softness, projection * 2.0))
    : mix(uColor2, uColor3, smoothstep(0.5 - softness, 0.5 + softness, (projection - 0.5) * 2.0));

  float grainNoise = hash(gl_FragCoord.xy * uGrainScale + uGrainTime) - 0.5;
  vec3 color = gradient + grainNoise * uGrainAmount;

  color = (color - 0.5) * uContrast + 0.5;
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / max(uGamma, 0.001)));

  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, uSaturation);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

export interface GrainientBackgroundProps {
  color1?: string
  color2?: string
  color3?: string
  timeSpeed?: number
  colorBalance?: number
  warpStrength?: number
  warpFrequency?: number
  warpSpeed?: number
  warpAmplitude?: number
  blendAngle?: number
  blendSoftness?: number
  rotationAmount?: number
  noiseScale?: number
  grainAmount?: number
  grainScale?: number
  grainAnimated?: boolean
  contrast?: number
  gamma?: number
  saturation?: number
}

/** A warped three-color gradient finished with a film-grain pass — no mouse interaction. */
export function GrainientBackground({
  color1 = "#ff9ffc",
  color2 = "#5227ff",
  color3 = "#b497cf",
  timeSpeed = 0.25,
  colorBalance = 0,
  warpStrength = 1,
  warpFrequency = 5,
  warpSpeed = 2,
  warpAmplitude = 50,
  blendAngle = 0,
  blendSoftness = 0.05,
  rotationAmount = 500,
  noiseScale = 2,
  grainAmount = 0.1,
  grainScale = 2,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1,
  saturation = 1,
}: GrainientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
        uColor1: { value: hexToNormalizedRGB(color1) },
        uColor2: { value: hexToNormalizedRGB(color2) },
        uColor3: { value: hexToNormalizedRGB(color3) },
        uColorBalance: { value: colorBalance },
        uWarpStrength: { value: warpStrength },
        uWarpFrequency: { value: warpFrequency },
        uWarpSpeed: { value: warpSpeed },
        uWarpAmplitude: { value: warpAmplitude },
        uBlendAngle: { value: blendAngle },
        uBlendSoftness: { value: blendSoftness },
        uRotationAmount: { value: rotationAmount },
        uNoiseScale: { value: noiseScale },
        uGrainAmount: { value: grainAmount },
        uGrainScale: { value: grainScale },
        uGrainTime: { value: 0 },
        uContrast: { value: contrast },
        uGamma: { value: gamma },
        uSaturation: { value: saturation },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setSize(width, height)
      program.uniforms.uResolution.value.set(width, height)
    }

    window.addEventListener("resize", resize)
    resize()

    const start = performance.now()
    let frame = 0

    const loop = () => {
      const elapsed = ((performance.now() - start) / 1000) * timeSpeed
      program.uniforms.uTime.value = elapsed
      program.uniforms.uGrainTime.value = grainAnimated ? elapsed * 60 : 0
      program.uniforms.uColor1.value = hexToNormalizedRGB(color1)
      program.uniforms.uColor2.value = hexToNormalizedRGB(color2)
      program.uniforms.uColor3.value = hexToNormalizedRGB(color3)
      program.uniforms.uColorBalance.value = colorBalance
      program.uniforms.uWarpStrength.value = warpStrength
      program.uniforms.uWarpFrequency.value = warpFrequency
      program.uniforms.uWarpSpeed.value = warpSpeed
      program.uniforms.uWarpAmplitude.value = warpAmplitude
      program.uniforms.uBlendAngle.value = blendAngle
      program.uniforms.uBlendSoftness.value = blendSoftness
      program.uniforms.uRotationAmount.value = rotationAmount
      program.uniforms.uNoiseScale.value = noiseScale
      program.uniforms.uGrainAmount.value = grainAmount
      program.uniforms.uGrainScale.value = grainScale
      program.uniforms.uContrast.value = contrast
      program.uniforms.uGamma.value = gamma
      program.uniforms.uSaturation.value = saturation

      renderer.render({ scene: mesh })
      frame = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
    }
  }, [
    color1,
    color2,
    color3,
    timeSpeed,
    colorBalance,
    warpStrength,
    warpFrequency,
    warpSpeed,
    warpAmplitude,
    blendAngle,
    blendSoftness,
    rotationAmount,
    noiseScale,
    grainAmount,
    grainScale,
    grainAnimated,
    contrast,
    gamma,
    saturation,
  ])

  return <canvas ref={canvasRef} className="block size-full" />
}
