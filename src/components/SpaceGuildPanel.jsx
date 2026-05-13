import { useState } from 'react'

const RESOURCE_VALUES = {
  coal: 3, iron: 5, uranium: 8, aluminum: 4, tritium: 10,
  ruby: 15, sapphire: 15, diamond: 20, amethyst: 12, quasicrystals: 25,
}

export default function SpaceGuildPanel({
  guildShips, onClose, onSendToGuild, onSellAtGuild, onReturnFromGuild, onBuyUnit, onBuyMunition,
  playerResources, teamGold, availableUnitTypes, commandShipUpgrades,
}) {
  const [sellResult, setSellResult] = useState(null)
  const [expandedGuildConvoy, setExpandedGuildConvoy] = useState(null)

  if (!guildShips || guildShips.length === 0) {
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

  const allGuildConvoys = []
  const allAvailableConvoys = []
  for (const ship of guildShips) {
    const upgrades = ship.upgrades || {}
    const gcs = upgrades.guildConvoys || (upgrades.guildConvoy ? [upgrades.guildConvoy] : [])
    for (let i = 0; i < gcs.length; i++) {
      allGuildConvoys.push({ ...gcs[i], shipId: ship.id, shipName: ship.wg_unit_types?.name, gcIdx: i })
    }
    const convoys = upgrades.convoys || []
    for (let i = 0; i < convoys.length; i++) {
      if (!convoys[i].inTransit) {
        allAvailableConvoys.push({ ...convoys[i], shipId: ship.id, shipName: ship.wg_unit_types?.name, index: i })
      }
    }
  }

  const canSendMore = allGuildConvoys.length < 2 && !allGuildConvoys.some(gc => gc.inTransit)

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
        Convoy Bay ({allGuildConvoys.length}/2)
      </div>

      {allGuildConvoys.map((gc, flatIdx) => {
        if (gc.inTransit) {
          return (
            <div key={flatIdx} className="p-2 rounded mb-2" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold" style={{ color: '#d29922' }}>
                  Convoy — In Transit
                  <span className="text-[8px] font-normal ml-1" style={{ color: '#6e7681' }}>({gc.shipName})</span>
                </span>
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

        const unitCount = (gc.units || []).length
        const resCount = Object.values(gc.cargo?.resources || {}).filter(v => v > 0).length
        const munCount = Object.values(gc.munitions || {}).filter(v => v > 0).length
        const goldAmount = gc.cargo?.gold || 0
        const totalItems = unitCount + resCount + munCount + (goldAmount > 0 ? 1 : 0)
        const isExpanded = expandedGuildConvoy === flatIdx

        return (
          <div key={flatIdx} className="p-2 rounded mb-2" style={{ backgroundColor: '#0d1117', border: '1px solid #6cb4e640' }}>
            <div
              onClick={() => setExpandedGuildConvoy(isExpanded ? null : flatIdx)}
              className="flex items-center justify-between cursor-pointer"
              style={{ marginBottom: isExpanded ? 6 : 0 }}
            >
              <span className="text-[10px] font-semibold" style={{ color: '#3fb950' }}>
                Convoy — Docked
                <span className="text-[8px] font-normal ml-1" style={{ color: '#6e7681' }}>({gc.shipName})</span>
              </span>
              <span className="text-[9px]" style={{ color: '#6e7681' }}>
                {totalItems > 0 ? `${totalItems} item${totalItems !== 1 ? 's' : ''}` : 'Empty'} {isExpanded ? '▴' : '▾'}
              </span>
            </div>

            {isExpanded && (
              <div className="mb-2">
                <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Units ({(gc.units || []).length}/4):</div>
                {(gc.units || []).length > 0 ? gc.units.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1 rounded mb-0.5"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                    <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{u.typeName}</span>
                    <button
                      onClick={async () => {
                        const earned = await onSellAtGuild(gc.shipId, gc.gcIdx, [idx], null)
                        if (earned) setSellResult(`+${earned}g`)
                        setTimeout(() => setSellResult(null), 2000)
                      }}
                      className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                      style={{ backgroundColor: '#cca43b20', color: '#cca43b', border: '1px solid #cca43b40' }}
                    >
                      Sell ({u.cost || 10}g)
                    </button>
                  </div>
                )) : (
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="flex-1 rounded" style={{ height: 24, backgroundColor: '#161b22', border: '1px solid #2a3140' }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {isExpanded && (
              <div className="mb-2">
                <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Cargo:</div>
                {Object.entries(gc.cargo?.resources || {}).filter(([, v]) => v > 0).length > 0 ? (
                  <>
                    {Object.entries(gc.cargo.resources).filter(([, v]) => v > 0).map(([key, amount]) => (
                      <div key={key} className="flex items-center justify-between p-1 rounded mb-0.5"
                        style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                        <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{key}: {amount}</span>
                        <button
                          onClick={async () => {
                            const earned = await onSellAtGuild(gc.shipId, gc.gcIdx, null, { [key]: amount })
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
                  </>
                ) : (
                  <div className="p-1 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                    <span className="text-[9px]" style={{ color: '#4a5568' }}>None</span>
                  </div>
                )}
              </div>
            )}

            {isExpanded && (() => {
              const munitions = gc.munitions || {}
              const MISSILE_TYPES = [
                { key: 'tactical', name: 'Tactical', color: '#8b949e' },
                { key: 'cruise', name: 'Cruise', color: '#3fb950' },
                { key: 'ipbm', name: 'IPBM', color: '#d29922' },
              ]
              const totalMun = MISSILE_TYPES.reduce((s, m) => s + (munitions[m.key] || 0), 0)
              return (
                <div className="mb-2">
                  <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Munitions ({totalMun}):</div>
                  {totalMun > 0 ? MISSILE_TYPES.filter(m => (munitions[m.key] || 0) > 0).map(m => (
                    <div key={m.key} className="flex items-center justify-between p-1 rounded mb-0.5"
                      style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                      <span className="text-[9px] font-semibold" style={{ color: m.color }}>{m.name}</span>
                      <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>x{munitions[m.key]}</span>
                    </div>
                  )) : (
                    <div className="p-1 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                      <span className="text-[9px]" style={{ color: '#4a5568' }}>None</span>
                    </div>
                  )}
                </div>
              )
            })()}

            {isExpanded && (gc.cargo?.gold || 0) > 0 && (
              <div className="p-1 rounded mb-2" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <span className="text-[9px]" style={{ color: '#cca43b' }}>Gold in cargo: {gc.cargo.gold}</span>
              </div>
            )}

            {isExpanded && sellResult && (
              <div className="text-center text-xs font-bold mb-1" style={{ color: '#3fb950' }}>{sellResult}</div>
            )}

            <button
              onClick={() => onReturnFromGuild(gc.shipId, gc.gcIdx)}
              className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded cursor-pointer"
              style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
            >
              Return to {gc.shipName}
            </button>
          </div>
        )
      })}

      {canSendMore && allGuildConvoys.length < 2 && (
        <div className="mb-2">
          {allAvailableConvoys.length === 0 ? (
            <div className="p-2 rounded text-center" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140' }}>
              <div className="text-[10px]" style={{ color: '#4a5568' }}>
                No convoys available. Build one in your ship's Convoy Bay.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {allAvailableConvoys.map((c, i) => {
                const unitCount = (c.units || []).length
                const hasResources = Object.values(c.cargo?.resources || {}).some(v => v > 0)
                const hasCargo = unitCount > 0 || hasResources || (c.cargo?.gold || 0) > 0
                return (
                  <button
                    key={i}
                    onClick={() => onSendToGuild(c.shipId, c.index)}
                    className="flex items-center justify-between p-2 rounded cursor-pointer"
                    style={{
                      backgroundColor: hasCargo ? '#6cb4e610' : '#0d1117',
                      border: `1px solid ${hasCargo ? '#6cb4e640' : '#2a3140'}`,
                    }}
                  >
                    <div className="text-left">
                      <div className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                        Convoy {c.index + 1}
                        <span className="text-[8px] font-normal ml-1" style={{ color: '#6e7681' }}>({c.shipName})</span>
                      </div>
                      <div className="text-[9px]" style={{ color: '#6e7681' }}>
                        {unitCount > 0 ? `${unitCount} unit${unitCount !== 1 ? 's' : ''}` : ''}
                        {hasResources ? (unitCount > 0 ? ' + cargo' : 'cargo loaded') : ''}
                        {!hasCargo ? 'Empty' : ''}
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: '#6cb4e6' }}>
                      Send (3 turns)
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {allGuildConvoys.some(gc => !gc.inTransit) && availableUnitTypes && availableUnitTypes.length > 0 && (
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
              const docked = allGuildConvoys.find(gc => !gc.inTransit)
              return (
                <button
                  key={ut.id}
                  onClick={() => canAfford && docked && onBuyUnit(docked.shipId, docked.gcIdx, ut.id)}
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

      {allGuildConvoys.some(gc => !gc.inTransit) && (() => {
        const missileLevel = (commandShipUpgrades || {}).missiles
        const mlSlots = Array.isArray(missileLevel) ? missileLevel : []
        const effectiveLevel = mlSlots.reduce((max, v) => Math.max(max, v || 0), 0)
        const MISSILE_TYPES = [
          { key: 'tactical', name: 'Tactical', color: '#8b949e', cost: 5, reqLevel: 1 },
          { key: 'cruise', name: 'Cruise', color: '#3fb950', cost: 10, reqLevel: 2 },
          { key: 'ipbm', name: 'IPBM', color: '#d29922', cost: 20, reqLevel: 3 },
        ]
        const available = MISSILE_TYPES.filter(m => effectiveLevel >= m.reqLevel)
        if (available.length === 0) return null
        const docked = allGuildConvoys.find(gc => !gc.inTransit)
        return (
          <>
            <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5 mt-3" style={{ color: '#4a5568' }}>
              Purchase Munitions
            </div>
            <div className="text-[9px] mb-1.5" style={{ color: '#6e7681' }}>
              Munitions are loaded into the convoy and deposited on return.
            </div>
            <div className="flex gap-1.5 mb-2">
              {MISSILE_TYPES.map(m => {
                const locked = effectiveLevel < m.reqLevel
                const canAfford = teamGold >= m.cost
                const disabled = locked || !canAfford
                return (
                  <button
                    key={m.key}
                    onClick={() => !disabled && docked && onBuyMunition(docked.shipId, docked.gcIdx, m.key)}
                    disabled={disabled}
                    className="flex-1 rounded p-1.5 text-center transition-all"
                    style={{
                      backgroundColor: disabled ? '#161b22' : m.color + '15',
                      border: `1px solid ${disabled ? '#2a3140' : m.color + '60'}`,
                      cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    <div className="text-[9px] font-semibold" style={{ color: locked ? '#4a5568' : m.color }}>
                      {locked ? 'Locked' : m.name}
                    </div>
                    {!locked && (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <span className="text-[9px] font-mono" style={{ color: '#cca43b' }}>{m.cost}g</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )
      })()}

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
