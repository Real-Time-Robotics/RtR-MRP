'use client'

import { useState, useCallback, useEffect } from 'react'

interface RegionSelectorProps {
  isActive: boolean
  onSelect: (x: number, y: number, width: number, height: number) => void
  onCancel: () => void
}

/**
 * Region Selector Overlay for screenshot capture
 * Industrial Precision styling with drag-to-select functionality
 */
export function RegionSelector({ isActive, onSelect, onCancel }: RegionSelectorProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setStartPoint({ x: e.clientX, y: e.clientY })
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && startPoint) {
      setEndPoint({ x: e.clientX, y: e.clientY })
    }
  }, [isDragging, startPoint])

  const handleMouseUp = useCallback(() => {
    if (startPoint && endPoint) {
      const x = Math.min(startPoint.x, endPoint.x)
      const y = Math.min(startPoint.y, endPoint.y)
      const width = Math.abs(endPoint.x - startPoint.x)
      const height = Math.abs(endPoint.y - startPoint.y)

      // Minimum size check
      if (width > 20 && height > 20) {
        onSelect(x, y, width, height)
      }
    }
    setIsDragging(false)
    setStartPoint(null)
    setEndPoint(null)
  }, [startPoint, endPoint, onSelect])

  // ESC to cancel
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    if (isActive) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isActive, onCancel])

  // Prevent body scroll while selecting
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isActive])

  if (!isActive) return null

  // Calculate selection rectangle
  const selectionStyle = startPoint && endPoint ? {
    left: Math.min(startPoint.x, endPoint.x),
    top: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  } : null

  return (
    <div
      className="fixed inset-0 z-[9999] cursor-crosshair screenshot-ignore"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Instructions - Industrial Style */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gunmetal px-4 py-2 border border-mrp-border shadow-lg">
        <p className="text-[12px] text-mrp-text-primary font-medium">
          Kéo để chọn vùng chụp
        </p>
        <p className="text-[10px] text-mrp-text-muted mt-0.5">
          ESC để hủy
        </p>
      </div>

      {/* Selection rectangle */}
      {selectionStyle && selectionStyle.width > 0 && selectionStyle.height > 0 && (
        <div
          className="absolute border-2 border-info-cyan"
          style={{
            left: selectionStyle.left,
            top: selectionStyle.top,
            width: selectionStyle.width,
            height: selectionStyle.height,
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-info-cyan" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-info-cyan" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-info-cyan" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-info-cyan" />

          {/* Size indicator */}
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-info-cyan text-steel-dark px-2 py-0.5 text-[10px] font-mono whitespace-nowrap">
            {Math.round(selectionStyle.width)} × {Math.round(selectionStyle.height)}
          </div>
        </div>
      )}

      {/* Crosshair cursor helper */}
      {isDragging && endPoint && (
        <>
          {/* Horizontal line */}
          <div
            className="absolute h-px bg-info-cyan/50 pointer-events-none"
            style={{
              left: 0,
              right: 0,
              top: endPoint.y,
            }}
          />
          {/* Vertical line */}
          <div
            className="absolute w-px bg-info-cyan/50 pointer-events-none"
            style={{
              top: 0,
              bottom: 0,
              left: endPoint.x,
            }}
          />
        </>
      )}
    </div>
  )
}

export default RegionSelector
