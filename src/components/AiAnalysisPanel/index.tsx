import React, { useState, useEffect, useMemo } from 'react'
import { Button } from 'antd'
import { RobotOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'

/* ── CSS 注入 ── */
const PANEL_STYLE = `
@keyframes ai-block-in {
  from { opacity: 0; transform: translateY(7px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ai-cursor-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
`

/* ── 内联样式（粗体 / 斜体）── */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>
        return part
      })}
    </>
  )
}

/* ── 将文本解析为独立 Block 数组（每个 block 始终是完整 Markdown）── */
function parseBlocks(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行跳过（由 block 之间的 margin 提供视觉间距）
    if (line.trim() === '') { i++; continue }

    // 标题
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#+)/)?.[1].length ?? 2
      const content = line.replace(/^#+\s+/, '')
      const sizes: Record<number, string> = { 1: '17px', 2: '15px', 3: '14px' }
      blocks.push(
        <div style={{ fontWeight: 700, fontSize: sizes[level] ?? '14px', margin: '6px 0 2px', color: '#1f2937' }}>
          {renderInline(content)}
        </div>
      )
      i++
      continue
    }

    // 有序列表：将连续多行合为一个 block
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol style={{ margin: '2px 0', paddingLeft: 22 }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 4, lineHeight: 1.75 }}>{renderInline(it)}</li>
          ))}
        </ol>
      )
      continue
    }

    // 无序列表：将连续多行合为一个 block
    if (/^[-·•]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-·•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-·•]\s+/, ''))
        i++
      }
      blocks.push(
        <ul style={{ margin: '2px 0', paddingLeft: 20, listStyle: 'disc' }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 4, lineHeight: 1.75 }}>{renderInline(it)}</li>
          ))}
        </ul>
      )
      continue
    }

    // 普通段落行：每行独立一个 block，营造逐行流式感
    blocks.push(
      <p style={{ margin: '0 0 3px', lineHeight: 1.8 }}>{renderInline(line)}</p>
    )
    i++
  }

  return blocks
}

/* ── Props ── */
interface AiAnalysisPanelProps {
  text: string
  onClose?: () => void
  onRefresh?: () => void
  refreshing?: boolean
  style?: React.CSSProperties
}

/* ── 组件 ── */
export default function AiAnalysisPanel({ text, onClose, onRefresh, refreshing, style }: AiAnalysisPanelProps) {
  const [visibleCount, setVisibleCount] = useState(0)

  // 注入动画 CSS（只注入一次）
  useEffect(() => {
    if (document.getElementById('ai-panel-css')) return
    const el = document.createElement('style')
    el.id = 'ai-panel-css'
    el.textContent = PANEL_STYLE
    document.head.appendChild(el)
  }, [])

  // text 变化时重置（重新触发逐块动画）
  const blocks = useMemo(() => (text ? parseBlocks(text) : []), [text])

  useEffect(() => {
    setVisibleCount(0)
  }, [text])

  // 每隔 110ms 显示下一个 block
  useEffect(() => {
    if (visibleCount >= blocks.length) return
    const timer = setTimeout(() => setVisibleCount(v => v + 1), 110)
    return () => clearTimeout(timer)
  }, [visibleCount, blocks.length])

  const isAnimating = visibleCount < blocks.length
  const analysisTime = useMemo(
    () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text]
  )

  return (
    <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid #c4b5fd', overflow: 'hidden', ...style }}>
      {/* 渐变标题栏 */}
      <div style={{
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RobotOutlined />
          Claude AI 智能解读
          <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.75, marginLeft: 4 }}>{analysisTime}</span>
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {onRefresh && (
            <Button
              size="small" type="text"
              icon={<ReloadOutlined spin={refreshing} />}
              style={{ color: 'rgba(255,255,255,0.85)', padding: '0 6px' }}
              onClick={onRefresh}
              disabled={refreshing}
              title="重新解读"
            />
          )}
          {onClose && (
            <Button
              size="small" type="text"
              icon={<CloseOutlined />}
              style={{ color: 'rgba(255,255,255,0.85)', padding: '0 6px' }}
              onClick={onClose}
              title="关闭"
            />
          )}
        </div>
      </div>

      {/* 内容区：逐块淡入，始终是 Markdown 格式 */}
      <div style={{ padding: '16px 20px', background: '#faf5ff', color: '#374151', fontSize: 14, minHeight: 80 }}>
        {blocks.slice(0, visibleCount).map((block, idx) => (
          <div
            key={idx}
            style={{ animation: 'ai-block-in 0.28s ease both', marginBottom: 2 }}
          >
            {block}
          </div>
        ))}

        {/* 等待下一个 block 时显示闪烁光标 */}
        {isAnimating && (
          <span style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: '#7c3aed',
            marginLeft: 2,
            verticalAlign: 'text-bottom',
            animation: 'ai-cursor-blink 0.9s step-end infinite',
          }} />
        )}
      </div>
    </div>
  )
}
