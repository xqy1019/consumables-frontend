import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Input, Button, Badge, Tooltip } from 'antd'
import {
  RobotOutlined, SendOutlined, CloseOutlined,
  ArrowRightOutlined, ShoppingCartOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { aiApi } from '@/api/ai'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { addMessage, resolveLoading, clearHistory } from '@/store/slices/chatSlice'
import type { ChatMessage, ChatAction } from '@/types'

/* ── 轻量 Markdown 渲染 ── */
function renderInline(text: string): React.ReactNode {
  // 处理 **粗体** 和 *斜体*
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

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 空行 → 小间距
    if (line.trim() === '') {
      nodes.push(<div key={i} style={{ height: 5 }} />)
      i++
      continue
    }

    // 有序列表：以 "1. " "2. " 开头的连续行
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{ margin: '4px 0', paddingLeft: 20 }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 3, lineHeight: 1.6 }}>{renderInline(it)}</li>
          ))}
        </ol>
      )
      continue
    }

    // 无序列表：以 "- " 或 "· " 开头的连续行
    if (/^[-·•]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-·•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-·•]\s+/, ''))
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: '4px 0', paddingLeft: 18, listStyle: 'disc' }}>
          {items.map((it, j) => (
            <li key={j} style={{ marginBottom: 3, lineHeight: 1.6 }}>{renderInline(it)}</li>
          ))}
        </ul>
      )
      continue
    }

    // 普通段落
    nodes.push(
      <p key={i} style={{ margin: '2px 0', lineHeight: 1.65 }}>
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <>{nodes}</>
}

/* ── 快捷问题 ── */
const QUICK_QUESTIONS = [
  { label: '预警状态', text: '当前有哪些预警？' },
  { label: '补货建议', text: '哪些耗材需要补货？' },
  { label: '待审申领', text: '待审批的申领单有多少？' },
  { label: '库存概况', text: '当前库存整体状况如何？' },
  { label: '如何补货', text: '如何创建采购申请？' },
]

/* ── 欢迎消息 ── */
const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '您好！我是 AI 助手，可以帮您查询库存预警、补货建议、申领状态等信息，也可以引导您快速跳转到相关功能。\n\n请问有什么需要帮助的？',
}

/* ── 动画 CSS ── */
const CHAT_STYLES = `
@keyframes ai-chat-slide-up {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1);    }
}
@keyframes ai-typing-dot {
  0%, 60%, 100% { opacity: 0.2; transform: translateY(0);    }
  30%           { opacity: 1;   transform: translateY(-3px); }
}
@keyframes ai-btn-pulse {
  0%   { box-shadow: 0 0 0 0   rgba(99,102,241,0.5); }
  70%  { box-shadow: 0 0 0 10px rgba(99,102,241,0);   }
  100% { box-shadow: 0 0 0 0   rgba(99,102,241,0);   }
}
.ai-chat-panel { animation: ai-chat-slide-up .22s ease both; }
.ai-msg-bubble { transition: opacity .15s; }
`

interface Props {
  onOpenPurchase?: () => void
}

export default function AiChat({ onOpenPurchase }: Props) {
  const dispatch   = useDispatch()
  // 从 Redux 读取持久化消息，为空时显示欢迎语
  const stored     = useSelector((s: RootState) => s.chat.messages)
  const messages   = stored.length === 0 ? [WELCOME] : stored

  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread]   = useState(0)
  const bottomRef             = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<any>(null)
  const navigate              = useNavigate()

  /* 滚动到底部 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* 打开面板：清未读，聚焦输入框 */
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  /* 发送消息 */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage    = { id: `u-${Date.now()}`, role: 'user',      content: trimmed }
    const loadingMsg: ChatMessage = { id: `l-${Date.now()}`, role: 'assistant', content: '', loading: true }

    dispatch(addMessage(userMsg))
    dispatch(addMessage(loadingMsg))
    setInput('')
    setLoading(true)

    try {
      const res = await aiApi.chat(trimmed)
      dispatch(resolveLoading({ content: res.reply, action: res.action }))
      if (!open) setUnread(c => c + 1)
    } catch {
      dispatch(resolveLoading({ content: '抱歉，AI 服务暂时不可用，请稍后再试。' }))
    } finally {
      setLoading(false)
    }
  }, [loading, open, dispatch])

  /* 执行操作指令 */
  const handleAction = (action: ChatAction) => {
    if (action.type === 'navigate' && action.path) {
      navigate(action.path)
      setOpen(false)
    } else if (action.type === 'open_purchase') {
      onOpenPurchase?.()
      setOpen(false)
    }
  }

  const actionLabel = (action: ChatAction) =>
    action.type === 'open_purchase' ? '打开补货采购' : '前往查看'

  const actionIcon = (action: ChatAction) =>
    action.type === 'open_purchase'
      ? <ShoppingCartOutlined style={{ fontSize: 11 }} />
      : <ArrowRightOutlined style={{ fontSize: 11 }} />

  return (
    <>
      <style>{CHAT_STYLES}</style>

      {/* ── 悬浮按钮 ── */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1001 }}>
        <Tooltip title={open ? '' : 'AI 助手'} placement="left">
          <Badge count={unread} offset={[-4, 4]}>
            <button
              onClick={() => setOpen(o => !o)}
              style={{
                width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: open
                  ? 'linear-gradient(135deg,#4f46e5,#6366f1)'
                  : 'linear-gradient(135deg,#6366f1,#818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
                animation: unread > 0 ? 'ai-btn-pulse 1.5s infinite' : 'none',
                transition: 'transform .15s, background .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {open
                ? <CloseOutlined style={{ color: '#fff', fontSize: 18 }} />
                : <RobotOutlined style={{ color: '#fff', fontSize: 22 }} />
              }
            </button>
          </Badge>
        </Tooltip>
      </div>

      {/* ── 对话面板 ── */}
      {open && (
        <div
          className="ai-chat-panel"
          style={{
            position: 'fixed', bottom: 92, right: 28, zIndex: 1000,
            width: 380, height: 540,
            background: '#fff', borderRadius: 18,
            boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* 标题栏 */}
          <div style={{
            background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#1e3a5f 100%)',
            padding: '13px 16px',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'rgba(99,102,241,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RobotOutlined style={{ color: '#c7d2fe', fontSize: 17 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>AI 助手</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                基于实时数据 · Claude 驱动
              </div>
            </div>
            <Tooltip title="清空聊天记录" placement="bottom">
              <button
                onClick={() => dispatch(clearHistory())}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'rgba(255,255,255,0.35)', fontSize: 13, borderRadius: 6,
                  display: 'flex', alignItems: 'center', transition: 'color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,200,200,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                <DeleteOutlined />
              </button>
            </Tooltip>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'rgba(255,255,255,0.4)', fontSize: 14, borderRadius: 6,
                display: 'flex', alignItems: 'center', transition: 'color .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              <CloseOutlined />
            </button>
          </div>

          {/* 消息列表 */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.map(msg => (
              <div
                key={msg.id}
                className="ai-msg-bubble"
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start', gap: 8,
                }}
              >
                {/* AI 头像 */}
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginTop: 2,
                    background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <RobotOutlined style={{ color: '#fff', fontSize: 13 }} />
                  </div>
                )}

                <div style={{ maxWidth: 272, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* 气泡 */}
                  {msg.loading ? (
                    /* 打字指示器 */
                    <div style={{
                      background: '#f0f4ff', borderRadius: '4px 12px 12px 12px',
                      padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center',
                    }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
                          display: 'inline-block',
                          animation: `ai-typing-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                        : '#f0f4ff',
                      color: msg.role === 'user' ? '#fff' : '#1f2937',
                      borderRadius: msg.role === 'user'
                        ? '12px 4px 12px 12px'
                        : '4px 12px 12px 12px',
                      padding: '10px 14px',
                      fontSize: 13, wordBreak: 'break-word',
                    }}>
                      {msg.role === 'assistant'
                        ? renderMarkdown(msg.content)
                        : msg.content}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {!msg.loading && msg.action && (
                    <button
                      onClick={() => handleAction(msg.action!)}
                      style={{
                        alignSelf: 'flex-start',
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: '#ede9fe', border: '1px solid #c4b5fd',
                        color: '#6366f1', borderRadius: 20,
                        padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#ddd6fe')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#ede9fe')}
                    >
                      {actionIcon(msg.action)}
                      {actionLabel(msg.action)}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* 快捷提问标签 */}
          <div style={{
            padding: '8px 14px 6px', borderTop: '1px solid #f0f0f0',
            display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0,
          }}>
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q.label}
                disabled={loading}
                onClick={() => sendMessage(q.text)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  border: '1px solid #e0e7ff', background: '#f5f3ff',
                  color: '#6366f1', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1, transition: 'background .15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#ede9fe' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff' }}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* 输入栏 */}
          <div style={{
            padding: '10px 14px 14px',
            display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
          }}>
            <Input
              ref={inputRef}
              placeholder="输入您的问题..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              disabled={loading}
              maxLength={200}
              style={{ borderRadius: 20, fontSize: 13, flex: 1 }}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined style={{ fontSize: 14 }} />}
              disabled={!input.trim() || loading}
              loading={loading}
              onClick={() => sendMessage(input)}
              style={{
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                  : undefined,
                border: 'none', flexShrink: 0,
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
