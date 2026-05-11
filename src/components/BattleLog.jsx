import { useEffect, useRef } from 'react'

function formatEntry(entry, myPlayerId) {
  const isMyAttack = entry.attackerId === myPlayerId
  const damage = entry.damage

  if (isMyAttack) {
    if (entry.targetIsNPC) {
      const suffix = entry.killed ? ' and killed it!' : ''
      return `Your ${entry.attackerUnit} attacked a ${entry.targetUnit} for ${damage} damage${suffix}`
    }
    const suffix = entry.killed ? ' and destroyed it!' : ''
    return `Your ${entry.attackerUnit} attacked ${entry.targetPlayerName}'s ${entry.targetUnit} for ${damage} damage${suffix}`
  }

  if (entry.attackerIsNPC) {
    const suffix = entry.killed ? ' and destroyed it!' : ''
    return `A ${entry.attackerUnit} did ${damage} damage to your ${entry.targetUnit}${suffix}`
  }
  if (entry.targetIsNPC) {
    const suffix = entry.killed ? ' and killed it!' : ''
    return `${entry.attackerPlayerName}'s ${entry.attackerUnit} attacked a ${entry.targetUnit} for ${damage} damage${suffix}`
  }
  const suffix = entry.killed ? ' and destroyed it!' : ''
  return `${entry.attackerPlayerName}'s ${entry.attackerUnit} did ${damage} damage to your ${entry.targetUnit}${suffix}`
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export default function BattleLog({ battleLog, currentPlayer, onClose, isFullscreen }) {
  const bottomRef = useRef(null)
  const myPlayerId = currentPlayer?.player_id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [battleLog.length])

  const sorted = [...battleLog].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

  return (
    <div className={`flex flex-col ${isFullscreen ? 'h-full' : ''}`} style={{ maxHeight: isFullscreen ? undefined : 280 }}>
      {onClose && (
        <div className="flex items-center justify-between mb-2 shrink-0">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#f47067' }}>Battle Log</span>
          <button
            onClick={onClose}
            className="text-xs cursor-pointer"
            style={{ color: '#4a5568' }}
          >
            &times;
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5">
        {sorted.length === 0 && (
          <div className="text-[10px] text-center py-4" style={{ color: '#4a5568' }}>No battles yet</div>
        )}
        {sorted.map((entry, i) => {
          const isMyAttack = entry.attackerId === myPlayerId
          return (
            <div
              key={i}
              className="px-2 py-1.5 rounded text-[11px] leading-tight"
              style={{
                backgroundColor: isMyAttack ? '#0d1a10' : '#1a0d0d',
                border: `1px solid ${isMyAttack ? '#1a3a1a' : '#3a1a1a'}`,
                color: isMyAttack ? '#7ee787' : '#f47067',
              }}
            >
              <div>{formatEntry(entry, myPlayerId)}</div>
              <div className="text-[9px] mt-0.5" style={{ color: '#4a5568' }}>{timeAgo(entry.timestamp)}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
