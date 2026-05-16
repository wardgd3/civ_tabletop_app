import { useState, useEffect } from 'react'
import { GROUND_ORES, SPACE_ORES, SHIELD_HP, getEffectiveAttackRange, WARHEAD_TYPES } from '../hooks/useGameState'

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
  hull: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <path d="M3 14 L3 4 L8 2 L13 4 L13 14" />
      <line x1="3" y1="14" x2="13" y2="14" />
      <line x1="3" y1="7" x2="13" y2="7" />
      <line x1="3" y1="10.5" x2="13" y2="10.5" />
    </svg>
  ),
  walls: (
    <svg viewBox="0 0 16 16" style={ICON_STYLE}>
      <rect x="2" y="4" width="12" height="10" />
      <line x1="2" y1="9" x2="14" y2="9" />
      <line x1="5" y1="4" x2="5" y2="9" />
      <line x1="11" y1="4" x2="11" y2="9" />
      <line x1="8" y1="9" x2="8" y2="14" />
      <rect x="4" y="5" width="2" height="3" fill="none" />
    </svg>
  ),
}

const TIERS = [
  { level: 1, name: 'Standard', color: '#8b949e', cost: 0, prodCost: 0 },
  { level: 2, name: 'Advanced', color: '#3fb950', cost: 10, prodCost: 50 },
  { level: 3, name: 'Elite', color: '#d29922', cost: 25, prodCost: 100 },
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
    id: 'hull',
    name: 'Hull',
    description: 'Reinforced hull plating. Each tier adds 30 HP.',
    icon: 'hull',
    color: '#8090a0',
    slots: 1,
    tiers: [
      { name: 'Reinforced Plating', desc: '+30 HP' },
      { name: 'Composite Armor', desc: '+60 HP' },
      { name: 'Quantum Lattice', desc: '+90 HP' },
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
      { name: 'Deflector Array', desc: '50 shield HP' },
      { name: 'Adaptive Matrix', desc: '100 shield HP' },
      { name: 'Phase Shields', desc: '200 shield HP' },
    ],
  },
  {
    id: 'factory',
    name: 'Factory',
    description: 'Produces spaceship parts. Each tier unlocks larger parts and reduces cost by 15%.',
    icon: 'factory',
    color: '#60b060',
    slots: 1,
    tiers: [
      { name: 'Assembly Line', desc: 'Unlocks Small Parts' },
      { name: 'Nano-Forge', desc: 'Unlocks Medium Parts' },
      { name: 'Quantum Replicator', desc: 'Unlocks Large Parts' },
    ],
  },
  {
    id: 'cannon',
    name: 'Cannon',
    description: 'Weapon systems. Each slot mounts a weapon.',
    icon: 'cannon',
    color: '#e05050',
    slots: 1,
    tiers: [
      { name: '500mm Light Cannon', desc: 'Light kinetic weapon' },
      { name: '640mm Medium Cannon', desc: 'Medium caliber weapon' },
      { name: '820mm Heavy Cannon', desc: 'Heavy caliber weapon' },
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
    slots: 3,
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
    id: 'walls',
    name: 'Walls',
    description: 'Reinforced walls. Each tier adds 30 HP.',
    icon: 'walls',
    color: '#8090a0',
    slots: 1,
    tiers: [
      { name: 'Reinforced Walls', desc: '+30 HP' },
      { name: 'Composite Barriers', desc: '+60 HP' },
      { name: 'Quantum Fortification', desc: '+90 HP' },
    ],
  },
  {
    id: 'shields',
    name: 'Shields',
    description: 'Defensive barrier around the base.',
    icon: 'shields',
    color: '#40a0e0',
    slots: 1,
    tiers: [
      { name: 'Perimeter Barrier', desc: '50 shield HP' },
      { name: 'Defense Grid', desc: '100 shield HP' },
      { name: 'Quantum Barrier', desc: '200 shield HP' },
    ],
  },
  {
    id: 'cannon',
    name: 'Cannons',
    description: 'Base defense turrets.',
    icon: 'cannon',
    color: '#e05050',
    slots: 1,
    tiers: [
      { name: '500mm Light Cannon', desc: 'Light kinetic weapon' },
      { name: '640mm Medium Cannon', desc: 'Medium caliber weapon' },
      { name: '820mm Heavy Cannon', desc: 'Heavy caliber weapon' },
    ],
  },
  {
    id: 'factory',
    name: 'Factory',
    description: 'Produces spaceship parts. Each tier unlocks larger parts and reduces cost by 15%.',
    icon: 'factory',
    color: '#60b060',
    slots: 1,
    tiers: [
      { name: 'Assembly Line', desc: 'Unlocks Small Parts' },
      { name: 'Nano-Forge', desc: 'Unlocks Medium Parts' },
      { name: 'Quantum Replicator', desc: 'Unlocks Large Parts' },
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
    slots: 3,
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
      { name: 'Deflector Array', desc: '50 shield HP' },
      { name: 'Adaptive Matrix', desc: '100 shield HP' },
      { name: 'Phase Shields', desc: '200 shield HP' },
    ],
  },
  {
    id: 'cannon',
    name: 'Cannon',
    description: 'Weapon systems. Each slot mounts a weapon.',
    icon: 'cannon',
    color: '#e05050',
    slots: 1,
    tiers: [
      { name: '500mm Light Cannon', desc: 'Light kinetic weapon' },
      { name: '640mm Medium Cannon', desc: 'Medium caliber weapon' },
      { name: '820mm Heavy Cannon', desc: 'Heavy caliber weapon' },
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
    slots: 1,
    tiers: [
      { name: '500mm Light Cannon', desc: 'Light kinetic weapon' },
      { name: '640mm Medium Cannon', desc: 'Medium caliber weapon' },
      { name: '820mm Heavy Cannon', desc: 'Heavy caliber weapon' },
    ],
  },
]

const REPAIR_SHIP_COMPARTMENTS = [
  {
    id: 'repair',
    name: 'Repair Ship',
    description: 'Repairs nearby team ships each turn.',
    icon: 'reactor',
    color: '#50c878',
    slots: 1,
    tiers: [
      { name: 'Field Repair', desc: '+1 HP, 3 tile radius' },
      { name: 'Advanced Repair', desc: '+2 HP, 4 tile radius' },
      { name: 'Master Repair', desc: '+3 HP, 5 tile radius' },
    ],
  },
]

const CONVOY_COST = 15
const CONVOY_CAPACITY = 5
const CONVOY_TRANSIT_TURNS = 3
const HOLDING_BAY_CAPACITY = 12

export function getCompartments(unitName) {
  if (unitName === 'Command Ship') return COMMAND_SHIP_COMPARTMENTS
  if (unitName === 'Battleship') return BATTLESHIP_COMPARTMENTS
  if (unitName === 'Command Center') return COMMAND_CENTER_COMPARTMENTS
  if (unitName === 'Base') return BASE_COMPARTMENTS
  if (unitName === 'Fighter') return FIGHTER_COMPARTMENTS
  if (unitName === 'Repair Ship') return REPAIR_SHIP_COMPARTMENTS
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

const RESOURCE_VALUES = {
  iron: 5, uranium: 8, aluminum: 4, tritium: 10,
  ruby: 15, sapphire: 15, diamond: 20, amethyst: 12, quasicrystals: 25,
}

function ConvoyDetail({ unit, convoy, convoyIndex, upgrades, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onLoadCargo, onUnloadCargo, onLoadInventoryToConvoy, groundUnits, comp, isCC, teamGold, playerResources, destinations, availableUnitTypes, missileLevel, isAdmin }) {
  const [goldAmount, setGoldAmount] = useState('')
  const [selectedLoadItem, setSelectedLoadItem] = useState(null)
  const [loadQty, setLoadQty] = useState('')
  const [selectedDest, setSelectedDest] = useState(destinations?.length === 1 ? destinations[0].id : null)
  const [orderUnits, setOrderUnits] = useState([])
  const [orderMunitions, setOrderMunitions] = useState({ tactical: 0, cruise: 0, ipbm: 0 })
  const [showBuyUnits, setShowBuyUnits] = useState(false)
  const cargo = convoy.cargo || { gold: 0, resources: {} }
  const hasAnyCargo = (cargo.gold || 0) > 0 || Object.values(cargo.resources || {}).some(v => v > 0)
  const hasAnyLoad = (convoy.units || []).length > 0 || hasAnyCargo

  const availableResources = Object.entries(playerResources || {}).filter(
    ([key, amount]) => amount > 0 && key !== 'excavations'
  )

  return (
    <div className="p-2 rounded" style={{ backgroundColor: '#111214', border: `1px solid ${comp.color}40` }}>
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Convoy {convoyIndex + 1} — Inventory
      </div>

      <div className="mb-2">
        <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Units ({(convoy.units || []).length}/{CONVOY_CAPACITY}):</div>
        {(convoy.units || []).length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {convoy.units.map((u, idx) => (
              <div key={idx} className="flex items-center justify-between p-1 rounded"
                style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
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
              <div key={i} className="flex-1 rounded" style={{ height: 24, backgroundColor: '#18191c', border: '1px solid #2a3140' }} />
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
                    style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
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
                    style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
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
                    style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                    <span className="text-[9px] font-semibold" style={{ color: m.color }}>{m.name}</span>
                    <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>{munitions[m.key]}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-1 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
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
                style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                <span className="text-[9px]" style={{ color: '#cca43b' }}>Gold: {cargo.gold}</span>
              </div>
            )}
            {Object.entries(cargo.resources || {}).filter(([, v]) => v > 0).map(([key, amount]) => {
              const RESOURCE_LABELS = {
                small_spaceship_parts: 'Small Parts', medium_spaceship_parts: 'Medium Parts', large_spaceship_parts: 'Large Parts',
                iron: 'Iron', uranium: 'Uranium', aluminum: 'Aluminum', tritium: 'Tritium',
                ruby: 'Ruby', sapphire: 'Sapphire', diamond: 'Diamond', amethyst: 'Amethyst', quasicrystals: 'Quasicrystals', oil: 'Oil',
              }
              const RESOURCE_COLORS = {
                small_spaceship_parts: '#a0a0a0', medium_spaceship_parts: '#c0c0c0', large_spaceship_parts: '#e0d060',
              }
              const label = RESOURCE_LABELS[key] || key
              const color = RESOURCE_COLORS[key] || '#c9d1d9'
              return (
                <div key={key} className="flex items-center justify-between p-1.5 rounded"
                  style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                  <div className="flex items-center gap-1.5">
                    {key.includes('spaceship_parts') ? (
                      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="8" cy="6" r="3" />
                        <path d="M5 9 L3 14 L8 12 L13 14 L11 9" />
                      </svg>
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    )}
                    <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color }}>{amount}</span>
                </div>
              )
            })}
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
        <div className="p-1 rounded mb-2" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
          <span className="text-[9px]" style={{ color: '#4a5568' }}>None</span>
        </div>
      )}

      {(() => {
        const inv = upgrades.inventory || {}
        const allOreMap = { ...GROUND_ORES, ...SPACE_ORES }
        const loadOptions = []
        if (teamGold > 0) loadOptions.push({ key: '_gold', label: `Gold (${teamGold})`, type: 'gold', max: teamGold })
        for (const [key, amount] of availableResources) {
          const RLABELS = { iron: 'Iron', uranium: 'Uranium', aluminum: 'Aluminum', tritium: 'Tritium', ruby: 'Ruby', sapphire: 'Sapphire', diamond: 'Diamond', amethyst: 'Amethyst', quasicrystals: 'Quasicrystals', oil: 'Oil' }
          loadOptions.push({ key, label: `${RLABELS[key] || key} (${amount})`, type: 'resource', max: amount })
        }
        for (const [itemKey, amt] of Object.entries(inv)) {
          if (amt <= 0) continue
          const oreDef = allOreMap[itemKey]
          const prodDef = PRODUCED_ITEMS.find(p => p.id === itemKey)
          const label = oreDef ? oreDef.name : prodDef ? prodDef.name : itemKey
          loadOptions.push({ key: itemKey, label: `${label} (${amt})`, type: 'inventory', max: amt })
        }
        if (loadOptions.length === 0) return null
        const selectedOpt = loadOptions.find(o => o.key === selectedLoadItem)
        return (
          <div className="mb-2">
            <div className="flex gap-1">
              <select
                value={selectedLoadItem || ''}
                onChange={e => { setSelectedLoadItem(e.target.value || null); setLoadQty('') }}
                className="flex-1 px-1.5 py-1.5 text-[10px] rounded"
                style={{ backgroundColor: '#18191c', border: '1px solid #30363d', color: '#c9d1d9', outline: 'none' }}
              >
                <option value="">Select item to load...</option>
                {loadOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!selectedLoadItem || !selectedOpt) return
                  const qty = parseInt(loadQty) || selectedOpt.max
                  const clampedQty = Math.min(Math.max(1, qty), selectedOpt.max)
                  if (selectedOpt.type === 'gold') {
                    if (clampedQty > 0) onLoadCargo(unit.id, convoyIndex, { gold: clampedQty })
                  } else if (selectedOpt.type === 'resource') {
                    onLoadCargo(unit.id, convoyIndex, { resources: { [selectedOpt.key]: clampedQty } })
                  } else if (selectedOpt.type === 'inventory') {
                    onLoadInventoryToConvoy?.(unit.id, convoyIndex, selectedOpt.key, clampedQty)
                  }
                  setSelectedLoadItem(null)
                  setLoadQty('')
                }}
                disabled={!selectedLoadItem}
                className="px-3 py-1.5 text-[9px] font-semibold uppercase rounded cursor-pointer disabled:opacity-30"
                style={{ backgroundColor: '#21262d', color: '#c9d1d9', border: '1px solid #30363d' }}
              >
                Load
              </button>
            </div>
            {selectedOpt && (
              <input
                type="number"
                min="1"
                max={selectedOpt.max}
                value={loadQty}
                onChange={e => setLoadQty(e.target.value)}
                placeholder={`Qty (max ${selectedOpt.max}, blank = all)`}
                className="w-full mt-1 px-1.5 py-1.5 text-[10px] rounded"
                style={{ backgroundColor: '#18191c', border: '1px solid #30363d', color: '#c9d1d9', outline: 'none' }}
              />
            )}
          </div>
        )
      })()}

      {destinations && destinations.length > 0 && (
        <div className="mt-2 mb-1">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#4a5568' }}>
            Destination
          </div>
          <select
            value={selectedDest || ''}
            onChange={e => setSelectedDest(e.target.value || null)}
            className="w-full px-1.5 py-1 text-[10px] rounded"
            style={{ backgroundColor: '#18191c', border: '1px solid #30363d', color: '#c9d1d9', outline: 'none' }}
          >
            <option value="">Select destination...</option>
            {destinations.map((d, dIdx) => (
              <option key={d.id} value={d.id}>{d.id !== 'space_guild' ? `${dIdx + 1}. ` : ''}{d.label}</option>
            ))}
          </select>
        </div>
      )}

      {selectedDest === 'space_guild' && (() => {
        const cargo = convoy.cargo || { gold: 0, resources: {} }
        let sellValue = 0
        for (const [key, amount] of Object.entries(cargo.resources || {})) {
          if (amount > 0) sellValue += amount * (RESOURCE_VALUES[key] || 5)
        }
        for (const u of (convoy.units || [])) {
          sellValue += u.cost || 10
        }

        const MISSILE_COSTS = { tactical: 5, cruise: 10, ipbm: 20 }
        const mlSlots = Array.isArray(missileLevel) ? missileLevel : []
        const effectiveLevel = isAdmin ? 3 : mlSlots.reduce((max, v) => Math.max(max, v || 0), 0)
        const MISSILE_TYPES = [
          { key: 'tactical', name: 'Tactical', color: '#8b949e', cost: 5, reqLevel: 1 },
          { key: 'cruise', name: 'Cruise', color: '#3fb950', cost: 10, reqLevel: 2 },
          { key: 'ipbm', name: 'IPBM', color: '#d29922', cost: 20, reqLevel: 3 },
        ]

        const orderUnitCost = orderUnits.reduce((s, id) => {
          const ut = (availableUnitTypes || []).find(t => t.id === id)
          return s + (ut?.cost || 0)
        }, 0)
        const orderMunCost = Object.entries(orderMunitions).reduce((s, [k, v]) => s + (MISSILE_COSTS[k] || 0) * v, 0)
        const totalOrderCost = orderUnitCost + orderMunCost
        const effectiveGold = teamGold + sellValue

        return (
          <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0a1929', border: '1px solid #6cb4e640' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <img src="/assets/spaceguild.png" alt="Space Guild" className="w-4 h-4 object-contain" />
              <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: '#6cb4e6' }}>
                Space Guild Order
              </span>
            </div>

            {sellValue > 0 && (
              <div className="p-1.5 rounded mb-2" style={{ backgroundColor: '#cca43b10', border: '1px solid #cca43b30' }}>
                <div className="text-[9px]" style={{ color: '#cca43b' }}>
                  Auto-sell cargo: +{sellValue}g
                </div>
                <div className="text-[8px]" style={{ color: '#6e7681' }}>
                  All units and resources in the convoy will be sold
                </div>
              </div>
            )}

            {availableUnitTypes && availableUnitTypes.length > 0 && (
              <>
                <button
                  onClick={() => setShowBuyUnits(v => !v)}
                  className="w-full flex items-center justify-between mb-1 px-2 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-colors"
                  style={{
                    backgroundColor: showBuyUnits ? '#1a2a3a' : '#18191c',
                    border: `1px solid ${showBuyUnits ? '#6cb4e650' : '#30363d'}`,
                    color: showBuyUnits ? '#6cb4e6' : '#8b949e',
                  }}
                >
                  Buy Units
                  <span className="text-[9px]">{showBuyUnits ? '▴' : '▾'}</span>
                </button>
                {showBuyUnits && (
                  <div className="flex flex-col gap-0.5 mb-2">
                    {availableUnitTypes.map(ut => {
                      const canAfford = effectiveGold >= totalOrderCost + ut.cost
                      return (
                        <button
                          key={ut.id}
                          onClick={() => canAfford && setOrderUnits(prev => [...prev, ut.id])}
                          disabled={!canAfford}
                          className="flex items-center justify-between p-1 rounded transition-colors"
                          style={{
                            backgroundColor: canAfford ? '#1a2a3a10' : '#111214',
                            border: `1px solid ${canAfford ? '#6cb4e640' : '#2a3140'}`,
                            cursor: canAfford ? 'pointer' : 'default',
                            opacity: canAfford ? 1 : 0.4,
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <img src={`/assets/${ut.name.toLowerCase().replace(/\s+/g, '')}.png`} alt={ut.name} className="w-5 h-5 object-contain" />
                            <div className="text-left">
                              <div className="text-[9px] font-semibold" style={{ color: '#c9d1d9' }}>{ut.name}</div>
                              <div className="text-[7px]" style={{ color: '#6e7681' }}>ATK {ut.attack} DEF {ut.defense} HP {ut.hp}</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-semibold" style={{ color: '#cca43b' }}>{ut.cost}g</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {effectiveLevel > 0 && (
              <>
                <div
                  className="w-full flex items-center px-2 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold mb-1"
                  style={{ backgroundColor: '#1a2a3a', border: '1px solid #6cb4e650', color: '#6cb4e6' }}
                >
                  Buy Munitions
                </div>
                <div className="flex gap-1 mb-2">
                  {MISSILE_TYPES.map(m => {
                    const locked = effectiveLevel < m.reqLevel
                    const canAfford = effectiveGold >= totalOrderCost + m.cost
                    const disabled = locked || !canAfford
                    return (
                      <button
                        key={m.key}
                        onClick={() => !disabled && setOrderMunitions(prev => ({ ...prev, [m.key]: (prev[m.key] || 0) + 1 }))}
                        disabled={disabled}
                        className="flex-1 rounded p-1 text-center transition-all"
                        style={{
                          backgroundColor: disabled ? '#18191c' : m.color + '15',
                          border: `1px solid ${disabled ? '#2a3140' : m.color + '60'}`,
                          cursor: disabled ? 'default' : 'pointer',
                          opacity: disabled ? 0.4 : 1,
                        }}
                      >
                        <div className="text-[8px] font-semibold" style={{ color: locked ? '#4a5568' : m.color }}>
                          {locked ? 'Locked' : m.name}
                        </div>
                        {!locked && (
                          <div className="text-[8px] font-mono" style={{ color: '#cca43b' }}>{m.cost}g</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {(orderUnits.length > 0 || Object.values(orderMunitions).some(v => v > 0)) && (
              <div className="p-1.5 rounded mb-2" style={{ backgroundColor: '#18191c', border: '1px solid #30363d' }}>
                <div className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#4a5568' }}>
                  Order Summary
                </div>
                {orderUnits.length > 0 && (() => {
                  const counts = {}
                  for (const id of orderUnits) {
                    const ut = (availableUnitTypes || []).find(t => t.id === id)
                    if (ut) counts[ut.name] = (counts[ut.name] || { count: 0, cost: ut.cost, id: ut.id })
                    if (ut) counts[ut.name].count++
                  }
                  return Object.entries(counts).map(([name, { count, cost }]) => (
                    <div key={name} className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{name} x{count}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-mono" style={{ color: '#cca43b' }}>{cost * count}g</span>
                        <button
                          onClick={() => setOrderUnits(prev => {
                            const idx = prev.lastIndexOf((availableUnitTypes || []).find(t => t.name === name)?.id)
                            if (idx >= 0) { const n = [...prev]; n.splice(idx, 1); return n }
                            return prev
                          })}
                          className="text-[8px] px-1 rounded cursor-pointer"
                          style={{ color: '#f47067', backgroundColor: '#4c1a1a', border: '1px solid #6e2b2b' }}
                        >−</button>
                      </div>
                    </div>
                  ))
                })()}
                {Object.entries(orderMunitions).filter(([, v]) => v > 0).map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px]" style={{ color: '#c9d1d9' }}>{key} x{count}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-mono" style={{ color: '#cca43b' }}>{(MISSILE_COSTS[key] || 0) * count}g</span>
                      <button
                        onClick={() => setOrderMunitions(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))}
                        className="text-[8px] px-1 rounded cursor-pointer"
                        style={{ color: '#f47067', backgroundColor: '#4c1a1a', border: '1px solid #6e2b2b' }}
                      >−</button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-1 pt-1" style={{ borderTop: '1px solid #30363d' }}>
                  <span className="text-[9px] font-semibold" style={{ color: '#c9d1d9' }}>Total</span>
                  <span className="text-[9px] font-mono font-semibold" style={{ color: '#cca43b' }}>{totalOrderCost}g</span>
                </div>
              </div>
            )}

            <div className="text-[8px] mb-1" style={{ color: '#6e7681' }}>
              Available: <span style={{ color: '#cca43b' }}>{effectiveGold - totalOrderCost}g</span>
              {sellValue > 0 && <span> (incl. {sellValue}g from sales)</span>}
            </div>
          </div>
        )
      })()}

      <button
        onClick={() => {
          if (selectedDest === 'space_guild') {
            onSendConvoy(unit.id, convoyIndex, selectedDest, { buyUnits: orderUnits, buyMunitions: orderMunitions })
          } else {
            onSendConvoy(unit.id, convoyIndex, selectedDest)
          }
        }}
        disabled={!selectedDest}
        className="w-full mt-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
        style={{
          backgroundColor: selectedDest ? (selectedDest === 'space_guild' ? '#6cb4e620' : '#d29922' + '20') : '#21262d',
          color: selectedDest ? (selectedDest === 'space_guild' ? '#6cb4e6' : '#d29922') : '#8b949e',
          border: `1px solid ${selectedDest ? (selectedDest === 'space_guild' ? '#6cb4e640' : '#d29922' + '40') : '#30363d'}`,
        }}
      >
        {selectedDest === 'space_guild' ? 'Place Order' : selectedDest ? `Send (${CONVOY_TRANSIT_TURNS} turns)` : 'Select Destination'}
      </button>
    </div>
  )
}

function TransportPanel({ unit, upgrades, onBuildConvoy, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onLoadCargo, onUnloadCargo, onLoadInventoryToConvoy, groundUnits, comp, isAdmin, teamGold, playerResources, destinations, onSetNumberedOverlays, availableUnitTypes, unitTypes: allUnitTypes }) {
  const [selectedConvoy, setSelectedConvoy] = useState(null)
  const convoys = upgrades.convoys || []
  const maxConvoys = comp.slots
  const isCC = unit.wg_unit_types?.name === 'Command Center'
  const availableConvoys = convoys.map((c, i) => ({ ...c, idx: i })).filter(c => !c.inTransit)
  const inTransitConvoys = convoys.map((c, i) => ({ ...c, idx: i })).filter(c => c.inTransit)

  useEffect(() => {
    if (selectedConvoy !== null && destinations.length > 0) {
      onSetNumberedOverlays?.(destinations.filter(d => d.id !== 'space_guild').map((d, i) => ({ unitId: d.id, number: i + 1 })))
    } else {
      onSetNumberedOverlays?.([])
    }
  }, [selectedConvoy])

  useEffect(() => {
    return () => onSetNumberedOverlays?.([])
  }, [])

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
                      backgroundColor: isSelected ? comp.color + '20' : '#18191c',
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
            onLoadCargo={onLoadCargo} onUnloadCargo={onUnloadCargo} onLoadInventoryToConvoy={onLoadInventoryToConvoy}
            groundUnits={groundUnits} comp={comp} isCC={true}
            teamGold={teamGold} playerResources={playerResources}
            destinations={destinations}
            availableUnitTypes={availableUnitTypes} missileLevel={upgrades.missiles} isAdmin={isAdmin}
          />
        )}

        <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5 mt-2" style={{ color: '#4a5568' }}>
          Incoming ({inTransitConvoys.length})
        </div>
        {inTransitConvoys.length === 0 ? (
          <div className="text-[9px] p-2 rounded text-center" style={{ backgroundColor: '#18191c', border: '1px solid #30363d', color: '#4a5568' }}>
            No convoys in transit
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {inTransitConvoys.map(convoy => (
              <div key={convoy.idx} className="p-2 rounded"
                style={{ backgroundColor: '#18191c', border: '1px solid #d29922' + '60' }}>
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
                        style={{ backgroundColor: '#111214', border: '1px solid #2a3140' }}>
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
          <div className="text-[9px] p-2 rounded text-center" style={{ backgroundColor: '#18191c', border: '1px solid #30363d', color: '#4a5568' }}>
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
                style={{ backgroundColor: '#18191c', border: '1px solid #30363d' }}
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
                style={{ backgroundColor: '#18191c', border: '1px solid #d29922' + '60' }}
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
                backgroundColor: isSelected ? comp.color + '20' : '#18191c',
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
          onLoadCargo={onLoadCargo} onUnloadCargo={onUnloadCargo} onLoadInventoryToConvoy={onLoadInventoryToConvoy}
          groundUnits={groundUnits} comp={comp} isCC={false}
          teamGold={teamGold} playerResources={playerResources}
          destinations={destinations}
          availableUnitTypes={availableUnitTypes} missileLevel={upgrades.missiles} isAdmin={isAdmin}
        />
      )}
    </div>
  )
}

const STRUCTURE_NAMES = new Set(['Command Center', 'Command Ship', 'Base', 'Factory', 'Mining Station', 'Battleship', 'Repair Ship'])

function HoldingBayPanel({ unit, upgrades, onDeployFromBay, onProduceUnit, comp, unitTypes, availableProduction, isAdmin }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showProduceMenu, setShowProduceMenu] = useState(false)
  const holdingBay = upgrades.holdingBay || []
  const isFull = holdingBay.length >= HOLDING_BAY_CAPACITY

  const producibleTypes = (unitTypes || []).filter(ut =>
    (ut.board || 'ground') === 'ground' && !STRUCTURE_NAMES.has(ut.name)
  ).sort((a, b) => a.cost - b.cost)

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
                      : isEmpty ? '#18191c' : comp.color + '15',
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
        <div className="p-2 rounded mb-2" style={{ backgroundColor: '#111214', border: `1px solid ${comp.color}40` }}>
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
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#111214', border: `1px solid ${comp.color}40` }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Produce Unit — <span className="font-mono" style={{ color: '#8b949e' }}>⚒{availableProduction ?? 0}</span>
          </div>
          {producibleTypes.length === 0 ? (
            <div className="text-[9px]" style={{ color: '#4a5568' }}>No unit types available</div>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
              {producibleTypes.map(ut => {
                const canAfford = isAdmin || (availableProduction ?? 0) >= ut.cost
                return (
                  <button
                    key={ut.id}
                    onClick={() => {
                      if (canAfford) onProduceUnit(unit.id, ut.id, ut.name)
                    }}
                    disabled={!canAfford}
                    className="flex items-center justify-between p-1.5 rounded text-left transition-all"
                    style={{
                      backgroundColor: '#18191c',
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
                    <span className="text-[9px] font-mono" style={{ color: canAfford ? '#8b949e' : '#e05050' }}>
                      ⚒{ut.cost}
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

const HANGAR_UNIT_NAMES = new Set(['Bomber', 'Mining Station', 'Fighter', 'Repair Ship', 'Recon Drone'])

function HangarPanel({ unit, upgrades, onDeployFromHangar, onProduceToHangar, onTransferHangar, onTransferAllHangar, onDeployAllFromHangar, isDeployAllActive, onCancelDeployAll, onAddToHangar, onProduceBattleshipToBay, onBuyMissileForDockedBs, onRenameDockedBs, onLoadToBsHangar, onDeployDockedBs, nearbyUnits, comp, unitTypes, teamGold, allUnits, onSetNumberedOverlays, isAdmin, availableProduction }) {
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showProduceMenu, setShowProduceMenu] = useState(false)
  const [showTransferMenu, setShowTransferMenu] = useState(false)
  const [showTransferAllMenu, setShowTransferAllMenu] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [selectedBsSlot, setSelectedBsSlot] = useState(null)
  const [bsSubPanel, setBsSubPanel] = useState(null)
  const [bsRenaming, setBsRenaming] = useState(false)
  const [bsRenameValue, setBsRenameValue] = useState('')
  const hangar = upgrades.hangar || []
  const capacity = comp.slots
  const isFull = hangar.length >= capacity
  const battleshipBay = upgrades.battleshipBay || [null, null]
  const isCommandShip = unit.wg_unit_types?.name === 'Command Ship'

  const producibleTypes = (unitTypes || []).filter(ut => HANGAR_UNIT_NAMES.has(ut.name)).sort((a, b) => a.cost - b.cost)
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

  useEffect(() => {
    if (showTransferMenu || showTransferAllMenu) {
      onSetNumberedOverlays?.(transferTargets.map((t, i) => ({ unitId: t.id, number: i + 1 })))
    } else {
      onSetNumberedOverlays?.([])
    }
  }, [showTransferMenu, showTransferAllMenu])

  useEffect(() => {
    return () => onSetNumberedOverlays?.([])
  }, [])

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
        <div className="mb-2 p-2 rounded" style={{ backgroundColor: '#111214', border: '1px solid #1a3a1a' }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Nearby Units (4 tiles)
          </div>
          <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
            {eligibleForHangar.map(u => (
              <button
                key={u.id}
                onClick={() => { onAddToHangar(unit.id, u.id); setShowAddMenu(false) }}
                className="flex items-center justify-between p-1.5 rounded text-left transition-all cursor-pointer"
                style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
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
        <div className="mb-2 p-2 rounded" style={{ backgroundColor: '#111214', border: '1px solid #1a3050' }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Transfer All To
          </div>
          <div className="flex flex-col gap-0.5">
            {transferTargets.map((target, tIdx) => {
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
                    backgroundColor: '#18191c',
                    border: '1px solid #2a3140',
                    opacity: targetFull ? 0.4 : 1,
                    cursor: targetFull ? 'default' : 'pointer',
                  }}
                >
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full mr-1 text-[8px]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>{tIdx + 1}</span>
                    {target.wg_unit_types?.name}
                  </span>
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
                backgroundColor: isSelected ? comp.color + '20' : isEmpty ? '#18191c' : comp.color + '15',
                border: `1px solid ${isSelected ? comp.color : isEmpty ? '#30363d' : comp.color + '50'}`,
                cursor: isEmpty ? 'default' : 'pointer',
              }}
            >
              {isEmpty ? (
                <span className="text-[10px]" style={{ color: '#30363d' }}>&ndash;</span>
              ) : (
                <>
                  {(() => {
                    const ut = (unitTypes || []).find(t => t.name === stored.typeName)
                    return ut?.icon ? <img src={`/assets/${ut.icon}`} alt={stored.typeName} className="object-contain mb-0.5" style={{ width: 44, height: 44 }} /> : null
                  })()}
                  <div className="text-[7px] font-semibold leading-tight" style={{ color: stored.transferredThisTurn ? '#6e7681' : '#c9d1d9' }}>
                    {stored.typeName}
                  </div>
                  {stored.transferredThisTurn && (
                    <div className="text-[6px] uppercase" style={{ color: '#d29922' }}>locked</div>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {selectedSlot !== null && allSlots[selectedSlot] && (
        <div className="p-2 rounded mb-2" style={{ backgroundColor: '#111214', border: `1px solid ${comp.color}40` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
              {allSlots[selectedSlot].typeName}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => { if (!allSlots[selectedSlot]?.transferredThisTurn) { onDeployFromHangar(unit.id, selectedSlot); setSelectedSlot(null) } }}
              disabled={!!allSlots[selectedSlot]?.transferredThisTurn}
              className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
              style={{
                backgroundColor: comp.color + '20',
                color: comp.color,
                border: `1px solid ${comp.color}40`,
              }}
            >
              {allSlots[selectedSlot]?.transferredThisTurn ? 'Locked' : 'Deploy'}
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
              {transferTargets.map((target, tIdx) => {
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
                      backgroundColor: '#18191c',
                      border: '1px solid #2a3140',
                      opacity: targetFull ? 0.4 : 1,
                      cursor: targetFull ? 'default' : 'pointer',
                    }}
                  >
                    <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full mr-1 text-[8px]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>{tIdx + 1}</span>
                      {target.wg_unit_types?.name}
                    </span>
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
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#111214', border: `1px solid ${comp.color}40` }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            Produce Ship — <span className="font-mono" style={{ color: '#60b060' }}>⚒{availableProduction ?? 0}</span>
          </div>
          {producibleTypes.length === 0 ? (
            <div className="text-[9px]" style={{ color: '#4a5568' }}>No ship types available</div>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
              {producibleTypes.map(ut => {
                const prodCost = Math.ceil(ut.cost / 2)
                const canAfford = isAdmin || (availableProduction ?? 0) >= prodCost
                return (
                  <button
                    key={ut.id}
                    onClick={() => { if (canAfford) onProduceToHangar(unit.id, ut.id, ut.name) }}
                    disabled={!canAfford}
                    className="flex items-center justify-between p-1.5 rounded text-left transition-all"
                    style={{
                      backgroundColor: '#18191c',
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
                    <span className="text-[9px] font-mono" style={{ color: canAfford ? '#60b060' : '#e05050' }}>⚒{prodCost}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {isCommandShip && (
        <>
          <div className="text-[9px] uppercase tracking-widest font-semibold mt-3 mb-1.5" style={{ color: '#4a5568' }}>
            Battleship Docks ({battleshipBay.filter(Boolean).length}/2)
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {battleshipBay.map((bs, i) => {
              const isSelected = selectedBsSlot === i
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (bs) { setSelectedBsSlot(isSelected ? null : i); setBsSubPanel(null); setSelectedSlot(null) }
                  }}
                  className="rounded p-2 text-center transition-all flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: isSelected ? '#1a2a3a' : bs ? '#18191c' : '#111214',
                    border: `2px ${bs ? 'solid' : 'dashed'} ${isSelected ? '#6cb4e6' : bs ? '#3a4a5a' : '#2a3140'}`,
                    cursor: bs ? 'pointer' : 'default',
                    minHeight: '56px',
                  }}
                >
                  {bs ? (
                    <>
                      <img src="/assets/battleship.png" alt="Battleship" className="object-contain mb-0.5" style={{ width: 60, height: 60 }} />
                      <div className="text-[8px] font-semibold" style={{ color: '#c9d1d9' }}>{bs.upgrades?.customName || bs.typeName}</div>
                      <div className="text-[7px] font-mono" style={{ color: '#6e7681' }}>HP {bs.hp}</div>
                    </>
                  ) : (
                    <span className="text-[10px]" style={{ color: '#30363d' }}>Empty Dock</span>
                  )}
                </button>
              )
            })}
          </div>

          {(() => {
            const bsType = (unitTypes || []).find(t => t.name === 'Battleship')
            const bsFull = battleshipBay.every(Boolean)
            const inv = upgrades.inventory || {}
            const hasMats = isAdmin || ((inv.uranium || 0) >= 1 && (inv.iron || 0) >= 50 && (inv.aluminum || 0) >= 30)
            const canAfford = isAdmin || teamGold >= (bsType?.cost || 0)
            if (!bsType || bsFull) return null
            return (
              <button
                onClick={() => { if (canAfford && hasMats) onProduceBattleshipToBay?.(unit.id, bsType.id) }}
                disabled={!canAfford || !hasMats}
                className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30 mb-2"
                style={{ backgroundColor: '#1a2a3a', color: '#6cb4e6', border: '1px solid #3a4a5a' }}
              >
                Build Battleship — <span className="font-mono">⚒{bsType.cost}</span>
                <span className="text-[8px] ml-1 font-normal opacity-60">1 uranium · 50 iron · 30 aluminum</span>
              </button>
            )
          })()}

          {selectedBsSlot !== null && battleshipBay[selectedBsSlot] && (() => {
            const bs = battleshipBay[selectedBsSlot]
            const bsUpgrades = bs.upgrades || {}
            const bsCompartments = BATTLESHIP_COMPARTMENTS
            const bsHangar = bsUpgrades.hangar || []
            const bsMissiles = bsUpgrades.missiles || {}
            const MISSILE_TYPES = [
              { key: 'tactical', name: 'Tactical', cost: 5, color: '#6cb4e6', reqLevel: 0 },
              { key: 'cruise', name: 'Cruise', cost: 18, color: '#cca43b', reqLevel: 0 },
              { key: 'icbm', name: 'IPBM', cost: 28, color: '#e05050', reqLevel: 0 },
            ]
            return (
              <div className="p-2 rounded mb-2" style={{ backgroundColor: '#111214', border: '1px solid #3a4a5a' }}>
                <div className="flex items-center justify-between mb-2">
                  {bsRenaming ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); onRenameDockedBs?.(unit.id, selectedBsSlot, bsRenameValue); setBsRenaming(false) }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={bsRenameValue}
                        onChange={e => setBsRenameValue(e.target.value)}
                        onBlur={() => { onRenameDockedBs?.(unit.id, selectedBsSlot, bsRenameValue); setBsRenaming(false) }}
                        maxLength={24}
                        className="text-[11px] font-semibold rounded px-2 py-0.5 w-28 focus:outline-none"
                        style={{ backgroundColor: '#18191c', border: '1px solid #30363d', color: '#c9d1d9' }}
                      />
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold" style={{ color: '#c9d1d9' }}>{bsUpgrades.customName || 'Battleship'}</span>
                      <button
                        onClick={() => { setBsRenameValue(bsUpgrades.customName || ''); setBsRenaming(true) }}
                        className="p-0.5 rounded transition-colors hover:bg-white/10 cursor-pointer"
                        style={{ color: '#6e7681' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>HP {bs.hp}</span>
                </div>

                <div className="flex gap-1 mb-2">
                  {['hangar', 'missiles'].map(panel => (
                    <button
                      key={panel}
                      onClick={() => setBsSubPanel(bsSubPanel === panel ? null : panel)}
                      className="flex-1 py-1 text-[9px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                      style={{
                        backgroundColor: bsSubPanel === panel ? '#1a2a3a' : '#18191c',
                        color: bsSubPanel === panel ? '#6cb4e6' : '#8b949e',
                        border: `1px solid ${bsSubPanel === panel ? '#6cb4e6' : '#30363d'}`,
                      }}
                    >
                      {panel === 'hangar' ? `Hangar (${bsHangar.length}/4)` : `Missiles`}
                    </button>
                  ))}
                </div>

                {bsSubPanel === 'hangar' && (() => {
                  const bsHangarSlots = Array.from({ length: 4 }, (_, i) => bsHangar[i] || null)
                  const mainHangar = upgrades.hangar || []
                  const bsHangarFull = bsHangar.length >= 4
                  return (
                    <div>
                      <div className="grid grid-cols-4 gap-1 mb-1.5">
                        {bsHangarSlots.map((stored, i) => {
                          const ut = stored ? (unitTypes || []).find(t => t.name === stored.typeName) : null
                          return (
                            <div
                              key={i}
                              className="rounded p-1 text-center aspect-square flex flex-col items-center justify-center"
                              style={{
                                backgroundColor: stored ? '#7060c015' : '#18191c',
                                border: `1px solid ${stored ? '#7060c050' : '#30363d'}`,
                              }}
                            >
                              {stored ? (
                                <>
                                  {ut?.icon && <img src={`/assets/${ut.icon}`} alt={stored.typeName} className="object-contain mb-0.5" style={{ width: 28, height: 28 }} />}
                                  <div className="text-[7px] font-semibold" style={{ color: '#c9d1d9' }}>{stored.typeName}</div>
                                </>
                              ) : (
                                <span className="text-[10px]" style={{ color: '#30363d' }}>&ndash;</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {!bsHangarFull && mainHangar.length > 0 && (
                        <div className="mb-1.5">
                          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#4a5568' }}>
                            Load from Hangar
                          </div>
                          <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                            {mainHangar.map((stored, i) => {
                              const ut = (unitTypes || []).find(t => t.name === stored.typeName)
                              return (
                                <button
                                  key={i}
                                  onClick={() => onLoadToBsHangar?.(unit.id, i, selectedBsSlot)}
                                  className="flex items-center justify-between p-1.5 rounded text-left transition-all cursor-pointer"
                                  style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {ut?.icon && <img src={`/assets/${ut.icon}`} alt={stored.typeName} className="w-5 h-5 object-contain" />}
                                    <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{stored.typeName}</span>
                                  </div>
                                  <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>HP {stored.hp}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {!bsHangarFull && mainHangar.length === 0 && (
                        <div className="text-[8px] mb-1" style={{ color: '#6e7681' }}>
                          No ships in main hangar to load.
                        </div>
                      )}
                    </div>
                  )
                })()}

                {bsSubPanel === 'missiles' && (
                  <div>
                    <div className="flex gap-1 mb-1.5">
                      {MISSILE_TYPES.map(m => {
                        const count = bsMissiles[m.key] || 0
                        return (
                          <div
                            key={m.key}
                            className="flex-1 rounded p-1 text-center"
                            style={{ backgroundColor: m.color + '10', border: `1px solid ${m.color}40` }}
                          >
                            <div className="text-[8px] font-semibold" style={{ color: m.color }}>{m.name}</div>
                            <div className="text-[10px] font-mono font-bold" style={{ color: '#c9d1d9' }}>{count}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-1">
                      {MISSILE_TYPES.map(m => {
                        const canAfford = teamGold >= m.cost
                        return (
                          <button
                            key={m.key}
                            onClick={() => {
                              if (!canAfford) return
                              onBuyMissileForDockedBs?.(unit.id, m.key, selectedBsSlot)
                            }}
                            disabled={!canAfford}
                            className="flex-1 py-1 text-[8px] font-semibold rounded transition-colors cursor-pointer disabled:opacity-30"
                            style={{ backgroundColor: m.color + '15', color: m.color, border: `1px solid ${m.color}40` }}
                          >
                            Buy {m.cost}g
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onDeployDockedBs?.(unit.id, selectedBsSlot)}
                  className="w-full mt-2 py-2 text-[11px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: '#1a3a1a', color: '#4ade80', border: '1px solid #2a5a2a' }}
                >
                  Deploy Battleship
                </button>
              </div>
            )
          })()}
        </>
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
                  backgroundColor: canAfford ? comp.color + '10' : '#18191c',
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
        <div className="p-2 rounded" style={{ backgroundColor: '#111214', border: `1px solid ${comp.color}40` }}>
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
            {loadingBay[selectedTransport].typeName} — Load Soldiers
          </div>

          {(loadingBay[selectedTransport].units || []).length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] mb-1" style={{ color: '#6e7681' }}>Loaded:</div>
              <div className="flex flex-col gap-0.5">
                {loadingBay[selectedTransport].units.map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1 rounded"
                    style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
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
                        style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
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
                        style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
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
                  <div className="mb-2 p-2 rounded" style={{ backgroundColor: '#111214', border: '1px solid #cca43b30' }}>
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
                              backgroundColor: '#18191c',
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

const PRODUCED_ITEMS = [
  { id: 'small_spaceship_parts', name: 'Small Spaceship Parts', color: '#a0a0a0', icon: 'parts' },
  { id: 'medium_spaceship_parts', name: 'Medium Spaceship Parts', color: '#c0c0c0', icon: 'parts' },
  { id: 'large_spaceship_parts', name: 'Large Spaceship Parts', color: '#e0d060', icon: 'parts' },
]

function InventoryPanel({ unit, upgrades, isCommandShip }) {
  const inventory = upgrades.inventory || {}
  const gemTrades = Array.isArray(upgrades.gemTrades) ? upgrades.gemTrades : []
  const allGems = Object.fromEntries(
    [...Object.values(GROUND_ORES), ...Object.values(SPACE_ORES)]
      .filter(o => o.deep)
      .map(o => [o.id, o])
  )
  const oreTable = isCommandShip ? SPACE_ORES : GROUND_ORES
  const allOres = Object.values(oreTable).filter(o => !o.deep)
  const hasProduced = PRODUCED_ITEMS.some(p => (inventory[p.id] || 0) > 0)
  const hasAny = allOres.some(o => (inventory[o.id] || 0) > 0) || hasProduced

  return (
    <div>
      {gemTrades.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#cca43b' }}>
            Active Trades — Space Guild
          </div>
          <div className="flex flex-col gap-1">
            {gemTrades.map((trade, i) => {
              const gem = allGems[trade.gem]
              return (
                <div key={i} className="flex items-center justify-between p-1.5 rounded"
                  style={{ backgroundColor: '#1a1a14', border: '1px solid #3d3d1a' }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: gem?.color || '#b9f2ff' }} />
                    <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{gem?.name || trade.gem}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold" style={{ color: '#cca43b' }}>+{trade.goldPerTurn} GOLD</span>
                    <span className="text-[9px] font-mono" style={{ color: '#6e7681' }}>{trade.turnsRemaining}t</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
        Items
      </div>
      {hasAny ? (
        <div className="flex flex-col gap-1">
          {allOres.map(ore => {
            const amount = inventory[ore.id] || 0
            if (amount === 0) return null
            return (
              <div key={ore.id} className="flex items-center justify-between p-1.5 rounded"
                style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                <div className="flex items-center gap-1.5">
                  {ore.icon === 'oil' ? (
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="#1a1a1a" stroke="#6e7681" strokeWidth="1.2">
                      <ellipse cx="8" cy="4" rx="5" ry="2" />
                      <path d="M3 4 L3 12 C3 13.5 8 15 8 15 C8 15 13 13.5 13 12 L13 4" fill="#1a1a1a" />
                      <ellipse cx="8" cy="4" rx="5" ry="2" fill="#2a2a2a" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ore.color }} />
                  )}
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{ore.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: ore.color }}>{amount}</span>
              </div>
            )
          })}
          {PRODUCED_ITEMS.map(item => {
            const amount = inventory[item.id] || 0
            if (amount === 0) return null
            return (
              <div key={item.id} className="flex items-center justify-between p-1.5 rounded"
                style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="8" cy="6" r="3" />
                    <path d="M5 9 L3 14 L8 12 L13 14 L11 9" />
                  </svg>
                  <span className="text-[10px] font-semibold" style={{ color: '#c9d1d9' }}>{item.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: item.color }}>{amount}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-2 rounded text-center" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
          <span className="text-[9px]" style={{ color: '#4a5568' }}>No items collected</span>
        </div>
      )}
    </div>
  )
}

export default function CommandShipPanel({
  unit, onClose, onUpgrade, onMove, onAttack, onBuild, onDestroy, isAdmin,
  onBuildConvoy, onLoadUnit, onLoadFromBay, onUnloadToHoldingBay, onSendConvoy, onDeployFromBay, onProduceUnit,
  onLoadCargo, onUnloadCargo, onLoadInventoryToConvoy,
  onLoadSoldier, onLoadBaySoldier, onUnloadSoldier, onUndock, onBuyAndLoadSoldier,
  onBuyMissile, onFireMissile, onProduceWarhead, missileFiredShips,
  onDeployFromHangar, onProduceToHangar, onTransferHangar, onTransferAllHangar, onDeployAllFromHangar, isDeployAllActive, onCancelDeployAll, onAddToHangar,
  onRenameUnit, onProduceBattleshipToBay, onBuyMissileForDockedBs, onRenameDockedBs, onLoadToBsHangar, onDeployDockedBs, onProduceFactoryItem,
  groundUnits, unitTypes, teamGold, playerResources, allUnits, nearbyUnits,
  onSetNumberedOverlays,
  onLevelUp, onExcavate, onClearAutoPath, onBoardTransport, onDockTransport, onDeployFromTransportUnit, economy, availableProduction, teamPlayerIds,
}) {
  const [selectedComp, setSelectedComp] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedMissile, setSelectedMissile] = useState(null)
  const [selectedWarhead, setSelectedWarhead] = useState(null)
  const [ipbmTarget, setIpbmTarget] = useState('space')
  const [ipbmRow, setIpbmRow] = useState('')
  const [ipbmCol, setIpbmCol] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const upgrades = unit.upgrades || {}
  const unitName = unit.wg_unit_types?.name || 'Command Ship'
  const compartments = getCompartments(unitName)
  const isCommandShip = unitName === 'Command Ship'

  const CONVOY_TARGETS = new Set(['Command Center', 'Command Ship', 'Battleship'])
  const tpIds = teamPlayerIds || [unit.owner_id]
  const destinations = (allUnits || [])
    .filter(u => tpIds.includes(u.owner_id) && u.id !== unit.id && CONVOY_TARGETS.has(u.wg_unit_types?.name))
    .filter(u => {
      const comps = getCompartments(u.wg_unit_types?.name)
      return comps.some(c => c.special === 'transport')
    })
    .map(u => ({ id: u.id, label: u.wg_unit_types?.name }))
  const isSpaceUnit = unit.board === 'space'
  const canTradeWithGuild = isSpaceUnit && unitName !== 'Command Center'
  const spaceGuildDest = canTradeWithGuild ? [{ id: 'space_guild', label: 'Space Guild' }] : []
  const allDestinations = [...destinations, ...spaceGuildDest]

  useEffect(() => {
    return () => onSetNumberedOverlays?.([])
  }, [])

  const comp = selectedComp ? compartments.find(c => c.id === selectedComp) : null
  const slots = comp && !comp.special ? getSlots(upgrades, comp.id, comp.slots) : []

  return (
    <div className="p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
      <div className="mb-3">
        <div className="flex justify-end mb-1">
          <button
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer"
            style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
          >
            ×
          </button>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <img
            src={isCommandShip ? `/assets/${unit.upgrades?.shipModel || 'commandship2'}.png` : unitName === 'Command Center' ? `/assets/${unit.upgrades?.ccModel || 'command center'}.png` : unit.wg_unit_types?.icon ? `/assets/${unit.wg_unit_types.icon}` : '/assets/infantry.png'}
            alt={unitName}
            className="object-contain" style={{ width: 249, height: 249, margin: '-10px 12px' }}
          />
          <div className="text-center">
            {isRenaming ? (
              <form
                onSubmit={(e) => { e.preventDefault(); onRenameUnit?.(unit.id, renameValue); setIsRenaming(false) }}
                className="flex items-center gap-1 justify-center"
              >
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => { onRenameUnit?.(unit.id, renameValue); setIsRenaming(false) }}
                  maxLength={24}
                  className="text-sm font-semibold text-center rounded px-2 py-0.5 w-36 focus:outline-none"
                  style={{ backgroundColor: '#111214', border: '1px solid #30363d', color: '#c9d1d9' }}
                />
              </form>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-sm font-semibold" style={{ color: '#c9d1d9' }}>{upgrades.customName || unitName}</span>
                {(unitName === 'Command Ship' || unitName === 'Battleship') && (
                  <button
                    onClick={() => { setRenameValue(upgrades.customName || ''); setIsRenaming(true) }}
                    className="p-0.5 rounded transition-colors hover:bg-white/10 cursor-pointer"
                    style={{ color: '#6e7681' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <div className="text-xs font-mono mt-0.5" style={{ color: '#6e7681' }}>HP {unit.current_hp}/{(() => { const name = unit.wg_unit_types?.name; const base = (name === 'Command Center' || name === 'Command Ship') ? 100 : (unit.wg_unit_types?.hp || 0); const slots = unit.upgrades?.hull || unit.upgrades?.walls || []; const maxT = Array.isArray(slots) ? Math.max(0, ...slots.filter(t => t > 0)) : 0; return base + maxT * 30 })()}</div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color: '#6e7681' }}>
              ATK {unit.wg_unit_types?.attack} | DEF {unit.wg_unit_types?.defense} | MOV {Math.max(0, (unit.wg_unit_types?.movement || 0) - (unit.moves_used || 0))}/{unit.wg_unit_types?.movement}
            </div>
          </div>
        </div>
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
          {unitName === 'Engineer' ? (
            <>
              {(isAdmin || !unit.has_attacked) && (
                <button
                  onClick={() => onBuild?.()}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: '#1a3a2a', color: '#7ee787', border: '1px solid #2a5a3a' }}
                >
                  Build
                </button>
              )}
              {(isAdmin || !unit.has_attacked) && (
                <button
                  onClick={() => onDestroy?.()}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: '#4c1a1a', color: '#f47067', border: '1px solid #6e2b2b' }}
                >
                  Destroy
                </button>
              )}
            </>
          ) : (
            (isAdmin || !unit.has_attacked) && getEffectiveAttackRange(unit) > 0 && (
              <button
                onClick={onAttack}
                className="flex-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                style={{ backgroundColor: '#4c1a1a', color: '#f47067', border: '1px solid #6e2b2b' }}
              >
                Attack
              </button>
            )
          )}
        </div>
      )}

      {unit.upgrades?.autoPath && (
        <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#111214', border: '1px solid #1a2a4a' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#6090c0' }}>
              Auto-path ({unit.upgrades.autoPath.length} tiles)
            </span>
            <button
              onClick={() => onClearAutoPath?.(unit.id)}
              className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded cursor-pointer"
              style={{ backgroundColor: '#2a1a1a', color: '#f47067', border: '1px solid #4a2a2a' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(() => {
        const canExcavate = unitName === 'Mining Station' || unitName === 'Excavator'
        if (!canExcavate) return null
        const isMining = unit.upgrades?.mining?.active
        const isMiningExhausted = unit.upgrades?.miningDisabled
        if (isMining) return (
          <div className="w-full mb-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded text-center"
            style={{ backgroundColor: '#1a2a1a', color: '#50b050', border: '1px solid #2a4a2a' }}>
            Mining — Layer {unit.upgrades.mining.layer}/120
          </div>
        )
        if (isMiningExhausted) return (
          <div className="w-full mb-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded text-center"
            style={{ backgroundColor: '#2a1a1a', color: '#8b949e', border: '1px solid #3a2a2a' }}>
            Mining Exhausted
          </div>
        )
        return (
          <button
            onClick={() => onExcavate?.(unit.id)}
            className="w-full mb-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{ backgroundColor: '#2a2a1a', color: '#cca43b', border: '1px solid #4a4a2a' }}
          >
            Start Mining
          </button>
        )
      })()}

      {unitName === 'Armor Transport' && unit.upgrades?.loadedUnits?.length > 0 && (
        <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#111214', border: '1px solid #2a3140' }}>
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#4a5568' }}>
            Loaded Units ({unit.upgrades.loadedUnits.length}/4)
          </div>
          {unit.upgrades.loadedUnits.map((lu, li) => (
            <div key={li} className="flex items-center gap-2 py-0.5">
              <span className="text-xs" style={{ color: '#c9d1d9' }}>{lu.typeName}</span>
              <span className="text-[10px] font-mono ml-auto" style={{ color: '#8b949e' }}>HP {lu.hp}</span>
            </div>
          ))}
          <button
            onClick={() => onDeployFromTransportUnit?.(unit.id)}
            className="w-full mt-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
            style={{ backgroundColor: '#1a3a2a', color: '#7ee787', border: '1px solid #2a5a3a' }}
          >
            Deploy Unit
          </button>
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
            statusText = `${totalItems} items`
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
                backgroundColor: isSelected ? c.color + '20' : '#111214',
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
        <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#111214', border: `1px solid ${comp.color}40` }}>
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
              onLoadInventoryToConvoy={onLoadInventoryToConvoy}
              groundUnits={groundUnits || []}
              comp={comp}
              isAdmin={isAdmin}
              teamGold={teamGold}
              playerResources={playerResources}
              destinations={allDestinations}
              onSetNumberedOverlays={onSetNumberedOverlays}
              availableUnitTypes={(unitTypes || []).filter(ut =>
                (ut.board || 'ground') === 'ground' &&
                ut.name !== 'Command Center' &&
                ut.name !== 'Base' &&
                ut.name !== 'Factory' &&
                ut.name !== 'Mining Station'
              )}
              unitTypes={unitTypes}
            />
          ) : comp.special === 'holding_bay' ? (
            <HoldingBayPanel
              unit={unit}
              upgrades={upgrades}
              onDeployFromBay={onDeployFromBay}
              onProduceUnit={onProduceUnit}
              comp={comp}
              unitTypes={unitTypes}
              availableProduction={availableProduction}
              isAdmin={isAdmin}
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
              onProduceBattleshipToBay={onProduceBattleshipToBay}
              onBuyMissileForDockedBs={onBuyMissileForDockedBs}
              onRenameDockedBs={onRenameDockedBs}
              onLoadToBsHangar={onLoadToBsHangar}
              onDeployDockedBs={onDeployDockedBs}
              nearbyUnits={nearbyUnits}
              comp={comp}
              unitTypes={unitTypes}
              teamGold={teamGold}
              allUnits={allUnits}
              onSetNumberedOverlays={onSetNumberedOverlays}
              isAdmin={isAdmin}
              availableProduction={availableProduction}
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
                          : isEmpty ? '#18191c' : TIERS[tier - 1].color + '15',
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
                      const isNextTier = tierLevel === currentTier + 1
                      const isLocked = tierLevel > currentTier + 1
                      const tierInfo = TIERS[tierIdx]
                      const isFree = tierLevel === 1 && currentTier === 0

                      return (
                        <button
                          key={tierIdx}
                          onClick={() => {
                            if (!isCurrentTier && isNextTier) {
                              onUpgrade(unit.id, comp.id, selectedSlot, tierLevel)
                            }
                          }}
                          disabled={isCurrentTier || isLocked}
                          className="flex items-center gap-2 p-1.5 rounded text-left transition-all"
                          style={{
                            backgroundColor: isCurrentTier ? tierInfo.color + '20' : '#18191c',
                            border: `1px solid ${isCurrentTier ? tierInfo.color + '60' : '#2a3140'}`,
                            opacity: isCurrentTier ? 0.6 : isLocked ? 0.3 : 1,
                            cursor: isCurrentTier || isLocked ? 'default' : 'pointer',
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
                            ) : isLocked ? (
                              <span className="text-[9px] font-mono" style={{ color: '#4a5568' }}>LOCKED</span>
                            ) : isFree ? (
                              <span className="text-[9px] font-mono" style={{ color: '#3fb950' }}>FREE</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {tierInfo.cost > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    <img src="/assets/iron.png" alt="Iron" className="w-3 h-3 object-contain" />
                                    <span className="text-[9px] font-mono" style={{ color: '#cca43b' }}>{tierInfo.cost}</span>
                                  </div>
                                )}
                                {tierInfo.prodCost > 0 && (
                                  <span className="text-[9px] font-mono" style={{ color: '#8b949e' }}>⚒{tierInfo.prodCost}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {comp.id === 'factory' && (() => {
                const factoryLevel = Math.max(0, ...slots.filter(s => s > 0))
                if (factoryLevel === 0) return null
                const ALL_FACTORY_ITEMS = [
                  { id: 'small_spaceship_parts', name: 'Small Spaceship Parts', baseCost: 8, icon: '🔩', tier: 1 },
                  { id: 'medium_spaceship_parts', name: 'Medium Spaceship Parts', baseCost: 14, icon: '🔩', tier: 2 },
                  { id: 'large_spaceship_parts', name: 'Large Spaceship Parts', baseCost: 22, icon: '🔩', tier: 3 },
                ]
                const ap = availableProduction ?? 0
                return (
                  <div className="mt-3">
                    <div className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: '#4a5568' }}>
                      Produce — <span className="font-mono" style={{ color: '#8b949e' }}>⚙ {ap} production</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {ALL_FACTORY_ITEMS.map(item => {
                        const unlocked = factoryLevel >= item.tier
                        const discount = 1 - 0.15 * factoryLevel
                        const cost = Math.max(1, Math.round(item.baseCost * discount))
                        const canAfford = ap >= cost
                        return (
                          <button
                            key={item.id}
                            onClick={() => { if (unlocked && canAfford) onProduceFactoryItem?.(unit.id, item.id) }}
                            disabled={!unlocked || !canAfford}
                            className="flex items-center justify-between p-1.5 rounded text-left transition-all cursor-pointer disabled:opacity-30"
                            style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{item.icon}</span>
                              <span className="text-[10px] font-semibold" style={{ color: unlocked ? '#c9d1d9' : '#4a5568' }}>{item.name}</span>
                            </div>
                            {unlocked ? (
                              <span className="text-[9px] font-mono" style={{ color: canAfford ? '#60b060' : '#e05050' }}>{cost}⚙</span>
                            ) : (
                              <span className="text-[9px] font-mono" style={{ color: '#4a5568' }}>T{item.tier}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    <div className="text-[8px] mt-1" style={{ color: '#6e7681' }}>
                      Produced items are stored in Inventory. Cost reduced 15% per tier.
                    </div>
                  </div>
                )
              })()}

              {comp.id === 'missiles' && (() => {
                const munitions = upgrades.munitions || { tactical: 0, cruise: 0, ipbm: 0 }
                const missileLevel = slots[0] || 0
                const MISSILE_TYPES = [
                  { key: 'tactical', name: 'Tactical', color: '#8b949e', cost: 5, reqLevel: 1, range: 6 },
                  { key: 'cruise', name: 'Cruise', color: '#3fb950', cost: 10, reqLevel: 2, range: 11 },
                  { key: 'ipbm', name: 'IPBM', color: '#d29922', cost: 20, reqLevel: 3, range: '∞' },
                ]
                const selMissile = MISSILE_TYPES.find(m => m.key === selectedMissile)
                const ipbmWarhead = selectedMissile === 'ipbm' ? selectedWarhead : null
                const needsWarhead = selectedMissile === 'ipbm' && ipbmWarhead && (munitions[ipbmWarhead] || 0) <= 0
                const canFire = selMissile && (munitions[selMissile.key] || 0) > 0 && !missileFiredShips?.has(unit.id) && !needsWarhead
                const isIpbmGround = selectedMissile === 'ipbm' && ipbmTarget === 'ground'
                const whInfo = ipbmWarhead ? WARHEAD_TYPES[ipbmWarhead] : null

                return (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        if (!canFire) return
                        if (isIpbmGround) {
                          const r = parseInt(ipbmRow, 10)
                          const c = parseInt(ipbmCol, 10)
                          if (isNaN(r) || isNaN(c)) return
                          onFireMissile(unit.id, selectedMissile, r, c, 'ground', ipbmWarhead || undefined)
                          setSelectedMissile(null)
                          setSelectedWarhead(null)
                          setIpbmRow('')
                          setIpbmCol('')
                        } else {
                          onFireMissile(unit.id, selectedMissile, null, null, 'space', ipbmWarhead || undefined)
                          setSelectedMissile(null)
                          setSelectedWarhead(null)
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
                      {missileFiredShips?.has(unit.id)
                        ? 'Missile Fired'
                        : canFire
                        ? isIpbmGround ? `Launch${whInfo ? ' ' + whInfo.name : ''} IPBM (Strikes Next Turn)` : `Fire${whInfo ? ' ' + whInfo.name : ''} Missile — Select Target`
                        : 'Fire Missile'}
                    </button>

                    {selectedMissile === 'ipbm' && (
                      <div className="mb-3 p-2 rounded" style={{ backgroundColor: '#111214', border: '1px solid #d2992240' }}>
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
                                style={{ backgroundColor: '#18191c', color: '#c9d1d9', border: '1px solid #30363d', outline: 'none' }}
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
                                style={{ backgroundColor: '#18191c', color: '#c9d1d9', border: '1px solid #30363d', outline: 'none' }}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}
                        {ipbmTarget === 'space' && (
                          <div className="text-[9px]" style={{ color: '#6e7681' }}>Click Fire then select target on space board</div>
                        )}

                        <div className="text-[9px] uppercase tracking-widest font-semibold mt-2 mb-1" style={{ color: '#d29922' }}>
                          Warhead
                        </div>
                        <select
                          value={selectedWarhead || ''}
                          onChange={e => setSelectedWarhead(e.target.value || null)}
                          className="w-full px-2 py-1.5 rounded text-[11px] font-semibold mb-2 cursor-pointer"
                          style={{ backgroundColor: '#18191c', color: '#c9d1d9', border: '1px solid #30363d', outline: 'none' }}
                        >
                          <option value="">None (Standard)</option>
                          {Object.entries(WARHEAD_TYPES).map(([key, wh]) => (
                            <option key={key} value={key} disabled={(munitions[key] || 0) <= 0}>
                              {wh.name} ({munitions[key] || 0} available) — {wh.damage} DMG / {wh.radius} tile radius
                            </option>
                          ))}
                        </select>

                        <div className="text-[8px] mt-1" style={{ color: '#6e7681' }}>
                          {whInfo
                            ? `DMG: ${whInfo.damage} flat · ${whInfo.radius} tile radius · Hits all units`
                            : 'DMG: 20 center · 10 adjacent · 5 outer ring'}
                        </div>

                        <div className="flex gap-1.5 mt-2">
                          {Object.entries(WARHEAD_TYPES).map(([key, wh]) => (
                            <button
                              key={key}
                              onClick={() => onProduceWarhead(unit.id, key)}
                              disabled={!isAdmin && teamGold < wh.cost}
                              className="flex-1 py-1 text-[9px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                              style={{
                                backgroundColor: '#e0505018',
                                color: '#e05050',
                                border: '1px solid #e0505040',
                              }}
                            >
                              Produce {wh.name} ({wh.cost}g)
                            </button>
                          ))}
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
                              if (!locked && count > 0) {
                                setSelectedMissile(isSelected ? null : m.key)
                                if (m.key !== 'ipbm') setSelectedWarhead(null)
                              }
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
                                    backgroundColor: !locked && i < count ? m.color : '#1e2023',
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
