import { useState } from 'react'

const UNIT_ICONS = {
  sword: '⚔️',
  bow: '🏹',
  horse: '🏇',
  catapult: '💣',
  eye: '👁️',
  shield: '🛡️',
  wand: '🪄',
  crown: '👑',
}

export default function GameBoard({
  game, players, units, unitTypes, currentPlayer, isMyTurn,
  deployUnit, moveUnit, attackUnit, endTurn,
}) {
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedUnitType, setSelectedUnitType] = useState(null)
  const [mode, setMode] = useState('select')
  const [error, setError] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const rows = game.grid_rows
  const cols = game.grid_cols

  function getUnitAt(row, col) {
    return units.find(u => u.grid_row === row && u.grid_col === col)
  }

  function getPlayerColor(playerId) {
    return players.find(p => p.player_id === playerId)?.color || '#888'
  }

  function getMoveRange(unit) {
    if (!unit?.wg_unit_types) return []
    const cells = []
    const range = unit.wg_unit_types.movement
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.abs(unit.grid_row - r) + Math.abs(unit.grid_col - c)
        if (dist > 0 && dist <= range && !getUnitAt(r, c)) {
          cells.push(`${r}-${c}`)
        }
      }
    }
    return cells
  }

  function getAttackRange(unit) {
    if (!unit?.wg_unit_types) return []
    const cells = []
    const range = unit.wg_unit_types.attack_range
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.abs(unit.grid_row - r) + Math.abs(unit.grid_col - c)
        const target = getUnitAt(r, c)
        if (dist > 0 && dist <= range && target && target.owner_id !== currentPlayer?.player_id) {
          cells.push(`${r}-${c}`)
        }
      }
    }
    return cells
  }

  const moveRange = mode === 'move' && selectedUnit ? getMoveRange(selectedUnit) : []
  const attackRange = mode === 'attack' && selectedUnit ? getAttackRange(selectedUnit) : []

  async function handleCellClick(row, col) {
    setError(null)

    if (!isMyTurn) {
      setError("It's not your turn")
      return
    }

    try {
      if (mode === 'deploy' && selectedUnitType) {
        await deployUnit(selectedUnitType, row, col)
        setMode('select')
        setSelectedUnitType(null)
      } else if (mode === 'move' && selectedUnit) {
        await moveUnit(selectedUnit.id, row, col)
        setSelectedUnit(null)
        setMode('select')
      } else if (mode === 'attack' && selectedUnit) {
        const target = getUnitAt(row, col)
        if (target && target.owner_id !== currentPlayer?.player_id) {
          await attackUnit(selectedUnit.id, target.id)
          setSelectedUnit(null)
          setMode('select')
        }
      } else {
        const unit = getUnitAt(row, col)
        if (unit && unit.owner_id === currentPlayer?.player_id) {
          setSelectedUnit(unit)
          setMode('select')
          setPanelOpen(true)
        } else {
          setSelectedUnit(null)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const sidebarContent = (
    <div className="space-y-3">
      {/* Turn info */}
      <div className="p-3 bg-gray-800 rounded-lg flex items-center justify-between lg:block">
        <div>
          <div className="text-xs text-gray-400">Turn {game.turn_number}</div>
          <div className="text-white font-semibold text-sm">
            {isMyTurn ? 'Your turn' : `Waiting for ${players.find(p => p.player_id === game.current_player_id)?.wg_profiles?.display_name}`}
          </div>
        </div>
        {/* Mobile player gold */}
        <div className="flex gap-3 lg:hidden">
          {players.map(p => (
            <div key={p.player_id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-yellow-400">{p.gold}g</span>
            </div>
          ))}
        </div>
      </div>

      {/* Player info - hidden on mobile, shown in sidebar on desktop */}
      <div className="hidden lg:block p-3 bg-gray-800 rounded-lg">
        <div className="text-sm text-gray-400 mb-2">Players</div>
        {players.map(p => (
          <div
            key={p.player_id}
            className={`flex items-center justify-between py-1 ${p.player_id === game.current_player_id ? 'text-white' : 'text-gray-500'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-sm">{p.wg_profiles?.display_name}</span>
            </div>
            <span className="text-sm text-yellow-400">{p.gold}g</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {isMyTurn && (
        <div className="p-3 bg-gray-800 rounded-lg space-y-2">
          {selectedUnit && (
            <div className="text-xs text-gray-300 p-2 bg-gray-700 rounded mb-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{selectedUnit.wg_unit_types?.name}</span>
                <span>HP: {selectedUnit.current_hp}/{selectedUnit.wg_unit_types?.hp}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>ATK: {selectedUnit.wg_unit_types?.attack} DEF: {selectedUnit.wg_unit_types?.defense}</span>
                <div className="flex gap-1">
                  {!selectedUnit.has_moved && (
                    <button onClick={() => setMode('move')} className={`px-2 py-0.5 text-xs rounded ${mode === 'move' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'} text-white`}>
                      Move
                    </button>
                  )}
                  {!selectedUnit.has_attacked && (
                    <button onClick={() => setMode('attack')} className={`px-2 py-0.5 text-xs rounded ${mode === 'attack' ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'} text-white`}>
                      Attack
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 lg:flex-col">
            <button
              onClick={() => { setMode('deploy'); setSelectedUnit(null) }}
              className={`flex-1 lg:w-full px-3 py-2 lg:py-1.5 text-sm rounded-lg transition-colors ${mode === 'deploy' ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            >
              Deploy
            </button>

            <button
              onClick={async () => {
                try { await endTurn() } catch (err) { setError(err.message) }
              }}
              className="flex-1 lg:w-full px-3 py-2 lg:py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              End Turn
            </button>
          </div>
        </div>
      )}

      {/* Unit shop */}
      {mode === 'deploy' && isMyTurn && (
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">Deploy unit (Gold: {currentPlayer?.gold})</div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
            {unitTypes.map(ut => (
              <button
                key={ut.id}
                onClick={() => setSelectedUnitType(ut.id)}
                disabled={currentPlayer?.gold < ut.cost}
                className={`flex items-center justify-between p-2 rounded text-sm transition-colors ${
                  selectedUnitType === ut.id
                    ? 'bg-green-600/30 border border-green-500'
                    : 'bg-gray-700 hover:bg-gray-600 disabled:opacity-30'
                } text-white`}
              >
                <span className="truncate">{UNIT_ICONS[ut.icon] || ''} {ut.name}</span>
                <span className="text-yellow-400 ml-1 shrink-0">{ut.cost}g</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 h-full">
      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:w-64 shrink-0">
        {sidebarContent}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto touch-pan-x touch-pan-y">
        <div
          className="inline-grid gap-px bg-gray-700 border border-gray-600 rounded-lg overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(1.75rem, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(1.75rem, 1fr))`,
          }}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const row = Math.floor(i / cols)
            const col = i % cols
            const unit = getUnitAt(row, col)
            const cellKey = `${row}-${col}`
            const isInMoveRange = moveRange.includes(cellKey)
            const isInAttackRange = attackRange.includes(cellKey)
            const isSelected = selectedUnit && selectedUnit.grid_row === row && selectedUnit.grid_col === col

            let bgClass = 'bg-gray-800'
            if (isSelected) bgClass = 'bg-blue-900/60'
            else if (isInMoveRange) bgClass = 'bg-blue-600/20'
            else if (isInAttackRange) bgClass = 'bg-red-600/20'

            return (
              <button
                key={cellKey}
                onClick={() => handleCellClick(row, col)}
                className={`${bgClass} hover:bg-gray-700/80 active:bg-gray-600/80 flex items-center justify-center relative transition-colors`}
                style={{ minWidth: '1.75rem', minHeight: '1.75rem' }}
              >
                {unit && (
                  <div className="relative">
                    <span className="text-sm sm:text-lg" style={{ filter: `drop-shadow(0 0 2px ${getPlayerColor(unit.owner_id)})` }}>
                      {UNIT_ICONS[unit.wg_unit_types?.icon] || '⚔️'}
                    </span>
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 sm:h-1 rounded-full"
                      style={{
                        width: `${(unit.current_hp / unit.wg_unit_types?.hp) * 100}%`,
                        backgroundColor: unit.current_hp / unit.wg_unit_types?.hp > 0.5 ? '#22c55e' : '#ef4444',
                        minWidth: '4px',
                        maxWidth: '24px',
                      }}
                    />
                    <div
                      className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-gray-800"
                      style={{ backgroundColor: getPlayerColor(unit.owner_id) }}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile bottom panel */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 border-t border-gray-700 text-gray-300 text-sm"
        >
          <span>{panelOpen ? 'Hide' : 'Show'} Controls</span>
          <span className={`transition-transform ${panelOpen ? 'rotate-180' : ''}`}>▲</span>
        </button>
        {panelOpen && (
          <div className="bg-gray-900 border-t border-gray-700 p-3 max-h-[50vh] overflow-y-auto">
            {sidebarContent}
          </div>
        )}
      </div>
    </div>
  )
}
