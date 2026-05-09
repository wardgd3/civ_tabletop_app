import { useState } from 'react'

const COMMAND_SHIP_COMPARTMENTS = [
  {
    id: 'reactor',
    name: 'Reactor Core',
    description: 'Powers all ship systems. Higher levels increase energy output.',
    icon: '⚛',
    color: '#e6a020',
    upgrades: [
      'Basic fission reactor',
      'Enhanced fission reactor',
      'Fusion reactor online',
      'Advanced fusion core',
      'Quantum reactor core',
      'Maximum output achieved',
    ],
  },
  {
    id: 'shields',
    name: 'Shields',
    description: 'Protects the ship from damage. Higher levels increase durability.',
    icon: '⛨',
    color: '#40a0e0',
    upgrades: [
      'Basic deflector array',
      'Reinforced shielding',
      'Layered barrier system',
      'Adaptive shield matrix',
      'Quantum phase shields',
      'Maximum shielding achieved',
    ],
  },
  {
    id: 'factory',
    name: 'Factory',
    description: 'Manufactures units. Higher levels reduce production costs.',
    icon: '⚒',
    color: '#60b060',
    upgrades: [
      'Basic assembly line',
      'Automated fabrication',
      'Nano-assembly systems',
      'Molecular forge',
      'Quantum replicator',
      'Maximum production achieved',
    ],
  },
  {
    id: 'cannon',
    name: 'Cannon',
    description: 'Primary weapon system. Higher levels increase firepower.',
    icon: '☄',
    color: '#e05050',
    upgrades: [
      'Basic railgun turret',
      'Enhanced kinetic driver',
      'Plasma cannon array',
      'Heavy particle beam',
      'Antimatter cannon',
      'Maximum firepower achieved',
    ],
  },
]

const COMMAND_CENTER_COMPARTMENTS = [
  {
    id: 'shields',
    name: 'Shields',
    description: 'Defensive barrier around the base. Higher levels absorb more damage.',
    icon: '⛨',
    color: '#40a0e0',
    upgrades: [
      'Basic perimeter barrier',
      'Reinforced energy shield',
      'Layered defense grid',
      'Adaptive shield network',
      'Quantum barrier array',
      'Maximum shielding achieved',
    ],
  },
  {
    id: 'cannon',
    name: 'Cannons',
    description: 'Base defense turrets. Higher levels increase range and firepower.',
    icon: '☄',
    color: '#e05050',
    upgrades: [
      'Basic turret emplacement',
      'Twin-linked autocannon',
      'Gatling defense battery',
      'Heavy plasma turrets',
      'Orbital strike cannon',
      'Maximum firepower achieved',
    ],
  },
  {
    id: 'iron_dome',
    name: 'Iron Dome',
    description: 'Anti-projectile defense system. Higher levels intercept more threats.',
    icon: '⊛',
    color: '#60b060',
    upgrades: [
      'Basic interceptor array',
      'Enhanced tracking system',
      'Multi-target interception',
      'Advanced countermeasures',
      'Total coverage dome',
      'Maximum interception achieved',
    ],
  },
  {
    id: 'reactor',
    name: 'Reactor Core',
    description: 'Powers all base systems. Higher levels increase energy output.',
    icon: '⚛',
    color: '#e6a020',
    upgrades: [
      'Basic generator',
      'Enhanced power grid',
      'Fusion reactor online',
      'Advanced fusion core',
      'Quantum power plant',
      'Maximum output achieved',
    ],
  },
]

const UPGRADE_COST = { resource: 'iron', amount: 10 }
const MAX_LEVEL = 5

export function getCompartments(unitName) {
  if (unitName === 'Command Ship') return COMMAND_SHIP_COMPARTMENTS
  if (unitName === 'Command Center') return COMMAND_CENTER_COMPARTMENTS
  return []
}

export default function CommandShipPanel({ unit, onClose, onUpgrade, onMove, isAdmin }) {
  const [selectedComp, setSelectedComp] = useState(null)
  const upgrades = unit.upgrades || {}
  const unitName = unit.wg_unit_types?.name || 'Command Ship'
  const compartments = getCompartments(unitName)
  const isCommandShip = unitName === 'Command Ship'

  const comp = selectedComp ? compartments.find(c => c.id === selectedComp) : null
  const compLevel = comp ? (upgrades[comp.id] || 0) : 0

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
          const level = upgrades[c.id] || 0
          const isSelected = selectedComp === c.id
          return (
            <button
              key={c.id}
              onClick={() => setSelectedComp(isSelected ? null : c.id)}
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
              <div className="flex gap-0.5">
                {Array.from({ length: MAX_LEVEL }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full"
                    style={{
                      backgroundColor: i < level ? c.color : '#21262d',
                      border: `1px solid ${i < level ? c.color : '#30363d'}`,
                    }}
                  />
                ))}
              </div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: '#6e7681' }}>
                Lv {level}/{MAX_LEVEL}
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
          <div className="text-[10px] mb-1.5" style={{ color: '#8b949e' }}>{comp.description}</div>
          <div className="text-[10px] font-mono mb-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#161b22', color: '#6e7681' }}>
            {comp.upgrades[compLevel]}
          </div>
          {compLevel < MAX_LEVEL ? (
            <>
              <div className="flex items-center gap-1.5 mb-1.5">
                <img src="/assets/iron.png" alt="Iron" className="w-3.5 h-3.5 object-contain" />
                <span className="text-[10px] font-mono" style={{ color: '#cca43b' }}>
                  {UPGRADE_COST.amount} Iron
                </span>
              </div>
              <button
                onClick={() => onUpgrade(unit.id, comp.id)}
                className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                style={{
                  backgroundColor: comp.color + '20',
                  color: comp.color,
                  border: `1px solid ${comp.color}40`,
                }}
              >
                Upgrade to Lv {compLevel + 1}
              </button>
            </>
          ) : (
            <div className="text-[10px] font-semibold text-center py-1" style={{ color: comp.color }}>
              MAX LEVEL
            </div>
          )}
        </div>
      )}
    </div>
  )
}
