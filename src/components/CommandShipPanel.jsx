import { useState } from 'react'

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
    icon: '⚛',
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
    icon: '⛨',
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
    icon: '⚒',
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
    icon: '☄',
    color: '#e05050',
    slots: 3,
    tiers: [
      { name: 'Railgun Turret', desc: 'Basic kinetic weapon' },
      { name: 'Plasma Cannon', desc: 'Energy weapon' },
      { name: 'Antimatter Cannon', desc: 'Maximum firepower' },
    ],
  },
]

const COMMAND_CENTER_COMPARTMENTS = [
  {
    id: 'shields',
    name: 'Shields',
    description: 'Defensive barrier around the base.',
    icon: '⛨',
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
    icon: '☄',
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
    icon: '⊛',
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
    icon: '⚛',
    color: '#e6a020',
    slots: 1,
    tiers: [
      { name: 'Generator', desc: 'Basic power' },
      { name: 'Fusion Reactor', desc: 'Enhanced power' },
      { name: 'Quantum Plant', desc: 'Maximum power' },
    ],
  },
]

export function getCompartments(unitName) {
  if (unitName === 'Command Ship') return COMMAND_SHIP_COMPARTMENTS
  if (unitName === 'Command Center') return COMMAND_CENTER_COMPARTMENTS
  return []
}

function getSlots(upgrades, compartmentId, slotCount) {
  const data = upgrades[compartmentId]
  if (Array.isArray(data)) {
    const slots = data.slice(0, slotCount)
    while (slots.length < slotCount) slots.push(0)
    return slots
  }
  // Migrate from old format: single number = tier 1 in first N slots
  const oldLevel = typeof data === 'number' ? data : 0
  const slots = []
  for (let i = 0; i < slotCount; i++) {
    slots.push(i < Math.min(oldLevel, slotCount) ? 1 : 0)
  }
  return slots
}

export default function CommandShipPanel({ unit, onClose, onUpgrade, onMove, isAdmin }) {
  const [selectedComp, setSelectedComp] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const upgrades = unit.upgrades || {}
  const unitName = unit.wg_unit_types?.name || 'Command Ship'
  const compartments = getCompartments(unitName)
  const isCommandShip = unitName === 'Command Ship'

  const comp = selectedComp ? compartments.find(c => c.id === selectedComp) : null
  const slots = comp ? getSlots(upgrades, comp.id, comp.slots) : []

  return (
    <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img
            src={isCommandShip ? '/assets/mothership.png' : '/assets/command center.png'}
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

      <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>
        Compartments
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {compartments.map(c => {
          const cSlots = getSlots(upgrades, c.id, c.slots)
          const filledCount = cSlots.filter(s => s > 0).length
          const isSelected = selectedComp === c.id
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
                <span className="text-sm">{c.icon}</span>
                <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{c.name}</span>
              </div>
              <div className="flex gap-1">
                {cSlots.map((tier, i) => (
                  <div
                    key={i}
                    className="flex-1 h-4 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: tier > 0 ? TIERS[tier - 1].color + '30' : '#21262d',
                      border: `1px solid ${tier > 0 ? TIERS[tier - 1].color + '80' : '#30363d'}`,
                    }}
                  >
                    {tier > 0 && (
                      <span className="text-[8px] font-bold" style={{ color: TIERS[tier - 1].color }}>
                        T{tier}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: '#6e7681' }}>
                {filledCount}/{c.slots} slots
              </div>
            </button>
          )
        })}
      </div>

      {comp && (
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{comp.icon}</span>
            <span className="text-xs font-semibold" style={{ color: comp.color }}>{comp.name}</span>
          </div>
          <div className="text-[10px] mb-2" style={{ color: '#8b949e' }}>{comp.description}</div>

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
                  const isLocked = tierLevel <= currentTier && currentTier > 0
                  const tierInfo = TIERS[tierIdx]
                  const isFirstTier = tierLevel === 1
                  const isFree = isFirstTier && currentTier === 0

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
        </div>
      )}
    </div>
  )
}
