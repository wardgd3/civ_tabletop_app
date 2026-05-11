import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TeamChat({ gameId, currentPlayer, players, onClose, isFullscreen }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  const myColor = currentPlayer?.color
  const teammates = players.filter(p => p.color === myColor)
  const playerName = currentPlayer?.wg_profiles?.display_name || currentPlayer?.wg_profiles?.email || 'You'

  useEffect(() => {
    const channelName = `chat-${gameId}-${myColor}`
    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload])
      })
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, myColor])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(() => {
    const text = draft.trim()
    if (!text || !channelRef.current) return

    const msg = {
      id: crypto.randomUUID(),
      playerId: currentPlayer?.player_id,
      playerName,
      text,
      timestamp: Date.now(),
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: msg,
    })

    setMessages(prev => [...prev, msg])
    setDraft('')
  }, [draft, currentPlayer, playerName])

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: isFullscreen ? '100%' : 320,
        backgroundColor: '#0d1117',
        border: '1px solid #2a3140',
        borderRadius: isFullscreen ? 0 : 8,
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #2a3140' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: myColor || '#c9d1d9' }}>
            Team Chat
          </span>
          <span className="text-[9px] font-mono" style={{ color: '#4a5568' }}>
            {teammates.length} member{teammates.length !== 1 ? 's' : ''}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded cursor-pointer text-xs"
            style={{ color: '#8b949e' }}
          >
            &times;
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-0">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px]" style={{ color: '#4a5568' }}>No messages yet</span>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.playerId === currentPlayer?.player_id
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-[8px] font-semibold mb-0.5 px-1" style={{ color: myColor || '#8b949e' }}>
                  {msg.playerName}
                </span>
              )}
              <div
                className="rounded-lg px-2.5 py-1.5 max-w-[85%]"
                style={{
                  backgroundColor: isMe ? '#1c3043' : '#161b22',
                  border: `1px solid ${isMe ? '#2a4a6a' : '#2a3140'}`,
                }}
              >
                <span className="text-[11px] break-words" style={{ color: '#c9d1d9' }}>{msg.text}</span>
              </div>
              <span className="text-[8px] mt-0.5 px-1" style={{ color: '#30363d' }}>{formatTime(msg.timestamp)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-1.5 px-2 py-2 shrink-0" style={{ borderTop: '1px solid #2a3140' }}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Message team..."
          className="flex-1 rounded px-2.5 py-1.5 text-xs outline-none min-w-0"
          style={{ backgroundColor: '#161b22', border: '1px solid #2a3140', color: '#c9d1d9' }}
        />
        <button
          onClick={sendMessage}
          disabled={!draft.trim()}
          className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer shrink-0"
          style={{
            backgroundColor: draft.trim() ? '#1c3043' : '#161b22',
            color: draft.trim() ? '#6cb4e6' : '#4a5568',
            border: `1px solid ${draft.trim() ? '#2a4a6a' : '#2a3140'}`,
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
