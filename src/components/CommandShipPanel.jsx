import { useState } from 'react'

const ICON_STYLE = { width: 14, height: 14, fill: 'none', stroke: '#8b949e', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  reactor: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
      <line x1="8" y1="1" x2="8" y2="3" />
      <line x1="8" y1="13" x2="8" y2="15" />
      <line x1="1" y1="8" x2="3" y2="8" />
      <line x1="13" y1="8" x2="15" y2="8" />
    </svg>
  ),
  shields: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M8 1.5 L14 4 L14 8 C14 12 8 14.5 8 14.5 C8 14.5 2 12 2 8 L2 4 Z" />
    </svg>
  ),
  factory: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M1 14 L1 8 L5 10 L5 7 L9 9 L9 6 L13 8 L13 3 L15 3 L15 14 Z" />
    </svg>
  ),
  cannon: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M2 12 L6 8 L14 3" />
      <circle cx="14" cy="3" r="1.5" />
      <path d="M2 12 L4 14 L6 12" />
    </svg>
  ),
  missiles: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M8 1 L10 5 L9 6 L9 12 L10 14 L8 15 L6 14 L7 12 L7 6 L6 5 Z" />
      <line x1="6" y1="14" x2="5" y2="15" />
      <line x1="10" y1="14" x2="11" y2="15" />
    </svg>
  ),
  transport: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M2 10 L2 6 L12 6 L14 8 L14 10" />
      <line x1="1" y1="10" x2="15" y2="10" />
      <path d="M4 6 L4 4 L8 4 L8 6" />
    </svg>
  ),
  holding_bay: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M2 5 L8 2 L14 5 L14 13 L2 13 Z" />
      <line x1="2" y1="5" x2="14" y2="5" />
      <line x1="8" y1="2" x2="8" y2="5" />
      <line x1="5" y1="9" x2="11" y2="9" />
    </svg>
  ),
  loading_bay: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <rect x="2" y="6" width="12" height="8" rx="1" />
      <path d="M5 6 L5 3 L11 3 L11 6" />
      <line x1="6" y1="10" x2="10" y2="10" />
      <line x1="8" y1="8" x2="8" y2="12" />
    </svg>
  ),
  iron_dome: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M2 12 C2 6 8 2 8 2 C8 2 14 6 14 12" />
      <line x1="1" y1="12" x2="15" y2="12" />
      <circle cx="8" cy="8" r="1" />
    </svg>
  ),
}

const TIERS = [
  { level: 1, name: 'Standard', color: '#8b949e', cost: 0 },
  { level: 2, name: 'Advanced', color: '#3fb950', cost: 10 },
  { level: 3, name: 'Elite', color: '#d29922', cost: 25 },
]

const COMMAND_SHIP_COMPARTMENTS = [
  {
    id: 'reactor',
    name: 'Reactor Core',
    description: 'Powers all ship systems.',
    icon: 'reactor',
    color: '#e6a020',
    slots: 1,
    tiers: [
      { name: 'Fission Reactor', desc: 'Basic energy output' },
      { name: 'Fusion Reactor', desc: 'Double energy output' },
      { name: 'Quantum Reactor', desc: 'Maximum energy output' },
    ],
  },
  {
    id: 'shields',
    name: 'Shields',
    description: 'Protects the ship from damage.',
    icon: 'shields',
    color: '#40a0e0',
    slots: 1,
    tiers: [
      { name: 'Deflector Array', desc: 'Basic shielding' },
      { name: 'Adaptive Matrix', desc: 'Regenerating shields' },
      { name: 'Phase Shields', desc: 'Maximum protection' },
    ],
  },
  {
    id: 'factory',
    name: 'Factory',
    description: 'Manufactures units. Each slot is a production line.',
    icon: 'factory',
    color: '#60b060',
    slots: 3,
    tiers: [
      { name: 'Assembly Line', desc: 'Basic production' },
      { name: 'Nano-Forge', desc: 'Faster production' },
      { name: 'Quantum Replicator', desc: 'Instant production' },
    ],
  },
  {
    id: 'cannon',
    name: 'Cannon',
    description: 'Weapon systems. Each slot mounts a weapon.',
    icon: 'cannon',
    color: '#e05050',
    slots: 3,
    tiers: [
      { name: 'Railgun Turret', desc: 'Basic kinetic weapon' },
      { name: 'Plasma Cannon', desc: 'Energy weapon' },
      { name: 'Antimatter Cannon', desc: 'Maximum firepower' },
    ],
  },
  {
    id: 'missiles',
    name: 'Missile Systems',
    description: 'Guided missile platforms. Each slot is a launcher.',
    icon: 'missiles',
    color: '#c060e0',
    slots: 3,
    tiers: [
      { name: 'Tactical Missiles', desc: 'Short-range guided missiles' },
      { name: 'Cruise Missiles', desc: 'Long-range precision strike' },
      { name: 'IPBM', desc: 'Interplanetary ballistic missiles' },
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    description: 'Build convoy ships to transport ground units. 5 turns to reach ground.',
    icon: 'transport',
    color: '#50b0b0',
    special: 'transport',
    slots: 2,
  },
  {
    id: 'holding_bay',
    name: 'Unit Bay',
    description: 'Produce and store up to 12 units. Deploy them to the ground board.',
    icon: 'holding_bay',
    color: '#a08040',
    special: 'holding_bay',
    slots: 12,
  },
]

const COMMAND_CENTER_COMPARTMENTS = [
  {
    id: 'shields',
    name: 'Shields',
    description: 'Defensive barrier around the base.',
    icon: 'shields',
    color: '#40a0e0',
    slots: 1,
    tiers: [
      { name: 'Perimeter Barrier', desc: 'Basic shielding' },
      { name: 'Defense Grid', desc: 'Layered defense' },
      { name: 'Quantum Barrier', desc: 'Maximum shielding' },
    ],
  },
  {
    id: 'cannon',
    name: 'Cannons',
    description: 'Base defense turrets.',
    icon: 'cannon',
    color: '#e05050',
    slots: 3,
    tiers: [
      { name: 'Turret Emplacement', desc: 'Basic turret' },
      { name: 'Plasma Turrets', desc: 'Heavy turrets' },
      { name: 'Strike Cannon', desc: 'Maximum firepower' },
    ],
  },
  {
    id: 'iron_dome',
    name: 'Iron Dome',
    description: 'Anti-projectile defense system.',
    icon: 'iron_dome',
    color: '#60b060',
    slots: 1,
    tiers: [
      { name: 'Interceptor Array', desc: 'Basic interception' },
      { name: 'Multi-Target System', desc: 'Enhanced tracking' },
      { name: 'Total Coverage Dome', desc: 'Full interception' },
    ],
  },
  {
    id: 'reactor',
    name: 'Reactor Core',
    description: 'Powers all base systems.',
    icon: 'reactor',
    color: '#e6a020',
    slots: 1,
    tiers: [
      { name: 'Generator', desc: 'Basic power' },
      { name: 'Fusion Reactor', desc: 'Enhanced power' },
      { name: 'Quantum Plant', desc: 'Maximum power' },
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    description: 'Receive and send convoys between Command Ship and Command Center.',
    icon: 'transport',
    color: '#50b0b0',
    special: 'transport',
    slots: 2,
  },
  {
    id: 'holding_bay',
    name: 'Unit Bay',
    description: 'Produce and store up to 12 units. Deploy them to the ground board.',
    icon: 'holding_bay',
    color: '#a08040',
    special: 'holding_bay',
    slots: 12,
  },
  {
    id: 'loading_bay',
    name: 'Loading Bay',
    description: 'Dock armored transports to load soldiers. Up to 2 transports.',
    icon: 'loading_bay',
    color: '#6080a0',
    special: 'loading_bay',
    slots: 2,
  },
]

const BASE_COMPARTMENTS = [
  {
    id: 'loading_bay',
    name: 'Loading Bay',
    description: 'Dock armored transports to load soldiers. 1 transport.',
    icon: 'loading_bay',
    color: '#6080a0',
    special: 'loading_bay',
    slots: 1,
  },
]

const CONVOY_COST = 15
const CONVOY_CAPACITY = 4
const CONVOY_TRANSIT_TURNS = 5
const HOLDING_BAY_CAPACITY = 12

export function getCompartments(unitName) {
  if (unitName === 'Command Ship') return COMMAND_SHIP_COMPARTMENTS
  if (unitName === 'Command Center') return COMMAND_CENTER_COMPARTMENTS
  if (unitName === 'Base') return BASE_COMPARTMENTS
  return []
}

function getSlots(upgrades, compartmentId, slotCount) {
  const data = upgrades[compartmentId]
  if (Array.isArray(data)) {
    const slots = data.slice(0, slotCount)
    while (slots.length < slotCount) slots.push(0)
    return slots
  }
  const oldLevel = typeof data === 'number' ? data : 0
  const slots = []
  for (let i = 0; i < slotCount; i++) {
    slots.push(i < Math.min(oldLevel, slotCount) ? 1 : 0)
  }
  return slots
}

function ConvoyDetail({ unit, convoy, convoyIndex, upgrades, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onLoadCargo, onUnloadCargo, groundUnits, comp, isCC, teamGold, playerResources }) {
  const [goldAmount, setGoldAmount] = useState('')
  const sendLabel = isCC ? 'Send to Space' : 'Send to Ground'
  const cargo = convoy.cargo || { gold: 0, resources: {} }
  const hasAnyCargo = (cargo.gold || 0) > 0 || Object.values(cargo.resources || {}).some(v => v > 0)
  const hasAnyLoad = (convoy.units || []).length > 0 || hasAnyCargo

  const availableResources = Object.entries(playerResources || {}).filter(
    ([key, amount]) => amount > 0 && key !== 'excavations'
  )

  return (
    <div className="p-2 rounded" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Convoy {convoyIndex + 1} — Units
      </div>

      {(convoy.units || []).length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Loaded:</div>
          <div className="flex flex-col gap-0.5">
            {convoy.units.map((u, idx) => (
              <div key={idx} className="flex items-center justify-between p-1 rounded"
                style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{u.typeName}</span>
                <button
                  onClick={() => onUnloadToHoldingBay(unit.id, convoyIndex, idx)}
                  className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                  style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                >
                  Unload
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(convoy.units || []).length < CONVOY_CAPACITY && (() => {
        const bayUnits = upgrades.holdingBay || []
        const hasAny = groundUnits.length > 0 || bayUnits.length > 0
        return (
          <div className="mb-2">
            <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Available units:</div>
            {!hasAny ? (
              <div className="text-[9px]" style={{ color: '#4a5568' }}>No units available to load</div>
            ) : (
              <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
                {bayUnits.map((bu, idx) => (
                  <button
                    key={`bay-${idx}`}
                    onClick={() => onLoadFromBay(unit.id, convoyIndex, idx)}
                    className="flex items-center justify-between p-1 rounded text-left cursor-pointer"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{bu.typeName}</span>
                      <span className="text-[7px] px-1 rounded" style={{ backgroundColor: '#a08040' + '30', color: '#a08040', border: '1px solid #a08040' + '50' }}>BAY</span>
                    </div>
                    <span className="text-[8px]" style={{ color: comp.color }}>Load</span>
                  </button>
                ))}
                {groundUnits.map(gu => (
                  <button
                    key={gu.id}
                    onClick={() => onLoadUnit(unit.id, convoyIndex, gu.id)}
                    className="flex items-center justify-between p-1 rounded text-left cursor-pointer"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
                  >
                    <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{gu.wg_unit_types?.name}</span>
                    <span className="text-[8px]" style={{ color: comp.color }}>Load</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5 mt-2" style={{ color: '#4a5568' }}>
        Cargo
      </div>

      {((cargo.gold || 0) > 0 || Object.keys(cargo.resources || {}).length > 0) && (
        <div className="mb-2">
          <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Loaded cargo:</div>
          <div className="flex flex-col gap-0.5">
            {(cargo.gold || 0) > 0 && (
              <div className="flex items-center justify-between p-1 rounded"
                style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <span className="text-[9px]" style={{ color: '#cca43b' }}>Gold: {cargo.gold}</span>
              </div>
            )}
            {Object.entries(cargo.resources || {}).filter(([, v]) => v > 0).map(([key, amount]) => (
              <div key={key} className="flex items-center justify-between p-1 rounded"
                style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{key}: {amount}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onUnloadCargo(unit.id, convoyIndex)}
            className="w-full mt-1 py-1 text-[9px] font-semibold uppercase tracking-wide rounded cursor-pointer"
            style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
          >
            Unload All Cargo
          </button>
        </div>
      )}

      <div className="flex gap-1 mb-1">
        <input
          type="number"
          min="1"
          max={teamGold}
          value={goldAmount}
          onChange={e => setGoldAmount(e.target.value)}
          placeholder="Gold amt"
          className="flex-1 px-1.5 py-1 text-[9px] rounded"
          style={{ backgroundColor: '#161b22', border: '1px solid #30363d', color: '#c9d1d9', outline: 'none' }}
        />
        <button
          onClick={() => {
            const amt = parseInt(goldAmount)
            if (amt > 0) { onLoadCargo(unit.id, convoyIndex, { gold: amt }); setGoldAmount('') }
          }}
          disabled={!goldAmount || parseInt(goldAmount) <= 0 || parseInt(goldAmount) > teamGold}
          className="px-2 py-1 text-[8px] font-semibold uppercase rounded cursor-pointer disabled:opacity-30"
          style={{ backgroundColor: '#cca43b20', color: '#cca43b', border: '1px solid #cca43b40' }}
        >
          + Gold
        </button>
      </div>

      {availableResources.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mb-2">
          {availableResources.map(([key, amount]) => (
            <button
              key={key}
              onClick={() => onLoadCargo(unit.id, convoyIndex, { resources: { [key]: amount } })}
              className="px-1.5 py-0.5 text-[8px] rounded cursor-pointer"
              style={{ backgroundColor: '#161b22', border: '1px solid #2a3140', color: '#c9d1d9' }}
            >
              {key} ({amount})
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => onSendConvoy(unit.id, convoyIndex)}
        className="w-full mt-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
        style={{
          backgroundColor: hasAnyLoad ? '#d29922' + '20' : '#21262d',
          color: hasAnyLoad ? '#d29922' : '#8b949e',
          border: `1px solid ${hasAnyLoad ? '#d29922' + '40' : '#30363d'}`,
        }}
      >
        {hasAnyLoad ? `${sendLabel} (${CONVOY_TRANSIT_TURNS} turns)` : `Return Empty (${CONVOY_TRANSIT_TURNS} turns)`}
      </button>
    </div>
  )
}

function TransportPanel({ unit, upgrades, onBuildConvoy, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onLoadCargo, onUnloadCargo, groundUnits, comp, isAdmin, teamGold, playerResources }) {
  const [selectedConvoy, setSelectedConvoy] = useState(null)
  const convoys = upgrades.convoys || []
  const maxConvoys = comp.slots
  const isCC = unit.wg_unit_types?.name === 'Command Center'
  const availableConvoys = convoys.map((c, i) => ({ ...c, idx: i })).filter(c => !c.inTransit)
  const inTransitConvoys = convoys.map((c, i) => ({ ...c, idx: i })).filter(c => c.inTransit)

  if (isCC) {
    return (
      <div>
        {availableConvoys.length > 0 && (
          <>
            <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
              Available Convoys ({availableConvoys.length})
            </div>
            <div className="flex flex-col gap-1.5 mb-2">
              {availableConvoys.map(convoy => {
                const isSelected = selectedConvoy === convoy.idx
                return (
                  <button
                    key={convoy.idx}
                    onClick={() => setSelectedConvoy(isSelected ? null : convoy.idx)}
                    className="p-2 rounded text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? comp.color + '20' : '#161b22',
                      border: `1px solid ${isSelected ? comp.color : '#30363d'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                        Convoy
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: '#8b949e' }}>
                        {convoy.units?.length || 0}/{CONVOY_CAPACITY} loaded
                      </span>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: CONVOY_CAPACITY }, (_, j) => {
                        const loadedUnit = convoy.units?.[j]
                        return (
                          <div key={j} className="flex-1 h-3 rounded"
                            style={{
                              backgroundColor: loadedUnit ? comp.color + '40' : '#21262d',
                              border: `1px solid ${loadedUnit ? comp.color + '80' : '#30363d'}`,
                            }}
                          />
                        )
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {selectedConvoy !== null && convoys[selectedConvoy] && !convoys[selectedConvoy].inTransit && (
          <ConvoyDetail
            unit={unit} convoy={convoys[selectedConvoy]} convoyIndex={selectedConvoy}
            upgrades={upgrades} onLoadUnit={onLoadUnit} onLoadFromBay={onLoadFromBay}
            onUnloadToHoldingBay={onUnloadToHoldingBay} onSendConvoy={onSendConvoy}
            onLoadCargo={onLoadCargo} onUnloadCargo={onUnloadCargo}
            groundUnits={groundUnits} comp={comp} isCC={true}
            teamGold={teamGold} playerResources={playerResources}
          />
        )}

        <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5 mt-2" style={{ color: '#4a5568' }}>
          Incoming ({inTransitConvoys.length})
        </div>
        {inTransitConvoys.length === 0 ? (
          <div className="text-[9px] p-2 rounded text-center" style={{ backgroundColor: '#161b22', border: '1px solid #30363d', color: '#4a5568' }}>
            No convoys in transit
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {inTransitConvoys.map(convoy => (
              <div key={convoy.idx} className="p-2 rounded"
                style={{ backgroundColor: '#161b22', border: '1px solid #d29922' + '60' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>Convoy</span>
                  <span className="text-[9px] font-mono" style={{ color: '#d29922' }}>
                    ARRIVING — {convoy.turnsLeft} turns
                  </span>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: CONVOY_CAPACITY }, (_, j) => {
                    const loadedUnit = convoy.units?.[j]
                    return (
                      <div key={j} className="flex-1 h-3 rounded"
                        style={{
                          backgroundColor: loadedUnit ? comp.color + '40' : '#21262d',
                          border: `1px solid ${loadedUnit ? comp.color + '80' : '#30363d'}`,
                        }}
                      />
                    )
                  })}
                </div>
                {(convoy.units || []).length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {convoy.units.map((u, idx) => (
                      <div key={idx} className="flex items-center p-1 rounded"
                        style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140' }}>
                        <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{u.typeName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {availableConvoys.length === 0 && inTransitConvoys.length === 0 && (
          <div className="text-[9px] p-2 rounded text-center" style={{ backgroundColor: '#161b22', border: '1px solid #30363d', color: '#4a5568' }}>
            No convoys — build and send from Command Ship
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Convoy Bays ({convoys.filter(c => !c.inTransit).length}/{maxConvoys})
      </div>
      <div className="flex flex-col gap-1.5 mb-2">
        {Array.from({ length: maxConvoys }, (_, i) => {
          const convoy = convoys[i]
          const isSelected = selectedConvoy === i
          if (!convoy) {
            return (
              <button
                key={i}
                onClick={() => onBuildConvoy(unit.id)}
                className="p-2 rounded text-center transition-all cursor-pointer"
                style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
              >
                <div className="text-[10px]" style={{ color: '#4a5568' }}>+ Build Convoy ({CONVOY_COST} gold)</div>
              </button>
            )
          }
          if (convoy.inTransit) {
            return (
              <div
                key={i}
                className="p-2 rounded opacity-60"
                style={{ backgroundColor: '#161b22', border: '1px solid #d29922' + '60' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                    Convoy {i + 1}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: '#d29922' }}>
                    IN TRANSIT — {convoy.turnsLeft} turns
                  </span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: CONVOY_CAPACITY }, (_, j) => (
                    <div
                      key={j}
                      className="flex-1 h-3 rounded"
                      style={{ backgroundColor: '#21262d', border: '1px solid #30363d' }}
                    />
                  ))}
                </div>
              </div>
            )
          }
          return (
            <button
              key={i}
              onClick={() => setSelectedConvoy(isSelected ? null : i)}
              className="p-2 rounded text-left transition-all cursor-pointer"
              style={{
                backgroundColor: isSelected ? comp.color + '20' : '#161b22',
                border: `1px solid ${isSelected ? comp.color : '#30363d'}`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                  Convoy {i + 1}
                </span>
                <span className="text-[9px] font-mono" style={{ color: '#8b949e' }}>
                  {convoy.units?.length || 0}/{CONVOY_CAPACITY} loaded
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: CONVOY_CAPACITY }, (_, j) => {
                  const loadedUnit = convoy.units?.[j]
                  return (
                    <div
                      key={j}
                      className="flex-1 h-3 rounded"
                      style={{
                        backgroundColor: loadedUnit ? comp.color + '40' : '#21262d',
                        border: `1px solid ${loadedUnit ? comp.color + '80' : '#30363d'}`,
                      }}
                    />
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>

      {selectedConvoy !== null && convoys[selectedConvoy] && !convoys[selectedConvoy].inTransit && (
        <ConvoyDetail
          unit={unit} convoy={convoys[selectedConvoy]} convoyIndex={selectedConvoy}
          upgrades={upgrades} onLoadUnit={onLoadUnit} onLoadFromBay={onLoadFromBay}
          onUnloadToHoldingBay={onUnloadToHoldingBay} onSendConvoy={onSendConvoy}
          onLoadCargo={onLoadCargo} onUnloadCargo={onUnloadCargo}
          groundUnits={groundUnits} comp={comp} isCC={false}
          teamGold={teamGold} playerResources={playerResources}
        />
      )}
    </div>
  )
}

const STRUCTURE_NAMES = new Set(['Command Center', 'Command Ship', 'Base', 'Factory', 'Mining Station'])

function HoldingBayPanel({ unit, upgrades, onDeployFromBay, onProduceUnit, comp, unitTypes, teamGold }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showProduceMenu, setShowProduceMenu] = useState(false)
  const holdingBay = upgrades.holdingBay || []
  const isFull = holdingBay.length >= HOLDING_BAY_CAPACITY

  const producibleTypes = (unitTypes || []).filter(ut =>
    (ut.board || 'ground') === 'ground' && !STRUCTURE_NAMES.has(ut.name)
  )

  const allSlots = Array.from({ length: HOLDING_BAY_CAPACITY }, (_, i) => holdingBay[i] || null)
  const row1 = allSlots.slice(0, 6)
  const row2 = allSlots.slice(6, 12)

  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Unit Bay ({holdingBay.length}/{HOLDING_BAY_CAPACITY})
      </div>
      <div className="flex flex-col gap-1 mb-2">
        {[row1, row2].map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-6 gap-1">
            {row.map((storedUnit, colIdx) => {
              const slotIdx = rowIdx * 6 + colIdx
              const isSelected = selectedSlot === slotIdx
              const isEmpty = !storedUnit
              return (
                <button
                  key={slotIdx}
                  onClick={() => {
                    if (!isEmpty) {
                      setSelectedSlot(isSelected ? null : slotIdx)
                      setShowProduceMenu(false)
                    }
                  }}
                  className="rounded p-1 text-center transition-all aspect-square flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: isSelected
                      ? comp.color + '20'
                      : isEmpty ? '#161b22' : comp.color + '15',
                    border: `1px solid ${isSelected
                      ? comp.color
                      : isEmpty ? '#30363d' : comp.color + '50'}`,
                    cursor: isEmpty ? 'default' : 'pointer',
                  }}
                >
                  {isEmpty ? (
                    <span className="text-[10px]" style={{ color: '#30363d' }}>&ndash;</span>
                  ) : (
                    <div className="text-[7px] font-semibold leading-tight" style={{ color: '#c9d1d9' }}>
                      {storedUnit.typeName}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {selectedSlot !== null && allSlots[selectedSlot] && (
        <div className="p-2 rounded mb-2" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
              {allSlots[selectedSlot].typeName}
            </span>
          </div>
          <button
            onClick={() => { onDeployFromBay(unit.id, selectedSlot); setSelectedSlot(null) }}
            className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{
              backgroundColor: comp.color + '20',
              color: comp.color,
              border: `1px solid ${comp.color}40`,
            }}
          >
            Deploy to Ground
          </button>
        </div>
      )}

      <button
        onClick={() => { setShowProduceMenu(!showProduceMenu); setSelectedSlot(null) }}
        disabled={isFull}
        className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
        style={{
          backgroundColor: showProduceMenu ? comp.color + '20' : '#21262d',
          color: showProduceMenu ? comp.color : '#8b949e',
          border: `1px solid ${showProduceMenu ? comp.color : '#30363d'}`,
        }}
      >
        {isFull ? 'Bay Full' : showProduceMenu ? 'Close Menu' : 'Produce Unit'}
      </button>

      {showProduceMenu && !isFull && (
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Produce Unit — <span className="font-mono" style={{ color: '#8b949e' }}>⚒{teamGold}</span>
          </div>
          {producibleTypes.length === 0 ? (
            <div className="text-[9px]" style={{ color: '#4a5568' }}>No unit types available</div>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
              {producibleTypes.map(ut => {
                const canAfford = teamGold >= ut.cost
                return (
                  <button
                    key={ut.id}
                    onClick={() => {
                      if (canAfford) onProduceUnit(unit.id, ut.id, ut.name)
                    }}
                    disabled={!canAfford}
                    className="flex items-center justify-between p-1.5 rounded text-left transition-all"
                    style={{
                      backgroundColor: '#161b22',
                      border: '1px solid #2a3140',
                      opacity: canAfford ? 1 : 0.4,
                      cursor: canAfford ? 'pointer' : 'default',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {ut.icon && (
                        <img src={`/assets/${ut.icon}`} alt={ut.name} className="w-4 h-4 object-contain" />
                      )}
                      <div>
                        <div className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{ut.name}</div>
                        <div className="text-[8px]" style={{ color: '#6e7681' }}>
                          ATK {ut.attack} DEF {ut.defense} HP {ut.hp}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: canAfford ? '#cca43b' : '#e05050' }}>
                      {ut.cost}g
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const VEHICLE_NAMES = new Set(['Armor Transport', 'Armored Cavalry', 'Modern Armor', 'Rocket Artillery', 'Heavy Unit', 'Missile Defense', 'Excavator'])
const TRANSPORT_CAPACITY = 4

function LoadingBayPanel({ unit, upgrades, onLoadSoldier, onLoadBaySoldier, onUnloadSoldier, onUndock, groundUnits, comp }) {
  const [selectedTransport, setSelectedTransport] = useState(null)
  const loadingBay = upgrades.loadingBay || []
  const maxSlots = comp.slots

  const soldierUnits = (groundUnits || []).filter(u =>
    !STRUCTURE_NAMES.has(u.wg_unit_types?.name) && !VEHICLE_NAMES.has(u.wg_unit_types?.name)
  )
  const baySoldiers = (upgrades.holdingBay || []).filter(u =>
    !STRUCTURE_NAMES.has(u.typeName) && !VEHICLE_NAMES.has(u.typeName)
  )
  const baySoldiersWithIdx = (upgrades.holdingBay || []).map((u, i) => ({ ...u, bayIdx: i })).filter(u =>
    !STRUCTURE_NAMES.has(u.typeName) && !VEHICLE_NAMES.has(u.typeName)
  )

  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Docked Transports ({loadingBay.length}/{maxSlots})
      </div>
      <div className="flex flex-col gap-1.5 mb-2">
        {Array.from({ length: maxSlots }, (_, i) => {
          const transport = loadingBay[i]
          const isSelected = selectedTransport === i
          if (!transport) {
            return (
              <div key={i} className="p-2 rounded text-center"
                style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
                <div className="text-[10px]" style={{ color: '#4a5568' }}>Empty Slot</div>
              </div>
            )
          }
          return (
            <button
              key={i}
              onClick={() => setSelectedTransport(isSelected ? null : i)}
              className="p-2 rounded text-left transition-all cursor-pointer"
              style={{
                backgroundColor: isSelected ? comp.color + '20' : '#161b22',
                border: `1px solid ${isSelected ? comp.color : '#30363d'}`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                  {transport.typeName}
                </span>
                <span className="text-[9px] font-mono" style={{ color: '#8b949e' }}>
                  {transport.units?.length || 0}/{TRANSPORT_CAPACITY} soldiers
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: TRANSPORT_CAPACITY }, (_, j) => {
                  const loaded = transport.units?.[j]
                  return (
                    <div key={j} className="flex-1 h-3 rounded"
                      style={{
                        backgroundColor: loaded ? comp.color + '40' : '#21262d',
                        border: `1px solid ${loaded ? comp.color + '80' : '#30363d'}`,
                      }}
                    />
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>

      {selectedTransport !== null && loadingBay[selectedTransport] && (
        <div className="p-2 rounded" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            {loadingBay[selectedTransport].typeName} — Load Soldiers
          </div>

          {(loadingBay[selectedTransport].units || []).length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Loaded:</div>
              <div className="flex flex-col gap-0.5">
                {loadingBay[selectedTransport].units.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1 rounded"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                    <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{u.typeName}</span>
                    <button
                      onClick={() => onUnloadSoldier(unit.id, selectedTransport, idx)}
                      className="text-[8px] px-1.5 py-0.5 rounded cursor-pointer"
                      style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                    >
                      Unload
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(loadingBay[selectedTransport].units || []).length < TRANSPORT_CAPACITY && (() => {
            const hasAny = soldierUnits.length > 0 || baySoldiersWithIdx.length > 0
            return (
              <div className="mb-2">
                <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Available soldiers:</div>
                {!hasAny ? (
                  <div className="text-[9px]" style={{ color: '#4a5568' }}>No soldiers available</div>
                ) : (
                  <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
                    {baySoldiersWithIdx.map(bu => (
                      <button
                        key={`bay-${bu.bayIdx}`}
                        onClick={() => onLoadBaySoldier(unit.id, selectedTransport, bu.bayIdx)}
                        className="flex items-center justify-between p-1 rounded text-left cursor-pointer"
                        style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{bu.typeName}</span>
                          <span className="text-[7px] px-1 rounded" style={{ backgroundColor: '#a08040' + '30', color: '#a08040', border: '1px solid #a08040' + '50' }}>BAY</span>
                        </div>
                        <span className="text-[8px]" style={{ color: comp.color }}>Load</span>
                      </button>
                    ))}
                    {soldierUnits.map(su => (
                      <button
                        key={su.id}
                        onClick={() => onLoadSoldier(unit.id, selectedTransport, su.id)}
                        className="flex items-center justify-between p-1 rounded text-left cursor-pointer"
                        style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
                      >
                        <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{su.wg_unit_types?.name}</span>
                        <span className="text-[8px]" style={{ color: comp.color }}>Load</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          <button
            onClick={() => { onUndock(unit.id, selectedTransport); setSelectedTransport(null) }}
            className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{
              backgroundColor: comp.color + '20',
              color: comp.color,
              border: `1px solid ${comp.color}40`,
            }}
          >
            Deploy Transport
          </button>
        </div>
      )}
    </div>
  )
}

export default function CommandShipPanel({
  unit, onClose, onUpgrade, onMove, isAdmin,
  onBuildConvoy, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onDeployFromBay, onProduceUnit,
  onLoadCargo, onUnloadCargo,
  onLoadSoldier, onLoadBaySoldier, onUnloadSoldier, onUndock,
  groundUnits, unitTypes, teamGold, playerResources,
}) {
  const [selectedComp, setSelectedComp] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const upgrades = unit.upgrades || {}
  const unitName = unit.wg_unit_types?.name || 'Command Ship'
  const compartments = getCompartments(unitName)
  const isCommandShip = unitName === 'Command Ship'

  const comp = selectedComp ? compartments.find(c => c.id === selectedComp) : null
  const slots = comp && !comp.special ? getSlots(upgrades, comp.id, comp.slots) : []

  return (
    <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img
            src={isCommandShip ? '/assets/mothership.png' : unitName === 'Base' ? '/assets/base.png' : '/assets/command center.png'}
            alt={unitName}
            className="w-6 h-6 object-contain"
          />
          <div>
            <div className="text-xs font-semibold" style={{ color: '#c9d1d9' }}>{unitName}</div>
            <div className="text-[10px] font-mono" style={{ color: '#6e7681' }}>HP {unit.current_hp}/{unit.wg_unit_types?.hp}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer"
          style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
        >
          ×
        </button>
      </div>

      {unitName !== 'Base' && (
        <div className="flex gap-1 mb-3">
          {(isAdmin || !unit.has_moved) && (
            <button
              onClick={onMove}
              className="flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
              style={{ backgroundColor: '#1a3a5c', color: '#79c0ff', border: '1px solid #2a5a8c' }}
            >
              Move
            </button>
          )}
        </div>
      )}

      {compartments.length > 0 && <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>
        Compartments
      </div>}
      <div className="grid grid-cols-2 gap-1.5">
        {compartments.map(c => {
          const isSelected = selectedComp === c.id
          let statusText = ''
          let statusSlots = []

          if (c.special === 'transport') {
            const convoys = upgrades.convoys || []
            statusText = `${convoys.length}/${c.slots} convoys`
            statusSlots = Array.from({ length: c.slots }, (_, i) => convoys[i] ? 1 : 0)
          } else if (c.special === 'holding_bay') {
            const bay = upgrades.holdingBay || []
            statusText = `${bay.length}/${HOLDING_BAY_CAPACITY} units`
            const filledRatio = Math.ceil((bay.length / HOLDING_BAY_CAPACITY) * 4)
            statusSlots = Array.from({ length: 4 }, (_, i) => i < filledRatio ? 1 : 0)
          } else if (c.special === 'loading_bay') {
            const lb = upgrades.loadingBay || []
            statusText = `${lb.length}/${c.slots} docked`
            statusSlots = Array.from({ length: c.slots }, (_, i) => lb[i] ? 1 : 0)
          } else {
            const cSlots = getSlots(upgrades, c.id, c.slots)
            const filledCount = cSlots.filter(s => s > 0).length
            statusText = `${filledCount}/${c.slots} slots`
            statusSlots = cSlots
          }

          return (
            <button
              key={c.id}
              onClick={() => { setSelectedComp(isSelected ? null : c.id); setSelectedSlot(null) }}
              className="relative p-2 rounded text-left transition-all cursor-pointer"
              style={{
                backgroundColor: isSelected ? c.color + '20' : '#0d1117',
                border: `1px solid ${isSelected ? c.color + '60' : '#2a3140'}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {ICONS[c.icon] || <span className="text-sm">{c.icon}</span>}
                <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{c.name}</span>
              </div>
              <div className="flex gap-1">
                {statusSlots.map((filled, i) => (
                  <div
                    key={i}
                    className="flex-1 h-4 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: filled > 0 ? c.color + '30' : '#21262d',
                      border: `1px solid ${filled > 0 ? c.color + '80' : '#30363d'}`,
                    }}
                  >
                    {filled > 0 && !c.special && (
                      <span className="text-[8px] font-bold" style={{ color: TIERS[filled - 1]?.color || c.color }}>
                        T{filled}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: '#6e7681' }}>
                {statusText}
              </div>
            </button>
          )
        })}
      </div>

      {comp && (
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
          <div className="flex items-center gap-1.5 mb-1">
            {ICONS[comp.icon] || <span className="text-sm">{comp.icon}</span>}
            <span className="text-xs font-semibold" style={{ color: comp.color }}>{comp.name}</span>
          </div>
          <div className="text-[10px] mb-2" style={{ color: '#8b949e' }}>{comp.description}</div>

          {comp.special === 'transport' ? (
            <TransportPanel
              unit={unit}
              upgrades={upgrades}
              onBuildConvoy={onBuildConvoy}
              onLoadUnit={onLoadUnit}
              onLoadFromBay={onLoadFromBay}
              onUnloadToHoldingBay={onUnloadToHoldingBay}
              onSendConvoy={onSendConvoy}
              onLoadCargo={onLoadCargo}
              onUnloadCargo={onUnloadCargo}
              groundUnits={groundUnits || []}
              comp={comp}
              isAdmin={isAdmin}
              teamGold={teamGold}
              playerResources={playerResources}
            />
          ) : comp.special === 'holding_bay' ? (
            <HoldingBayPanel
              unit={unit}
              upgrades={upgrades}
              onDeployFromBay={onDeployFromBay}
              onProduceUnit={onProduceUnit}
              comp={comp}
              unitTypes={unitTypes}
              teamGold={teamGold}
            />
          ) : comp.special === 'loading_bay' ? (
            <LoadingBayPanel
              unit={unit}
              upgrades={upgrades}
              onLoadSoldier={onLoadSoldier}
              onLoadBaySoldier={onLoadBaySoldier}
              onUnloadSoldier={onUnloadSoldier}
              onUndock={onUndock}
              groundUnits={groundUnits || []}
              comp={comp}
            />
          ) : (
            <>
              <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
                Slots
              </div>
              <div className="flex gap-1.5 mb-2">
                {slots.map((tier, i) => {
                  const isSlotSelected = selectedSlot === i
                  const isEmpty = tier === 0
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(isSlotSelected ? null : i)}
                      className="flex-1 rounded p-1.5 text-center transition-all cursor-pointer"
                      style={{
                        backgroundColor: isSlotSelected
                          ? comp.color + '20'
                          : isEmpty ? '#161b22' : TIERS[tier - 1].color + '15',
                        border: `1px solid ${isSlotSelected
                          ? comp.color
                          : isEmpty ? '#30363d' : TIERS[tier - 1].color + '60'}`,
                        minHeight: '44px',
                      }}
                    >
                      {isEmpty ? (
                        <div>
                          <div className="text-[10px]" style={{ color: '#4a5568' }}>+</div>
                          <div className="text-[8px]" style={{ color: '#4a5568' }}>Empty</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-[9px] font-bold" style={{ color: TIERS[tier - 1].color }}>
                            T{tier}
                          </div>
                          <div className="text-[8px]" style={{ color: '#8b949e' }}>
                            {comp.tiers[tier - 1].name}
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {selectedSlot !== null && (
                <div>
                  <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
                    {slots[selectedSlot] > 0 ? 'Upgrade Slot' : 'Select Tier'}
                  </div>
                  <div className="flex flex-col gap-1">
                    {comp.tiers.map((tier, tierIdx) => {
                      const tierLevel = tierIdx + 1
                      const currentTier = slots[selectedSlot]
                      const isCurrentTier = currentTier === tierLevel
                      const tierInfo = TIERS[tierIdx]
                      const isFree = tierLevel === 1 && currentTier === 0

                      return (
                        <button
                          key={tierIdx}
                          onClick={() => {
                            if (!isCurrentTier && tierLevel > currentTier) {
                              onUpgrade(unit.id, comp.id, selectedSlot, tierLevel)
                            }
                          }}
                          disabled={isCurrentTier}
                          className="flex items-center gap-2 p-1.5 rounded text-left transition-all"
                          style={{
                            backgroundColor: isCurrentTier ? tierInfo.color + '20' : '#161b22',
                            border: `1px solid ${isCurrentTier ? tierInfo.color + '60' : '#2a3140'}`,
                            opacity: isCurrentTier ? 0.6 : 1,
                            cursor: isCurrentTier ? 'default' : 'pointer',
                          }}
                        >
                          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: tierInfo.color + '20', border: `1px solid ${tierInfo.color}60` }}>
                            <span className="text-[9px] font-bold" style={{ color: tierInfo.color }}>T{tierLevel}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{tier.name}</div>
                            <div className="text-[9px]" style={{ color: '#6e7681' }}>{tier.desc}</div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isCurrentTier ? (
                              <span className="text-[9px] font-mono" style={{ color: tierInfo.color }}>ACTIVE</span>
                            ) : isFree ? (
                              <span className="text-[9px] font-mono" style={{ color: '#3fb950' }}>FREE</span>
                            ) : (
                              <div className="flex items-center gap-0.5">
                                <img src="/assets/iron.png" alt="Iron" className="w-3 h-3 object-contain" />
                                <span className="text-[9px] font-mono" style={{ color: '#cca43b' }}>{tierInfo.cost}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
