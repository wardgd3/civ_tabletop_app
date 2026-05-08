import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

    const dist = Math.abs(unit.grid_row - newRow) + Math.abs(unit.grid_col - newCol)
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

    const dist = Math.abs(attacker.grid_row - target.grid_row) + Math.abs(attacker.grid_col - target.grid_col)
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
