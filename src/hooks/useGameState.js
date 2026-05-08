import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function hexDistance(r1, c1, r2, c2) {
  const q1 = c1 - ((r1 - (r1 & 1)) >> 1)
  const q2 = c2 - ((r2 - (r2 & 1)) >> 1)
  const s1 = -q1 - r1
  const s2 = -q2 - r2
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2))
}

export function useGameState(gameId) {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [game, setGame] = useState(null)
  const [players, setPlayers] = useState([])
  const [units, setUnits] = useState([])
  const [unitTypes, setUnitTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(0)
  const debounceRef = useRef(null)

  const currentPlayer = players.find(p => p.player_id === userId)
  const isMyTurn = game?.current_player_id === userId

  const fetchAll = useCallback(async () => {
    if (!gameId) return
    const fetchId = ++fetchRef.current

    const [gameRes, playersRes, unitsRes, typesRes] = await Promise.all([
      supabase.from('wg_games').select('*').eq('id', gameId).single(),
      supabase.from('wg_game_players').select('*, wg_profiles(display_name)').eq('game_id', gameId).order('player_order'),
      supabase.from('wg_units').select('*, wg_unit_types(*)').eq('game_id', gameId).eq('is_alive', true),
      supabase.from('wg_unit_types').select('*'),
    ])

    if (fetchRef.current !== fetchId) return

    if (gameRes.data) setGame(gameRes.data)
    if (playersRes.data) setPlayers(playersRes.data)
    if (unitsRes.data) setUnits(unitsRes.data)
    if (typesRes.data) setUnitTypes(typesRes.data)
    setLoading(false)
  }, [gameId])

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchAll(), 300)
  }, [fetchAll])

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wg_games', filter: `id=eq.${gameId}` }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wg_units', filter: `game_id=eq.${gameId}` }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wg_game_players', filter: `game_id=eq.${gameId}` }, debouncedFetch)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [gameId, fetchAll, debouncedFetch])

  async function deployUnit(unitTypeId, row, col) {
    const unitType = unitTypes.find(t => t.id === unitTypeId)
    if (!unitType || !currentPlayer) throw new Error('Invalid deployment')
    if (currentPlayer.gold < unitType.cost) throw new Error('Not enough gold')

    const occupied = units.find(u => u.grid_row === row && u.grid_col === col)
    if (occupied) throw new Error('Cell is occupied')

    const myCC = units.find(u => u.owner_id === userId && u.wg_unit_types?.name === 'Command Center')
    const myBases = units.filter(u => u.owner_id === userId && u.wg_unit_types?.name === 'Base')
    const myStructures = myCC ? [myCC, ...myBases] : []

    function distToNearest(r, c, structs) {
      let min = Infinity
      for (const s of structs) {
        const d = hexDistance(s.grid_row, s.grid_col, r, c)
        if (d < min) min = d
      }
      return min
    }

    if (unitType.name === 'Command Center') {
      if (myCC) throw new Error('Only one Command Center allowed')
      const isEdge = row === 0 || row === game.grid_rows - 1 || col === 0 || col === game.grid_cols - 1
      if (!isEdge) throw new Error('Command Center must be on an edge or corner')
      const enemyCCs = units.filter(u => u.owner_id !== userId && u.wg_unit_types?.name === 'Command Center')
      const tooClose = enemyCCs.some(cc => hexDistance(cc.grid_row, cc.grid_col, row, col) < 20)
      if (tooClose) throw new Error('Too close to enemy Command Center (min 20 tiles)')
    } else if (unitType.name === 'Base') {
      if (!myCC) throw new Error('Deploy a Command Center first')
      const dist = distToNearest(row, col, myStructures)
      if (dist > 4) throw new Error('Base must be within 4 tiles of Command Center or another Base')
    } else {
      if (!myCC) throw new Error('Deploy a Command Center first')
      const dist = distToNearest(row, col, myStructures)
      if (dist > unitType.movement) throw new Error('Too far from Command Center or Base')
    }

    const { error: unitError } = await supabase.from('wg_units').insert({
      game_id: gameId,
      owner_id: userId,
      unit_type_id: unitTypeId,
      grid_row: row,
      grid_col: col,
      current_hp: unitType.hp,
    })
    if (unitError) throw unitError

    const { error: goldError } = await supabase
      .from('wg_game_players')
      .update({ gold: currentPlayer.gold - unitType.cost })
      .eq('id', currentPlayer.id)
    if (goldError) throw goldError

    await fetchAll()
  }

  async function moveUnit(unitId, newRow, newCol) {
    const unit = units.find(u => u.id === unitId)
    if (!unit || unit.owner_id !== userId) throw new Error('Not your unit')
    if (unit.has_moved) throw new Error('Unit already moved')

    const dist = hexDistance(unit.grid_row, unit.grid_col, newRow, newCol)
    if (dist > unit.wg_unit_types.movement) throw new Error('Too far')

    const occupied = units.find(u => u.grid_row === newRow && u.grid_col === newCol && u.id !== unitId)
    if (occupied) throw new Error('Cell is occupied')

    const { error } = await supabase
      .from('wg_units')
      .update({ grid_row: newRow, grid_col: newCol, has_moved: true })
      .eq('id', unitId)
    if (error) throw error

    await fetchAll()
  }

  async function attackUnit(attackerId, targetId) {
    const attacker = units.find(u => u.id === attackerId)
    const target = units.find(u => u.id === targetId)
    if (!attacker || !target) throw new Error('Invalid attack')
    if (attacker.owner_id !== userId) throw new Error('Not your unit')
    if (attacker.has_attacked) throw new Error('Unit already attacked')
    if (target.owner_id === userId) throw new Error("Can't attack your own unit")

    const dist = hexDistance(attacker.grid_row, attacker.grid_col, target.grid_row, target.grid_col)
    if (dist > attacker.wg_unit_types.attack_range) throw new Error('Out of range')

    const damage = Math.max(1, attacker.wg_unit_types.attack - target.wg_unit_types.defense)
    const newHp = target.current_hp - damage

    if (newHp <= 0) {
      const { error } = await supabase.from('wg_units').update({ current_hp: 0, is_alive: false }).eq('id', targetId)
      if (error) throw error
    } else {
      const { error } = await supabase.from('wg_units').update({ current_hp: newHp }).eq('id', targetId)
      if (error) throw error
    }

    const { error: atkError } = await supabase.from('wg_units').update({ has_attacked: true }).eq('id', attackerId)
    if (atkError) throw atkError

    await fetchAll()
  }

  async function endTurn() {
    if (!isMyTurn) throw new Error('Not your turn')

    const activePlayers = players.filter(p => !p.is_eliminated)
    const currentIdx = activePlayers.findIndex(p => p.player_id === userId)
    const nextIdx = (currentIdx + 1) % activePlayers.length
    const nextPlayer = activePlayers[nextIdx]
    const isNewRound = nextIdx <= currentIdx
    const newTurnNumber = isNewRound ? game.turn_number + 1 : game.turn_number

    // Reset the NEXT player's units so they can act on their turn
    const nextPlayerUnits = units.filter(u => u.owner_id === nextPlayer.player_id)
    if (nextPlayerUnits.length > 0) {
      const { error } = await supabase
        .from('wg_units')
        .update({ has_moved: false, has_attacked: false })
        .in('id', nextPlayerUnits.map(u => u.id))
      if (error) throw error
    }

    // Re-fetch next player's gold to avoid stale value
    const { data: freshPlayer, error: fetchError } = await supabase
      .from('wg_game_players')
      .select('gold')
      .eq('id', nextPlayer.id)
      .single()
    if (fetchError) throw fetchError

    const { error: goldError } = await supabase
      .from('wg_game_players')
      .update({ gold: freshPlayer.gold + 3 })
      .eq('id', nextPlayer.id)
    if (goldError) throw goldError

    const { error: turnError } = await supabase.from('wg_turns').insert({
      game_id: gameId,
      player_id: userId,
      turn_number: game.turn_number,
    })
    if (turnError) throw turnError

    const { error: gameError } = await supabase
      .from('wg_games')
      .update({ current_player_id: nextPlayer.player_id, turn_number: newTurnNumber })
      .eq('id', gameId)
    if (gameError) throw gameError

    await fetchAll()
  }

  return {
    game, players, units, unitTypes, loading,
    currentPlayer, isMyTurn,
    deployUnit, moveUnit, attackUnit, endTurn,
    refresh: fetchAll,
  }
}
