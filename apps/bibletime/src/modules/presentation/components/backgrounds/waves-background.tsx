// Adapted from the React Bits "Waves" background concept — a canvas-2D grid of lines with wave motion and a mouse-reactive spring, no WebGL.
import { useEffect, useRef } from "react"

interface WavePoint {
  x: number
  y: number
  waveX: number
  waveY: number
  cursorX: number
  cursorY: number
  velocityX: number
  velocityY: number
}

export interface WavesBackgroundProps {
  lineColor?: string
  backgroundColor?: string
  waveSpeedX?: number
  waveSpeedY?: number
  waveAmplitudeX?: number
  waveAmplitudeY?: number
  friction?: number
  tension?: number
  maxCursorMove?: number
  xGap?: number
  yGap?: number
}

/** A flowing grid of horizontal lines, distorted by sine waves and a spring that follows the pointer. */
export function WavesBackground({
  lineColor = "#5227ff",
  backgroundColor = "transparent",
  waveSpeedX = 0.02,
  waveSpeedY = 0.01,
  waveAmplitudeX = 40,
  waveAmplitudeY = 20,
  friction = 0.9,
  tension = 0.01,
  maxCursorMove = 120,
  xGap = 12,
  yGap = 36,
}: WavesBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rows: WavePoint[][] = []
    let width = 0
    let height = 0
    let time = 0
    let frame = 0

    const buildGrid = () => {
      width = container.clientWidth
      height = container.clientHeight
      canvas.width = width
      canvas.height = height

      const gapX = Math.max(xGap, 4)
      const gapY = Math.max(yGap, 4)
      const cols = Math.ceil(width / gapX) + 2
      const rowCount = Math.ceil(height / gapY) + 2

      rows = Array.from({ length: rowCount }, (_row, rowIndex) =>
        Array.from({ length: cols }, (_col, colIndex) => ({
          x: colIndex * gapX,
          y: rowIndex * gapY,
          waveX: 0,
          waveY: 0,
          cursorX: 0,
          cursorY: 0,
          velocityX: 0,
          velocityY: 0,
        }))
      )
    }

    const resize = () => buildGrid()
    window.addEventListener("resize", resize)
    resize()

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = event.clientX - rect.left
      mouseRef.current.y = event.clientY - rect.top
    }
    const handlePointerLeave = () => {
      mouseRef.current.x = -9999
      mouseRef.current.y = -9999
    }
    container.addEventListener("pointermove", handlePointerMove)
    container.addEventListener("pointerleave", handlePointerLeave)

    const loop = () => {
      time += 1
      const mouse = mouseRef.current

      for (const row of rows) {
        for (const point of row) {
          point.waveX = Math.cos(time * waveSpeedX + point.y * 0.01) * waveAmplitudeX
          point.waveY = Math.sin(time * waveSpeedY + point.x * 0.01) * waveAmplitudeY

          const dx = mouse.x - (point.x + point.waveX)
          const dy = mouse.y - (point.y + point.waveY)
          const distance = Math.hypot(dx, dy)
          const radius = 160

          if (distance < radius) {
            const force = (1 - distance / radius) * tension * 60
            point.velocityX += dx * force * 0.02
            point.velocityY += dy * force * 0.02
          }

          point.velocityX *= friction
          point.velocityY *= friction
          point.cursorX += point.velocityX
          point.cursorY += point.velocityY
          point.cursorX = Math.max(-maxCursorMove, Math.min(maxCursorMove, point.cursorX))
          point.cursorY = Math.max(-maxCursorMove, Math.min(maxCursorMove, point.cursorY))
        }
      }

      ctx.clearRect(0, 0, width, height)
      if (backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, width, height)
      }

      ctx.strokeStyle = lineColor
      ctx.lineWidth = 1

      for (const row of rows) {
        ctx.beginPath()
        row.forEach((point, index) => {
          const px = point.x + point.waveX + point.cursorX
          const py = point.y + point.waveY + point.cursorY
          if (index === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
      }

      frame = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("pointerleave", handlePointerLeave)
    }
  }, [
    lineColor,
    backgroundColor,
    waveSpeedX,
    waveSpeedY,
    waveAmplitudeX,
    waveAmplitudeY,
    friction,
    tension,
    maxCursorMove,
    xGap,
    yGap,
  ])

  return <canvas ref={canvasRef} className="block size-full" />
}
