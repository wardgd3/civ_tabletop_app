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
  const [mode, setMode] = useState('select') // select | deploy | move | attack
  const [error, setError] = useState(null)

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
        } else {
          setSelectedUnit(null)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Sidebar */}
      <div className="lg:w-64 shrink-0 space-y-4">
        {/* Turn info */}
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-400">Turn {game.turn_number}</div>
          <div className="text-white font-semibold">
            {isMyTurn ? 'Your turn' : `Waiting for ${players.find(p => p.player_id === game.current_player_id)?.wg_profiles?.display_name}`}
          </div>
        </div>

        {/* Player info */}
        <div className="p-3 bg-gray-800 rounded-lg">
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
            <div className="text-sm text-gray-400 mb-1">Actions</div>

            {selectedUnit && (
              <div className="text-xs text-gray-300 p-2 bg-gray-700 rounded mb-2">
                <div className="font-semibold">{selectedUnit.wg_unit_types?.name}</div>
                <div>HP: {selectedUnit.current_hp}/{selectedUnit.wg_unit_types?.hp}</div>
                <div>ATK: {selectedUnit.wg_unit_types?.attack} DEF: {selectedUnit.wg_unit_types?.defense}</div>
                <div className="flex gap-1 mt-1">
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
            )}

            <button
              onClick={() => { setMode('deploy'); setSelectedUnit(null) }}
              className={`w-full px-3 py-1.5 text-sm rounded-lg transition-colors ${mode === 'deploy' ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            >
              Deploy Unit
            </button>

            <button
              onClick={async () => {
                try { await endTurn() } catch (err) { setError(err.message) }
              }}
              className="w-full px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              End Turn
            </button>
          </div>
        )}

        {/* Unit shop */}
        {mode === 'deploy' && isMyTurn && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Select unit to deploy (Gold: {currentPlayer?.gold})</div>
            <div className="space-y-1">
              {unitTypes.map(ut => (
                <button
                  key={ut.id}
                  onClick={() => setSelectedUnitType(ut.id)}
                  disabled={currentPlayer?.gold < ut.cost}
                  className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
                    selectedUnitType === ut.id
                      ? 'bg-green-600/30 border border-green-500'
                      : 'bg-gray-700 hover:bg-gray-600 disabled:opacity-30'
                  } text-white`}
                >
                  <span>{UNIT_ICONS[ut.icon] || ''} {ut.name}</span>
                  <span className="text-yellow-400">{ut.cost}g</span>
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

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div
          className="inline-grid gap-px bg-gray-700 border border-gray-600 rounded-lg overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(2.5rem, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(2.5rem, 1fr))`,
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
                className={`${bgClass} hover:bg-gray-700/80 flex items-center justify-center relative transition-colors`}
                style={{ minWidth: '2.5rem', minHeight: '2.5rem' }}
                title={unit ? `${unit.wg_unit_types?.name} (HP: ${unit.current_hp}/${unit.wg_unit_types?.hp})` : `${row},${col}`}
              >
                {unit && (
                  <div className="relative">
                    <span className="text-lg" style={{ filter: `drop-shadow(0 0 2px ${getPlayerColor(unit.owner_id)})` }}>
                      {UNIT_ICONS[unit.wg_unit_types?.icon] || '⚔️'}
                    </span>
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 rounded-full"
                      style={{
                        width: `${(unit.current_hp / unit.wg_unit_types?.hp) * 100}%`,
                        backgroundColor: unit.current_hp / unit.wg_unit_types?.hp > 0.5 ? '#22c55e' : '#ef4444',
                        minWidth: '4px',
                        maxWidth: '24px',
                      }}
                    />
                    <div
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-800"
                      style={{ backgroundColor: getPlayerColor(unit.owner_id) }}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
