import { useState } from 'react'
import { GROUND_ORES, SPACE_ORES, SHIELD_HP, getEffectiveAttackRange } from '../hooks/useGameState'

const ICON_STYLE = { width: 14, height: 14, fill: 'none', stroke: '#8b949e', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  reactor: (
    <svg viewBox="0 0 100 100" style={ICON_STYLE}>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#8b949e" strokeWidth="8" />
      <circle cx="50" cy="50" r="8" fill="#8b949e" stroke="none" />
      <path d="M50 38 L36.4 14.5 A35 35 0 0 1 63.6 14.5 Z" fill="#8b949e" stroke="none" />
      <path d="M60.4 55 L74 79 A35 35 0 0 1 42 86 Z" fill="#8b949e" stroke="none" />
      <path d="M39.6 55 L26 79 A35 35 0 0 0 58 86 Z" fill="#8b949e" stroke="none" />
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
      <circle cx="8" cy="8" r="5" />
      <line x1="8" y1="1" x2="8" y2="15" />
      <line x1="1" y1="8" x2="15" y2="8" />
      <circle cx="8" cy="8" r="2" />
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
  hangar: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M2 14 L2 6 L8 2 L14 6 L14 14" />
      <line x1="2" y1="14" x2="14" y2="14" />
      <rect x="5" y="10" width="6" height="4" />
      <path d="M6 7 L10 7" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <circle cx="8" cy="11" r="1.5" />
      <line x1="5" y1="5" x2="11" y2="5" />
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
      { name: 'Deflector Array', desc: '5 shield HP' },
      { name: 'Adaptive Matrix', desc: '10 shield HP' },
      { name: 'Phase Shields', desc: '20 shield HP' },
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
    description: 'Upgrade to unlock new missile types. Lv1: Tactical, Lv2: Cruise, Lv3: IPBM.',
    icon: 'missiles',
    color: '#c060e0',
    slots: 1,
    tiers: [
      { name: 'Tactical Missile System', desc: 'Unlocks short-range guided missiles' },
      { name: 'Cruise Missile System', desc: 'Unlocks long-range precision strike' },
      { name: 'IPBM System', desc: 'Unlocks interplanetary ballistic missiles' },
    ],
  },
  {
    id: 'transport',
    name: 'Convoy Bay',
    description: 'Build convoy ships to transport ground units. 3 turns to reach ground.',
    icon: 'transport',
    color: '#50b0b0',
    special: 'transport',
    slots: 2,
  },
  {
    id: 'holding_bay',
    name: 'Barracks',
    description: 'Produce and store up to 12 units. Deploy them to the ground board.',
    icon: 'holding_bay',
    color: '#a08040',
    special: 'holding_bay',
    slots: 12,
  },
  {
    id: 'hangar',
    name: 'Hangar',
    description: 'Store and deploy aircraft and space ships. Capacity: 8.',
    icon: 'hangar',
    color: '#7060c0',
    special: 'hangar',
    slots: 8,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Ores and minerals collected by mining stations.',
    icon: 'inventory',
    color: '#70a0d0',
    special: 'inventory',
    slots: 0,
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
      { name: 'Perimeter Barrier', desc: '5 shield HP' },
      { name: 'Defense Grid', desc: '10 shield HP' },
      { name: 'Quantum Barrier', desc: '20 shield HP' },
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
    name: 'Defense Systems',
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
    name: 'Convoy Bay',
    description: 'Receive and send convoys between Command Ship and Command Center.',
    icon: 'transport',
    color: '#50b0b0',
    special: 'transport',
    slots: 2,
  },
  {
    id: 'holding_bay',
    name: 'Barracks',
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
  {
    id: 'hangar',
    name: 'Hangar',
    description: 'Store and deploy aircraft and space ships. Capacity: 8.',
    icon: 'hangar',
    color: '#7060c0',
    special: 'hangar',
    slots: 8,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Ores and minerals collected by excavators.',
    icon: 'inventory',
    color: '#70a0d0',
    special: 'inventory',
    slots: 0,
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

const BATTLESHIP_COMPARTMENTS = [
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
      { name: 'Deflector Array', desc: '5 shield HP' },
      { name: 'Adaptive Matrix', desc: '10 shield HP' },
      { name: 'Phase Shields', desc: '20 shield HP' },
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
    description: 'Upgrade to unlock new missile types. Lv1: Tactical, Lv2: Cruise, Lv3: IPBM.',
    icon: 'missiles',
    color: '#c060e0',
    slots: 1,
    tiers: [
      { name: 'Tactical Missile System', desc: 'Unlocks short-range guided missiles' },
      { name: 'Cruise Missile System', desc: 'Unlocks long-range precision strike' },
      { name: 'IPBM System', desc: 'Unlocks interplanetary ballistic missiles' },
    ],
  },
  {
    id: 'transport',
    name: 'Convoy Bay',
    description: 'Build convoy ships to transport ground units. 3 turns to reach ground.',
    icon: 'transport',
    color: '#50b0b0',
    special: 'transport',
    slots: 1,
  },
  {
    id: 'holding_bay',
    name: 'Barracks',
    description: 'Produce and store up to 6 units. Deploy them to the ground board.',
    icon: 'holding_bay',
    color: '#a08040',
    special: 'holding_bay',
    slots: 6,
  },
  {
    id: 'hangar',
    name: 'Hangar',
    description: 'Store and deploy aircraft and space ships. Capacity: 4.',
    icon: 'hangar',
    color: '#7060c0',
    special: 'hangar',
    slots: 4,
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Ores and minerals collected by mining stations.',
    icon: 'inventory',
    color: '#70a0d0',
    special: 'inventory',
    slots: 0,
  },
]

const FIGHTER_COMPARTMENTS = [
  {
    id: 'cannon',
    name: 'Cannon',
    description: 'Weapon systems. Each slot mounts a weapon.',
    icon: 'cannon',
    color: '#e05050',
    slots: 2,
    tiers: [
      { name: 'Railgun Turret', desc: 'Basic kinetic weapon' },
      { name: 'Plasma Cannon', desc: 'Energy weapon' },
      { name: 'Antimatter Cannon', desc: 'Maximum firepower' },
    ],
  },
]

const CONVOY_COST = 15
const CONVOY_CAPACITY = 4
const CONVOY_TRANSIT_TURNS = 3
const HOLDING_BAY_CAPACITY = 12

export function getCompartments(unitName) {
  if (unitName === 'Command Ship') return COMMAND_SHIP_COMPARTMENTS
  if (unitName === 'Battleship') return BATTLESHIP_COMPARTMENTS
  if (unitName === 'Command Center') return COMMAND_CENTER_COMPARTMENTS
  if (unitName === 'Base') return BASE_COMPARTMENTS
  if (unitName === 'Fighter') return FIGHTER_COMPARTMENTS
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

function ConvoyDetail({ unit, convoy, convoyIndex, upgrades, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onLoadCargo, onUnloadCargo, groundUnits, comp, isCC, teamGold, playerResources, destinations }) {
  const [goldAmount, setGoldAmount] = useState('')
  const [selectedDest, setSelectedDest] = useState(destinations?.length === 1 ? destinations[0].id : null)
  const cargo = convoy.cargo || { gold: 0, resources: {} }
  const hasAnyCargo = (cargo.gold || 0) > 0 || Object.values(cargo.resources || {}).some(v => v > 0)
  const hasAnyLoad = (convoy.units || []).length > 0 || hasAnyCargo

  const availableResources = Object.entries(playerResources || {}).filter(
    ([key, amount]) => amount > 0 && key !== 'excavations'
  )

  return (
    <div className="p-2 rounded" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Convoy {convoyIndex + 1} — Inventory
      </div>

      <div className="mb-2">
        <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Units ({(convoy.units || []).length}/{CONVOY_CAPACITY}):</div>
        {(convoy.units || []).length > 0 ? (
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
        ) : (
          <div className="flex gap-1">
            {Array.from({ length: CONVOY_CAPACITY }, (_, i) => (
              <div key={i} className="flex-1 rounded" style={{ height: 24, backgroundColor: '#161b22', border: '1px solid #2a3140' }} />
            ))}
          </div>
        )}
      </div>

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

      {(() => {
        const munitions = convoy.munitions || { tactical: 0, cruise: 0, ipbm: 0 }
        const MISSILE_TYPES = [
          { key: 'tactical', name: 'Tactical', color: '#8b949e' },
          { key: 'cruise', name: 'Cruise', color: '#3fb950' },
          { key: 'ipbm', name: 'IPBM', color: '#d29922' },
        ]
        const totalMun = MISSILE_TYPES.reduce((s, m) => s + (munitions[m.key] || 0), 0)
        return (
          <div className="mb-2">
            <div className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#4a5568' }}>
              Munitions ({totalMun})
            </div>
            {totalMun > 0 ? (
              <div className="flex flex-col gap-1">
                {MISSILE_TYPES.filter(m => (munitions[m.key] || 0) > 0).map(m => (
                  <div key={m.key} className="flex items-center justify-between p-1 rounded"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                    <span className="text-[9px] font-semibold" style={{ color: m.color }}>{m.name}</span>
                    <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>{munitions[m.key]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-1 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <span className="text-[9px]" style={{ color: '#4a5568' }}>None</span>
              </div>
            )}
          </div>
        )
      })()}

      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5 mt-2" style={{ color: '#4a5568' }}>
        Cargo
      </div>

      {((cargo.gold || 0) > 0 || Object.values(cargo.resources || {}).some(v => v > 0)) ? (
        <div className="mb-2">
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
      ) : (
        <div className="p-1 rounded mb-2" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
          <span className="text-[9px]" style={{ color: '#4a5568' }}>None</span>
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

      {destinations && destinations.length > 0 && (
        <div className="mt-2 mb-1">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#4a5568' }}>
            Destination
          </div>
          <select
            value={selectedDest || ''}
            onChange={e => setSelectedDest(e.target.value || null)}
            className="w-full px-1.5 py-1 text-[10px] rounded"
            style={{ backgroundColor: '#161b22', border: '1px solid #30363d', color: '#c9d1d9', outline: 'none' }}
          >
            <option value="">Select destination...</option>
            {destinations.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={() => onSendConvoy(unit.id, convoyIndex, selectedDest)}
        disabled={!selectedDest}
        className="w-full mt-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
        style={{
          backgroundColor: selectedDest ? '#d29922' + '20' : '#21262d',
          color: selectedDest ? '#d29922' : '#8b949e',
          border: `1px solid ${selectedDest ? '#d29922' + '40' : '#30363d'}`,
        }}
      >
        {selectedDest ? `Send (${CONVOY_TRANSIT_TURNS} turns)` : 'Select Destination'}
      </button>
    </div>
  )
}

function TransportPanel({ unit, upgrades, onBuildConvoy, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onLoadCargo, onUnloadCargo, groundUnits, comp, isAdmin, teamGold, playerResources, destinations }) {
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
            destinations={destinations}
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
          destinations={destinations}
        />
      )}
    </div>
  )
}

const STRUCTURE_NAMES = new Set(['Command Center', 'Command Ship', 'Base', 'Factory', 'Mining Station', 'Battleship'])

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
        Barracks ({holdingBay.length}/{HOLDING_BAY_CAPACITY})
      </div>

      <button
        onClick={() => { setShowProduceMenu(!showProduceMenu); setSelectedSlot(null) }}
        disabled={isFull}
        className="w-full py-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
        style={{
          backgroundColor: showProduceMenu ? comp.color + '20' : '#21262d',
          color: showProduceMenu ? comp.color : '#8b949e',
          border: `1px solid ${showProduceMenu ? comp.color : '#30363d'}`,
        }}
      >
        {isFull ? 'Bay Full' : showProduceMenu ? 'Close Menu' : 'Produce Unit'}
      </button>

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

const HANGAR_UNIT_NAMES = new Set(['Bomber', 'Mother Ship', 'Orbital Strike', 'Mining Station', 'Fighter'])

function HangarPanel({ unit, upgrades, onDeployFromHangar, onProduceToHangar, onTransferHangar, onTransferAllHangar, onDeployAllFromHangar, isDeployAllActive, onCancelDeployAll, onAddToHangar, nearbyUnits, comp, unitTypes, teamGold, allUnits }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showProduceMenu, setShowProduceMenu] = useState(false)
  const [showTransferMenu, setShowTransferMenu] = useState(false)
  const [showTransferAllMenu, setShowTransferAllMenu] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const hangar = upgrades.hangar || []
  const capacity = comp.slots
  const isFull = hangar.length >= capacity

  const producibleTypes = (unitTypes || []).filter(ut => HANGAR_UNIT_NAMES.has(ut.name))
  const allSlots = Array.from({ length: capacity }, (_, i) => hangar[i] || null)
  const cols = Math.min(capacity, 4)

  const HANGAR_SHIPS = new Set(['Command Ship', 'Command Center', 'Battleship'])
  const transferTargets = (allUnits || []).filter(u =>
    u.id !== unit.id &&
    u.owner_id === unit.owner_id &&
    u.is_alive !== false &&
    HANGAR_SHIPS.has(u.wg_unit_types?.name) &&
    getCompartments(u.wg_unit_types?.name).some(c => c.special === 'hangar')
  )

  const eligibleForHangar = (nearbyUnits || []).filter(u =>
    u.id !== unit.id &&
    u.owner_id === unit.owner_id &&
    u.is_alive !== false &&
    HANGAR_UNIT_NAMES.has(u.wg_unit_types?.name) &&
    (u.upgrades?.hangarCooldown || 0) <= 0
  )

  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Hangar ({hangar.length}/{capacity})
      </div>

      <div className="flex gap-1 mb-2">
        <button
          onClick={() => { setShowProduceMenu(!showProduceMenu); setShowTransferMenu(false); setShowTransferAllMenu(false); setShowAddMenu(false); setSelectedSlot(null) }}
          disabled={isFull}
          className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
          style={{
            backgroundColor: showProduceMenu ? comp.color + '20' : '#21262d',
            color: showProduceMenu ? comp.color : '#8b949e',
            border: `1px solid ${showProduceMenu ? comp.color : '#30363d'}`,
          }}
        >
          {isFull ? 'Full' : showProduceMenu ? 'Close' : 'Produce'}
        </button>
        {hangar.length > 0 && transferTargets.length > 0 && (
          <button
            onClick={() => { setShowTransferAllMenu(!showTransferAllMenu); setShowProduceMenu(false); setShowTransferMenu(false); setShowAddMenu(false); setSelectedSlot(null) }}
            className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{
              backgroundColor: showTransferAllMenu ? '#1a3050' : '#21262d',
              color: showTransferAllMenu ? '#6cb4e6' : '#8b949e',
              border: `1px solid ${showTransferAllMenu ? '#6cb4e6' : '#30363d'}`,
            }}
          >
            {showTransferAllMenu ? 'Close' : 'Transfer All'}
          </button>
        )}
        {hangar.length > 0 && (
          <button
            onClick={() => {
              if (isDeployAllActive) { onCancelDeployAll() }
              else { onDeployAllFromHangar(unit.id); setShowProduceMenu(false); setShowTransferMenu(false); setShowTransferAllMenu(false); setShowAddMenu(false); setSelectedSlot(null) }
            }}
            className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{
              backgroundColor: isDeployAllActive ? '#3a1a1a' : '#21262d',
              color: isDeployAllActive ? '#e05050' : '#8b949e',
              border: `1px solid ${isDeployAllActive ? '#e05050' : '#30363d'}`,
            }}
          >
            {isDeployAllActive ? 'Cancel' : 'Deploy All'}
          </button>
        )}
        {!isFull && eligibleForHangar.length > 0 && (
          <button
            onClick={() => { setShowAddMenu(!showAddMenu); setShowProduceMenu(false); setShowTransferMenu(false); setShowTransferAllMenu(false); setSelectedSlot(null) }}
            className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{
              backgroundColor: showAddMenu ? '#1a3a1a' : '#21262d',
              color: showAddMenu ? '#50c878' : '#8b949e',
              border: `1px solid ${showAddMenu ? '#50c878' : '#30363d'}`,
            }}
          >
            {showAddMenu ? 'Close' : 'Add to Hangar'}
          </button>
        )}
      </div>

      {showAddMenu && !isFull && (
        <div className="mb-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: '1px solid #1a3a1a' }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Nearby Units (4 tiles)
          </div>
          <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
            {eligibleForHangar.map(u => (
              <button
                key={u.id}
                onClick={() => { onAddToHangar(unit.id, u.id); setShowAddMenu(false) }}
                className="flex items-center justify-between p-1.5 rounded text-left transition-all cursor-pointer"
                style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
              >
                <div className="flex items-center gap-1.5">
                  {u.wg_unit_types?.icon && <img src={`/assets/${u.wg_unit_types.icon}`} alt={u.wg_unit_types.name} className="w-4 h-4 object-contain" />}
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{u.wg_unit_types?.name}</span>
                </div>
                <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>HP {u.current_hp}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showTransferAllMenu && (
        <div className="mb-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: '1px solid #1a3050' }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Transfer All To
          </div>
          <div className="flex flex-col gap-0.5">
            {transferTargets.map(target => {
              const targetUpgrades = target.upgrades || {}
              const targetHangar = targetUpgrades.hangar || []
              const targetComp = getCompartments(target.wg_unit_types?.name).find(c => c.special === 'hangar')
              const targetCap = targetComp?.slots || 0
              const targetFull = targetHangar.length >= targetCap
              return (
                <button
                  key={target.id}
                  onClick={() => { if (!targetFull) { onTransferAllHangar(unit.id, target.id); setShowTransferAllMenu(false) } }}
                  disabled={targetFull}
                  className="flex items-center justify-between p-1.5 rounded text-left transition-all"
                  style={{
                    backgroundColor: '#161b22',
                    border: '1px solid #2a3140',
                    opacity: targetFull ? 0.4 : 1,
                    cursor: targetFull ? 'default' : 'pointer',
                  }}
                >
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{target.wg_unit_types?.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: targetFull ? '#e05050' : '#6e7681' }}>
                    {targetHangar.length}/{targetCap}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className={`grid gap-1 mb-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {allSlots.map((stored, i) => {
          const isSelected = selectedSlot === i
          const isEmpty = !stored
          return (
            <button
              key={i}
              onClick={() => {
                if (!isEmpty) { setSelectedSlot(isSelected ? null : i); setShowProduceMenu(false); setShowTransferMenu(false) }
              }}
              className="rounded p-1 text-center transition-all aspect-square flex flex-col items-center justify-center"
              style={{
                backgroundColor: isSelected ? comp.color + '20' : isEmpty ? '#161b22' : comp.color + '15',
                border: `1px solid ${isSelected ? comp.color : isEmpty ? '#30363d' : comp.color + '50'}`,
                cursor: isEmpty ? 'default' : 'pointer',
              }}
            >
              {isEmpty ? (
                <span className="text-[10px]" style={{ color: '#30363d' }}>&ndash;</span>
              ) : (
                <div className="text-[7px] font-semibold leading-tight" style={{ color: '#c9d1d9' }}>
                  {stored.typeName}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedSlot !== null && allSlots[selectedSlot] && (
        <div className="p-2 rounded mb-2" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
              {allSlots[selectedSlot].typeName}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => { onDeployFromHangar(unit.id, selectedSlot); setSelectedSlot(null) }}
              className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
              style={{
                backgroundColor: comp.color + '20',
                color: comp.color,
                border: `1px solid ${comp.color}40`,
              }}
            >
              Deploy
            </button>
            {transferTargets.length > 0 && (
              <button
                onClick={() => { setShowTransferMenu(!showTransferMenu); setShowProduceMenu(false) }}
                className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                style={{
                  backgroundColor: showTransferMenu ? '#1a3050' : '#21262d',
                  color: showTransferMenu ? '#6cb4e6' : '#8b949e',
                  border: `1px solid ${showTransferMenu ? '#6cb4e6' : '#30363d'}`,
                }}
              >
                Transfer
              </button>
            )}
          </div>
          {showTransferMenu && (
            <div className="mt-2 flex flex-col gap-0.5">
              {transferTargets.map(target => {
                const targetUpgrades = target.upgrades || {}
                const targetHangar = targetUpgrades.hangar || []
                const targetComp = getCompartments(target.wg_unit_types?.name).find(c => c.special === 'hangar')
                const targetCap = targetComp?.slots || 0
                const targetFull = targetHangar.length >= targetCap
                return (
                  <button
                    key={target.id}
                    onClick={() => { if (!targetFull) { onTransferHangar(unit.id, selectedSlot, target.id); setSelectedSlot(null); setShowTransferMenu(false) } }}
                    disabled={targetFull}
                    className="flex items-center justify-between p-1.5 rounded text-left transition-all"
                    style={{
                      backgroundColor: '#161b22',
                      border: '1px solid #2a3140',
                      opacity: targetFull ? 0.4 : 1,
                      cursor: targetFull ? 'default' : 'pointer',
                    }}
                  >
                    <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{target.wg_unit_types?.name}</span>
                    <span className="text-[9px] font-mono" style={{ color: targetFull ? '#e05050' : '#6e7681' }}>
                      {targetHangar.length}/{targetCap}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showProduceMenu && !isFull && (
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: `1px solid ${comp.color}40` }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Produce Ship — <span className="font-mono" style={{ color: '#8b949e' }}>⚒{teamGold}</span>
          </div>
          {producibleTypes.length === 0 ? (
            <div className="text-[9px]" style={{ color: '#4a5568' }}>No ship types available</div>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
              {producibleTypes.map(ut => {
                const canAfford = teamGold >= ut.cost
                return (
                  <button
                    key={ut.id}
                    onClick={() => { if (canAfford) onProduceToHangar(unit.id, ut.id, ut.name) }}
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
                      {ut.icon && <img src={`/assets/${ut.icon}`} alt={ut.name} className="w-4 h-4 object-contain" />}
                      <div>
                        <div className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{ut.name}</div>
                        <div className="text-[8px]" style={{ color: '#6e7681' }}>ATK {ut.attack} DEF {ut.defense} HP {ut.hp}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: canAfford ? '#cca43b' : '#e05050' }}>{ut.cost}g</span>
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

function LoadingBayPanel({ unit, upgrades, onLoadSoldier, onLoadBaySoldier, onUnloadSoldier, onUndock, onProduceUnit, onBuyAndLoadSoldier, groundUnits, comp, unitTypes, teamGold }) {
  const [selectedTransport, setSelectedTransport] = useState(null)
  const [showBuyMenu, setShowBuyMenu] = useState(false)
  const loadingBay = upgrades.loadingBay || []
  const maxSlots = comp.slots

  const armorTransport = (unitTypes || []).find(ut => ut.name === 'Armor Transport')

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
            const canAfford = armorTransport && teamGold >= armorTransport.cost
            return (
              <button
                key={i}
                onClick={() => canAfford && armorTransport && onProduceUnit(unit.id, armorTransport.id, armorTransport.name)}
                className="p-2 rounded text-center transition-all"
                style={{
                  backgroundColor: canAfford ? comp.color + '10' : '#161b22',
                  border: `1px solid ${canAfford ? comp.color + '40' : '#30363d'}`,
                  cursor: canAfford ? 'pointer' : 'default',
                  opacity: canAfford ? 1 : 0.5,
                }}
              >
                <div className="text-[10px] font-semibold" style={{ color: canAfford ? comp.color : '#4a5568' }}>
                  + Armor Transport
                </div>
                {armorTransport && (
                  <div className="text-[9px] font-mono" style={{ color: canAfford ? '#cca43b' : '#4a5568' }}>
                    {armorTransport.cost}g
                  </div>
                )}
              </button>
            )
          }
          return (
            <button
              key={i}
              onClick={() => setSelectedTransport(isSelected ? null : i)}
              className="p-2 rounded text-left transition-all cursor-pointer"
              style={{
                backgroundColor: isSelected ? comp.color + '30' : comp.color + '15',
                border: `1px solid ${isSelected ? comp.color : comp.color + '60'}`,
                boxShadow: `0 0 4px ${comp.color}30`,
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
                        backgroundColor: loaded ? comp.color + '60' : '#21262d',
                        border: `1px solid ${loaded ? comp.color : '#30363d'}`,
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

          {(loadingBay[selectedTransport].units || []).length < TRANSPORT_CAPACITY && (() => {
            const soldierTypes = (unitTypes || []).filter(ut =>
              (ut.board || 'ground') === 'ground' && !STRUCTURE_NAMES.has(ut.name) && !VEHICLE_NAMES.has(ut.name)
            )
            if (soldierTypes.length === 0) return null
            return (
              <>
                <button
                  onClick={() => setShowBuyMenu(!showBuyMenu)}
                  className="w-full py-1.5 mb-1 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                  style={{
                    backgroundColor: showBuyMenu ? '#cca43b20' : '#21262d',
                    color: showBuyMenu ? '#cca43b' : '#8b949e',
                    border: `1px solid ${showBuyMenu ? '#cca43b40' : '#30363d'}`,
                  }}
                >
                  {showBuyMenu ? 'Close Shop' : 'Purchase Units'}
                </button>
                {showBuyMenu && (
                  <div className="mb-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: '1px solid #cca43b30' }}>
                    <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
                      Buy & Load — <span className="font-mono" style={{ color: '#8b949e' }}>⚒{teamGold}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                      {soldierTypes.map(ut => {
                        const canAfford = teamGold >= ut.cost
                        return (
                          <button
                            key={ut.id}
                            onClick={() => canAfford && onBuyAndLoadSoldier(unit.id, selectedTransport, ut.id, ut.name)}
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
                  </div>
                )}
              </>
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

function InventoryPanel({ unit, upgrades, isCommandShip }) {
  const inventory = upgrades.inventory || {}
  const oreTable = isCommandShip ? SPACE_ORES : GROUND_ORES
  const allOres = Object.values(oreTable)
  const hasAny = allOres.some(o => (inventory[o.id] || 0) > 0)

  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        {isCommandShip ? 'Space Ores' : 'Ground Ores'}
      </div>
      {hasAny ? (
        <div className="flex flex-col gap-1">
          {allOres.map(ore => {
            const amount = inventory[ore.id] || 0
            if (amount === 0) return null
            return (
              <div key={ore.id} className="flex items-center justify-between p-1.5 rounded"
                style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ore.color }} />
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{ore.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: ore.color }}>{amount}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-2 rounded text-center" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
          <span className="text-[9px]" style={{ color: '#4a5568' }}>No ores collected</span>
        </div>
      )}
    </div>
  )
}

export default function CommandShipPanel({
  unit, onClose, onUpgrade, onMove, onAttack, isAdmin,
  onBuildConvoy, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onDeployFromBay, onProduceUnit,
  onLoadCargo, onUnloadCargo,
  onLoadSoldier, onLoadBaySoldier, onUnloadSoldier, onUndock, onBuyAndLoadSoldier,
  onBuyMissile, onFireMissile,
  onDeployFromHangar, onProduceToHangar, onTransferHangar, onTransferAllHangar, onDeployAllFromHangar, isDeployAllActive, onCancelDeployAll, onAddToHangar,
  groundUnits, unitTypes, teamGold, playerResources, allUnits, nearbyUnits,
}) {
  const [selectedComp, setSelectedComp] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedMissile, setSelectedMissile] = useState(null)
  const [ipbmTarget, setIpbmTarget] = useState('space')
  const [ipbmRow, setIpbmRow] = useState('')
  const [ipbmCol, setIpbmCol] = useState('')
  const upgrades = unit.upgrades || {}
  const unitName = unit.wg_unit_types?.name || 'Command Ship'
  const compartments = getCompartments(unitName)
  const isCommandShip = unitName === 'Command Ship'

  const CONVOY_TARGETS = new Set(['Command Center', 'Command Ship', 'Battleship'])
  const destinations = (allUnits || [])
    .filter(u => u.owner_id === unit.owner_id && u.id !== unit.id && CONVOY_TARGETS.has(u.wg_unit_types?.name))
    .filter(u => {
      const comps = getCompartments(u.wg_unit_types?.name)
      return comps.some(c => c.special === 'transport')
    })
    .map(u => ({ id: u.id, label: u.wg_unit_types?.name }))
  const isSpaceUnit = unit.board === 'space'
  const spaceGuildDest = isSpaceUnit ? [{ id: 'space_guild', label: 'Space Guild' }] : []
  const allDestinations = [...destinations, ...spaceGuildDest]

  const comp = selectedComp ? compartments.find(c => c.id === selectedComp) : null
  const slots = comp && !comp.special ? getSlots(upgrades, comp.id, comp.slots) : []

  return (
    <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img
            src={isCommandShip ? `/assets/${unit.upgrades?.shipModel || 'commandship2'}.png` : unitName === 'Battleship' ? '/assets/battleship.png' : unitName === 'Base' ? '/assets/base.png' : '/assets/command center.png'}
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
          {(isAdmin || !unit.has_attacked) && getEffectiveAttackRange(unit) > 0 && (
            <button
              onClick={onAttack}
              className="flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
              style={{ backgroundColor: '#4c1a1a', color: '#f47067', border: '1px solid #6e2b2b' }}
            >
              Attack
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
            statusSlots = Array.from({ length: c.slots }, (_, i) => lb[i] ? 2 : 0)
          } else if (c.special === 'hangar') {
            const hb = upgrades.hangar || []
            statusText = `${hb.length}/${c.slots} aircraft`
            const filledRatio = Math.ceil((hb.length / c.slots) * 4)
            statusSlots = Array.from({ length: 4 }, (_, i) => i < filledRatio ? 1 : 0)
          } else if (c.special === 'inventory') {
            const inv = upgrades.inventory || {}
            const totalItems = Object.values(inv).reduce((s, v) => s + v, 0)
            statusText = `${totalItems} ores`
            statusSlots = [totalItems > 0 ? 1 : 0]
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
                {statusSlots.map((filled, i) => {
                  const isLoadingBayFilled = c.special === 'loading_bay' && filled > 0
                  return (
                    <div
                      key={i}
                      className="flex-1 h-4 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: isLoadingBayFilled ? c.color + '60' : filled > 0 ? c.color + '30' : '#21262d',
                        border: `1px solid ${isLoadingBayFilled ? c.color : filled > 0 ? c.color + '80' : '#30363d'}`,
                        boxShadow: isLoadingBayFilled ? `0 0 4px ${c.color}50` : 'none',
                      }}
                    >
                      {filled > 0 && !c.special && (
                        <span className="text-[8px] font-bold" style={{ color: TIERS[filled - 1]?.color || c.color }}>
                          T{filled}
                        </span>
                      )}
                    </div>
                  )
                })}
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

          {comp.id === 'shields' && (() => {
            const shieldTier = Math.max(...(upgrades.shields || []).filter(s => s > 0), 0)
            if (shieldTier === 0) return null
            const maxHp = SHIELD_HP[shieldTier] || 0
            const currentHp = upgrades.shieldHp ?? maxHp
            const ratio = maxHp > 0 ? currentHp / maxHp : 0
            return (
              <div className="mb-2 p-1.5 rounded" style={{ backgroundColor: '#111820', border: '1px solid #1a3050' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: '#40a0e0' }}>Shield HP</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: ratio > 0.5 ? '#40a0e0' : ratio > 0 ? '#e0a040' : '#e05050' }}>
                    {currentHp} / {maxHp}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1a2030' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${ratio * 100}%`,
                    backgroundColor: ratio > 0.5 ? '#40a0e0' : ratio > 0 ? '#e0a040' : '#e05050',
                    boxShadow: `0 0 6px ${ratio > 0.5 ? '#40a0e040' : '#e0a04040'}`,
                  }} />
                </div>
              </div>
            )
          })()}

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
              destinations={allDestinations}
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
              onProduceUnit={onProduceUnit}
              onBuyAndLoadSoldier={onBuyAndLoadSoldier}
              groundUnits={groundUnits || []}
              comp={comp}
              unitTypes={unitTypes}
              teamGold={teamGold}
            />
          ) : comp.special === 'hangar' ? (
            <HangarPanel
              unit={unit}
              upgrades={upgrades}
              onDeployFromHangar={onDeployFromHangar}
              onProduceToHangar={onProduceToHangar}
              onTransferHangar={onTransferHangar}
              onTransferAllHangar={onTransferAllHangar}
              onDeployAllFromHangar={onDeployAllFromHangar}
              isDeployAllActive={isDeployAllActive}
              onCancelDeployAll={onCancelDeployAll}
              onAddToHangar={onAddToHangar}
              nearbyUnits={nearbyUnits}
              comp={comp}
              unitTypes={unitTypes}
              teamGold={teamGold}
              allUnits={allUnits}
            />
          ) : comp.special === 'inventory' ? (
            <InventoryPanel unit={unit} upgrades={upgrades} isCommandShip={isCommandShip} />
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

              {comp.id === 'missiles' && (() => {
                const munitions = upgrades.munitions || { tactical: 0, cruise: 0, ipbm: 0 }
                const missileLevel = slots[0] || 0
                const MISSILE_TYPES = [
                  { key: 'tactical', name: 'Tactical', color: '#8b949e', cost: 5, reqLevel: 1, range: 5 },
                  { key: 'cruise', name: 'Cruise', color: '#3fb950', cost: 10, reqLevel: 2, range: 8 },
                  { key: 'ipbm', name: 'IPBM', color: '#d29922', cost: 20, reqLevel: 3, range: '∞' },
                ]
                const selMissile = MISSILE_TYPES.find(m => m.key === selectedMissile)
                const canFire = selMissile && (munitions[selMissile.key] || 0) > 0 && !upgrades.missileFiredThisTurn
                const isIpbmGround = selectedMissile === 'ipbm' && ipbmTarget === 'ground'

                return (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        if (!canFire) return
                        if (isIpbmGround) {
                          const r = parseInt(ipbmRow, 10)
                          const c = parseInt(ipbmCol, 10)
                          if (isNaN(r) || isNaN(c)) return
                          onFireMissile(unit.id, selectedMissile, r, c, 'ground')
                          setSelectedMissile(null)
                          setIpbmRow('')
                          setIpbmCol('')
                        } else {
                          onFireMissile(unit.id, selectedMissile, null, null, 'space')
                          setSelectedMissile(null)
                        }
                      }}
                      disabled={!canFire || (isIpbmGround && (!ipbmRow || !ipbmCol))}
                      className="w-full py-2 mb-3 text-[11px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-default"
                      style={{
                        backgroundColor: canFire ? '#e0505030' : '#21262d',
                        color: canFire ? '#e05050' : '#4a5568',
                        border: `1px solid ${canFire ? '#e05050' : '#30363d'}`,
                      }}
                    >
                      {upgrades.missileFiredThisTurn
                        ? 'Missile Fired'
                        : canFire
                        ? isIpbmGround ? 'Launch IPBM (Strikes Next Turn)' : 'Fire Missile — Select Target'
                        : 'Fire Missile'}
                    </button>

                    {selectedMissile === 'ipbm' && (
                      <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#0d1117', border: '1px solid #d2992240' }}>
                        <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#d29922' }}>
                          IPBM Target
                        </div>
                        <div className="flex gap-1 mb-2">
                          {['space', 'ground'].map(b => (
                            <button
                              key={b}
                              onClick={() => setIpbmTarget(b)}
                              className="flex-1 py-1 text-[10px] font-semibold uppercase rounded cursor-pointer"
                              style={{
                                backgroundColor: ipbmTarget === b ? (b === 'space' ? '#2a1a3a' : '#1c3043') : '#21262d',
                                color: ipbmTarget === b ? (b === 'space' ? '#c080e0' : '#6cb4e6') : '#4a5568',
                                border: `1px solid ${ipbmTarget === b ? (b === 'space' ? '#c080e0' : '#6cb4e6') : '#30363d'}`,
                              }}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                        {ipbmTarget === 'ground' && (
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <label className="text-[8px] uppercase tracking-widest" style={{ color: '#6e7681' }}>X (Row)</label>
                              <input
                                type="number"
                                value={ipbmRow}
                                onChange={e => setIpbmRow(e.target.value)}
                                className="w-full px-2 py-1 rounded text-[11px] font-mono"
                                style={{ backgroundColor: '#161b22', color: '#c9d1d9', border: '1px solid #30363d', outline: 'none' }}
                                placeholder="0"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[8px] uppercase tracking-widest" style={{ color: '#6e7681' }}>Y (Col)</label>
                              <input
                                type="number"
                                value={ipbmCol}
                                onChange={e => setIpbmCol(e.target.value)}
                                className="w-full px-2 py-1 rounded text-[11px] font-mono"
                                style={{ backgroundColor: '#161b22', color: '#c9d1d9', border: '1px solid #30363d', outline: 'none' }}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}
                        {ipbmTarget === 'space' && (
                          <div className="text-[9px]" style={{ color: '#6e7681' }}>Click Fire then select target on space board</div>
                        )}
                        <div className="text-[8px] mt-1.5" style={{ color: '#6e7681' }}>
                          DMG: 20 center · 10 adjacent · 5 outer ring
                        </div>
                      </div>
                    )}

                    <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
                      Munitions
                    </div>
                    <div className="flex flex-col gap-1.5 mb-2">
                      {MISSILE_TYPES.map(m => {
                        const locked = missileLevel < m.reqLevel
                        const count = munitions[m.key] || 0
                        const isSelected = selectedMissile === m.key
                        return (
                          <div
                            key={m.key}
                            onClick={() => {
                              if (!locked && count > 0) setSelectedMissile(isSelected ? null : m.key)
                            }}
                            className="rounded p-1.5 transition-all"
                            style={{
                              opacity: locked ? 0.35 : 1,
                              cursor: !locked && count > 0 ? 'pointer' : 'default',
                              backgroundColor: isSelected ? m.color + '15' : 'transparent',
                              border: `1px solid ${isSelected ? m.color : 'transparent'}`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] font-semibold" style={{ color: locked ? '#4a5568' : m.color }}>
                                {m.name}{locked ? ` (Lv${m.reqLevel})` : ''}{!locked ? ` — Range: ${m.range}` : ''}
                              </span>
                              <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>{locked ? '—' : `${count}/10`}</span>
                            </div>
                            <div className="flex gap-[3px]">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div
                                  key={i}
                                  className="flex-1 rounded-sm"
                                  style={{
                                    height: 8,
                                    backgroundColor: !locked && i < count ? m.color : '#1c2128',
                                    border: `1px solid ${!locked && i < count ? m.color + '80' : '#2a3140'}`,
                                    opacity: !locked && i < count ? 1 : 0.5,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </div>
      )}
    </div>
  )
}
