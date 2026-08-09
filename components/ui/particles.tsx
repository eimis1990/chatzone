'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

interface MousePosition {
  x: number
  y: number
}

function useMousePosition(): MousePosition {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return mousePosition
}

function hexToRgb(hex: string): number[] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const hexInt = parseInt(full, 16)
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255]
}

interface Circle {
  x: number
  y: number
  translateX: number
  translateY: number
  size: number
  alpha: number
  targetAlpha: number
  dx: number
  dy: number
  magnetism: number
}

export interface ParticlesProps {
  className?: string
  quantity?: number
  staticity?: number
  ease?: number
  size?: number
  refresh?: boolean
  color?: string
  vx?: number
  vy?: number
}

/**
 * Drifting particle field on a canvas — particles ease toward the pointer and
 * respawn when they leave the frame. Used as an ambient page background.
 */
export function Particles({
  className = '',
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = '#ffffff',
  vx = 0,
  vy = 0,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const context = useRef<CanvasRenderingContext2D | null>(null)
  const circles = useRef<Circle[]>([])
  const mousePosition = useMousePosition()
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1

  const rgb = hexToRgb(color)

  const clearContext = useCallback(() => {
    context.current?.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h)
  }, [])

  const circleParams = useCallback((): Circle => {
    const pSize = Math.floor(Math.random() * 2) + size
    return {
      x: Math.floor(Math.random() * canvasSize.current.w),
      y: Math.floor(Math.random() * canvasSize.current.h),
      translateX: 0,
      translateY: 0,
      size: pSize,
      alpha: 0,
      targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    }
  }, [size])

  const drawCircle = useCallback(
    (circle: Circle, update = false) => {
      if (!context.current) return
      const { x, y, translateX, translateY, size: pSize, alpha } = circle
      context.current.translate(translateX, translateY)
      context.current.beginPath()
      context.current.arc(x, y, pSize, 0, 2 * Math.PI)
      context.current.fillStyle = `rgba(${rgb.join(', ')}, ${alpha})`
      context.current.fill()
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!update) circles.current.push(circle)
    },
    // rgb is a fresh array each render; its contents are what matter.
    [dpr, rgb[0], rgb[1], rgb[2]], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const drawParticles = useCallback(() => {
    clearContext()
    for (let i = 0; i < quantity; i++) drawCircle(circleParams())
  }, [circleParams, clearContext, drawCircle, quantity])

  const initCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      circles.current.length = 0
      canvasSize.current.w = canvasContainerRef.current.offsetWidth
      canvasSize.current.h = canvasContainerRef.current.offsetHeight
      canvasRef.current.width = canvasSize.current.w * dpr
      canvasRef.current.height = canvasSize.current.h * dpr
      canvasRef.current.style.width = `${canvasSize.current.w}px`
      canvasRef.current.style.height = `${canvasSize.current.h}px`
      context.current.scale(dpr, dpr)
    }
    drawParticles()
  }, [dpr, drawParticles])

  // Main loop. The rAF handle is cleaned up so a remount can't leave two loops
  // drawing into the same canvas.
  useEffect(() => {
    if (canvasRef.current) context.current = canvasRef.current.getContext('2d')
    initCanvas()

    let frame = 0
    const animate = () => {
      clearContext()
      circles.current.forEach((circle, i) => {
        const edges = [
          circle.x + circle.translateX - circle.size,
          canvasSize.current.w - circle.x - circle.translateX - circle.size,
          circle.y + circle.translateY - circle.size,
          canvasSize.current.h - circle.y - circle.translateY - circle.size,
        ]
        const closestEdge = edges.reduce((a, b) => Math.min(a, b))
        const remapped = Math.max(0, parseFloat(((closestEdge * 1) / 20).toFixed(2)))
        if (remapped > 1) {
          circle.alpha = Math.min(circle.alpha + 0.02, circle.targetAlpha)
        } else {
          circle.alpha = circle.targetAlpha * remapped
        }
        circle.x += circle.dx + vx
        circle.y += circle.dy + vy
        circle.translateX +=
          (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease
        circle.translateY +=
          (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease

        drawCircle(circle, true)

        if (
          circle.x < -circle.size ||
          circle.x > canvasSize.current.w + circle.size ||
          circle.y < -circle.size ||
          circle.y > canvasSize.current.h + circle.size
        ) {
          circles.current.splice(i, 1)
          drawCircle(circleParams())
        }
      })
      frame = window.requestAnimationFrame(animate)
    }
    frame = window.requestAnimationFrame(animate)

    window.addEventListener('resize', initCanvas)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', initCanvas)
    }
  }, [circleParams, clearContext, drawCircle, ease, initCanvas, staticity, vx, vy])

  // Pointer parallax: track the cursor relative to the canvas center.
  useEffect(() => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const { w, h } = canvasSize.current
    const x = mousePosition.x - rect.left - w / 2
    const y = mousePosition.y - rect.top - h / 2
    if (x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2) {
      mouse.current.x = x
      mouse.current.y = y
    }
  }, [mousePosition.x, mousePosition.y])

  useEffect(() => {
    initCanvas()
  }, [refresh, initCanvas])

  return (
    <div className={className} ref={canvasContainerRef} aria-hidden="true">
      <canvas ref={canvasRef} className="size-full" />
    </div>
  )
}
