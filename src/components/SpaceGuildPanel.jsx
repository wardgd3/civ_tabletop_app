export default function SpaceGuildPanel({ guildShips, onClose }) {
  if (!guildShips || guildShips.length === 0) {
    return (
      <div className="p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
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
  for (const ship of guildShips) {
    const upgrades = ship.upgrades || {}
    const gcs = upgrades.guildConvoys || (upgrades.guildConvoy ? [upgrades.guildConvoy] : [])
    for (let i = 0; i < gcs.length; i++) {
      allGuildConvoys.push({ ...gcs[i], shipId: ship.id, shipName: ship.wg_unit_types?.name, gcIdx: i })
    }
  }

  const inTransit = allGuildConvoys.filter(gc => gc.inTransit)

  return (
    <div className="p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
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
        Send convoys from your ship's Convoy Bay to place orders.
      </div>

      {inTransit.length === 0 ? (
        <div className="p-2 rounded text-center" style={{ backgroundColor: '#111214', border: '1px solid #2a3140' }}>
          <div className="text-[10px]" style={{ color: '#4a5568' }}>
            No convoys en route. Send one from your ship's Convoy Bay.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {inTransit.map((gc, idx) => {
            const unitCount = (gc.units || []).length
            const munCount = Object.values(gc.munitions || {}).reduce((s, v) => s + v, 0)
            const goldAmount = gc.cargo?.gold || 0
            return (
              <div key={idx} className="p-2 rounded" style={{ backgroundColor: '#111214', border: '1px solid #d2992240' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold" style={{ color: '#d29922' }}>
                    Convoy — En Route
                    <span className="text-[8px] font-normal ml-1" style={{ color: '#6e7681' }}>({gc.shipName})</span>
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: '#8b949e' }}>
                    {gc.turnsLeft} turn{gc.turnsLeft !== 1 ? 's' : ''} remaining
                  </span>
                </div>
                <div className="text-[9px]" style={{ color: '#6e7681' }}>
                  {[
                    unitCount > 0 && `${unitCount} unit${unitCount !== 1 ? 's' : ''} ordered`,
                    munCount > 0 && `${munCount} munition${munCount !== 1 ? 's' : ''} ordered`,
                    goldAmount > 0 && `${goldAmount}g in cargo`,
                  ].filter(Boolean).join(' · ') || 'Empty'}
                </div>
                {(gc.units || []).length > 0 && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {gc.units.map((u, uidx) => (
                      <div key={uidx} className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: '#18191c', color: '#c9d1d9' }}>
                        {u.typeName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
