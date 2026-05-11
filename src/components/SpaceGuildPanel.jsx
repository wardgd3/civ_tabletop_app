import { useState } from 'react'

const RESOURCE_VALUES = {
  coal: 3, iron: 5, uranium: 8, aluminum: 4, tritium: 10,
  ruby: 15, sapphire: 15, diamond: 20, amethyst: 12, quasicrystals: 25,
}

export default function SpaceGuildPanel({
  commandShip, onClose, onSendToGuild, onSellAtGuild, onReturnFromGuild, onBuyUnit,
  playerResources, teamGold, availableUnitTypes,
}) {
  const [sellResult, setSellResult] = useState(null)

  if (!commandShip) {
    return (
      <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src="/assets/spaceguild.png" alt="Space Guild" className="w-6 h-6 object-contain" />
            <span className="text-xs font-semibold" style={{ color: '#6cb4e6' }}>Space Guild</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-xs cursor-pointer" style={{ color: '#8b949e' }}>&times;</button>
          )}
        </div>
        <div className="text-[10px]" style={{ color: '#4a5568' }}>
          Deploy a Command Ship to trade with the Space Guild.
        </div>
      </div>
    )
  }

  const upgrades = commandShip.upgrades || {}
  const convoys = upgrades.convoys || []
  const guildConvoys = upgrades.guildConvoys || (upgrades.guildConvoy ? [upgrades.guildConvoy] : [])

  const availableConvoys = convoys
    .map((c, i) => ({ ...c, index: i }))
    .filter(c => !c.inTransit)

  const canSendMore = guildConvoys.length < 2 && !guildConvoys.some(gc => gc.inTransit)

  return (
    <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img src="/assets/spaceguild.png" alt="Space Guild" className="w-6 h-6 object-contain" />
          <span className="text-xs font-semibold" style={{ color: '#6cb4e6' }}>Space Guild</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xs cursor-pointer" style={{ color: '#8b949e' }}>&times;</button>
        )}
      </div>
      <div className="text-[10px] mb-3" style={{ color: '#8b949e' }}>
        Trade station. Send convoys to sell resources and buy units.
      </div>

      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Convoy Bay ({guildConvoys.length}/2)
      </div>

      {guildConvoys.map((gc, gcIdx) => {
        if (gc.inTransit) {
          return (
            <div key={gcIdx} className="p-2 rounded mb-2" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold" style={{ color: '#d29922' }}>Convoy {gcIdx + 1} — In Transit</span>
                <span className="text-[9px] font-mono" style={{ color: '#8b949e' }}>
                  {gc.turnsLeft} turn{gc.turnsLeft !== 1 ? 's' : ''} remaining
                </span>
              </div>
              <div className="mt-1">
                {(gc.units || []).length > 0 && (
                  <span className="text-[9px]" style={{ color: '#6e7681' }}>
                    {gc.units.length} unit{gc.units.length !== 1 ? 's' : ''}
                  </span>
                )}
                {Object.entries(gc.cargo?.resources || {}).filter(([, v]) => v > 0).length > 0 && (
                  <span className="text-[9px] ml-2" style={{ color: '#6e7681' }}>
                    {Object.entries(gc.cargo.resources).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </span>
                )}
              </div>
            </div>
          )
        }

        return (
          <div key={gcIdx} className="p-2 rounded mb-2" style={{ backgroundColor: '#0d1117', border: '1px solid #6cb4e640' }}>
            <div className="text-[10px] font-semibold mb-1.5" style={{ color: '#3fb950' }}>Convoy {gcIdx + 1} — Docked</div>

            {(gc.units || []).length > 0 && (
              <div className="mb-2">
                <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Units:</div>
                {gc.units.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1 rounded mb-0.5"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                    <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{u.typeName}</span>
                    <button
                      onClick={async () => {
                        const earned = await onSellAtGuild(commandShip.id, gcIdx, [idx], null)
                        if (earned) setSellResult(`+${earned}g`)
                        setTimeout(() => setSellResult(null), 2000)
                      }}
                      className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                      style={{ backgroundColor: '#cca43b20', color: '#cca43b', border: '1px solid #cca43b40' }}
                    >
                      Sell ({u.cost || 10}g)
                    </button>
                  </div>
                ))}
              </div>
            )}

            {Object.entries(gc.cargo?.resources || {}).filter(([, v]) => v > 0).length > 0 && (
              <div className="mb-2">
                <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Resources:</div>
                {Object.entries(gc.cargo.resources).filter(([, v]) => v > 0).map(([key, amount]) => (
                  <div key={key} className="flex items-center justify-between p-1 rounded mb-0.5"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                    <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{key}: {amount}</span>
                    <button
                      onClick={async () => {
                        const earned = await onSellAtGuild(commandShip.id, gcIdx, null, { [key]: amount })
                        if (earned) setSellResult(`+${earned}g`)
                        setTimeout(() => setSellResult(null), 2000)
                      }}
                      className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                      style={{ backgroundColor: '#cca43b20', color: '#cca43b', border: '1px solid #cca43b40' }}
                    >
                      Sell ({amount * (RESOURCE_VALUES[key] || 5)}g)
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(gc.cargo?.gold || 0) > 0 && (
              <div className="p-1 rounded mb-2" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <span className="text-[9px]" style={{ color: '#cca43b' }}>Gold in cargo: {gc.cargo.gold}</span>
              </div>
            )}

            {sellResult && (
              <div className="text-center text-xs font-bold mb-1" style={{ color: '#3fb950' }}>{sellResult}</div>
            )}

            <button
              onClick={() => onReturnFromGuild(commandShip.id, gcIdx)}
              className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded cursor-pointer"
              style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
            >
              Return Convoy to Ship
            </button>
          </div>
        )
      })}

      {canSendMore && guildConvoys.length < 2 && (
        <div className="mb-2">
          {availableConvoys.length === 0 ? (
            <div className="p-2 rounded text-center" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140' }}>
              <div className="text-[10px]" style={{ color: '#4a5568' }}>
                No convoys available. Build one in your Command Ship's Convoy Bay.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {availableConvoys.map(c => {
                const unitCount = (c.units || []).length
                const hasResources = Object.values(c.cargo?.resources || {}).some(v => v > 0)
                const hasCargo = unitCount > 0 || hasResources || (c.cargo?.gold || 0) > 0
                return (
                  <button
                    key={c.index}
                    onClick={() => onSendToGuild(commandShip.id, c.index)}
                    className="flex items-center justify-between p-2 rounded cursor-pointer"
                    style={{
                      backgroundColor: hasCargo ? '#6cb4e610' : '#0d1117',
                      border: `1px solid ${hasCargo ? '#6cb4e640' : '#2a3140'}`,
                    }}
                  >
                    <div className="text-left">
                      <div className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                        Convoy {c.index + 1}
                      </div>
                      <div className="text-[9px]" style={{ color: '#6e7681' }}>
                        {unitCount > 0 ? `${unitCount} unit${unitCount !== 1 ? 's' : ''}` : ''}
                        {hasResources ? (unitCount > 0 ? ' + cargo' : 'cargo loaded') : ''}
                        {!hasCargo ? 'Empty' : ''}
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: '#6cb4e6' }}>
                      Send (5 turns)
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {guildConvoys.some(gc => !gc.inTransit) && availableUnitTypes && availableUnitTypes.length > 0 && (
        <>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5 mt-3" style={{ color: '#4a5568' }}>
            Purchase Units
          </div>
          <div className="text-[9px] mb-1.5" style={{ color: '#6e7681' }}>
            Units are loaded directly into a docked convoy.
          </div>
          <div className="flex flex-col gap-1 mb-2">
            {availableUnitTypes.map(ut => {
              const canAfford = teamGold >= ut.cost
              const dockedIdx = guildConvoys.findIndex(gc => !gc.inTransit)
              return (
                <button
                  key={ut.id}
                  onClick={() => canAfford && dockedIdx >= 0 && onBuyUnit(commandShip.id, dockedIdx, ut.id)}
                  disabled={!canAfford}
                  className="flex items-center justify-between p-1.5 rounded transition-colors"
                  style={{
                    backgroundColor: canAfford ? '#1a2a3a10' : '#0d1117',
                    border: `1px solid ${canAfford ? '#6cb4e640' : '#2a3140'}`,
                    cursor: canAfford ? 'pointer' : 'default',
                    opacity: canAfford ? 1 : 0.4,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`/assets/${ut.name.toLowerCase().replace(/\s+/g, '')}.png`}
                      alt={ut.name}
                      className="w-6 h-6 object-contain"
                    />
                    <div className="text-left">
                      <div className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{ut.name}</div>
                      <div className="text-[8px]" style={{ color: '#6e7681' }}>
                        ATK {ut.attack} DEF {ut.defense} HP {ut.hp}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold" style={{ color: '#cca43b' }}>
                    ⚒{ut.cost}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1 mt-2" style={{ color: '#4a5568' }}>
        Price List
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {Object.entries(RESOURCE_VALUES).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[9px]" style={{ color: '#8b949e' }}>{key}</span>
            <span className="text-[9px] font-mono" style={{ color: '#cca43b' }}>{val}g</span>
          </div>
        ))}
      </div>
    </div>
  )
}
