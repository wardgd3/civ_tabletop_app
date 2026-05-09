import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LUXURY_RESOURCES } from '../lib/terrainGen'

const LUXURY_BY_ID = Object.fromEntries(Object.values(LUXURY_RESOURCES).map(r => [r.id, r]))

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
  const [tiles, setTiles] = useState([])
  const [discoveredTiles, setDiscoveredTiles] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(0)
  const debounceRef = useRef(null)

  const currentPlayer = players.find(p => p.player_id === userId)
  const myColor = currentPlayer?.color
  const isMyTurn = game?.current_team_color
    ? game.current_team_color === myColor && !currentPlayer?.has_ended_turn
    : game?.current_player_id === userId
  const isAdmin = !!game?.is_admin

  const economy = (() => {
    if (!currentPlayer) return { production: 0, upkeep: 0, luxuryIncome: 0, net: 0 }
    const teamPlayerIds = players.filter(p => p.color === myColor).map(p => p.player_id)
    const teamUnits = units.filter(u => teamPlayerIds.includes(u.owner_id))
    const ccCount = teamUnits.filter(u =>
      u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'
    ).length
    const baseCount = teamUnits.filter(u => u.wg_unit_types?.name === 'Base').length
    const factoryCount = teamUnits.filter(u => u.wg_unit_types?.name === 'Factory').length
    const teamResources = currentPlayer.resources || {}
    const coalAvailable = teamResources.coal || 0
    const activeFactories = Math.min(factoryCount, coalAvailable)
    const production = (ccCount * 4) + (baseCount * 2) + activeFactories
    const upkeep = teamUnits.length
    let luxuryIncome = 0
    for (const [resId, amount] of Object.entries(teamResources)) {
      const lux = LUXURY_BY_ID[resId]
      if (lux) luxuryIncome += lux.yield
    }
    return { production, upkeep, luxuryIncome, net: production + luxuryIncome - upkeep }
  })()
  const productionPerTurn = economy.production

  const fetchAll = useCallback(async () => {
    if (!gameId || !userId) return
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

    const allTiles = []
    let tileOffset = 0
    const PAGE = 1000
    while (true) {
      const { data } = await supabase.from('wg_game_tiles').select('*').eq('game_id', gameId).range(tileOffset, tileOffset + PAGE - 1)
      if (!data || data.length === 0) break
      allTiles.push(...data)
      if (data.length < PAGE) break
      tileOffset += PAGE
    }
    setTiles(allTiles)

    const allDiscovered = []
    let discOffset = 0
    while (true) {
      const { data } = await supabase.from('wg_discovered_tiles').select('grid_row, grid_col, board').eq('game_id', gameId).eq('player_id', userId).range(discOffset, discOffset + PAGE - 1)
      if (!data || data.length === 0) break
      allDiscovered.push(...data)
      if (data.length < PAGE) break
      discOffset += PAGE
    }
    setDiscoveredTiles(prev => {
      if (allDiscovered.length === 0) return prev
      const next = new Set(prev)
      for (const d of allDiscovered) next.add(`${d.board || 'ground'}-${d.grid_row}-${d.grid_col}`)
      return next
    })
    setLoading(false)
  }, [gameId, userId])

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

  const persistDiscoveryRef = useRef(new Set())

  const persistDiscoveredTiles = useCallback(async (newKeys) => {
    if (!gameId || !userId || newKeys.length === 0) return
    const toInsert = newKeys
      .filter(k => !persistDiscoveryRef.current.has(k))
      .map(k => {
        const parts = k.split('-')
        if (parts.length === 3) {
          return { game_id: gameId, player_id: userId, board: parts[0], grid_row: Number(parts[1]), grid_col: Number(parts[2]) }
        }
        return { game_id: gameId, player_id: userId, board: 'ground', grid_row: Number(parts[0]), grid_col: Number(parts[1]) }
      })
    if (toInsert.length === 0) return
    for (const k of newKeys) persistDiscoveryRef.current.add(k)
    const BATCH = 500
    for (let i = 0; i < toInsert.length; i += BATCH) {
      await supabase.from('wg_discovered_tiles').upsert(toInsert.slice(i, i + BATCH), { onConflict: 'game_id,player_id,grid_row,grid_col' })
    }
  }, [gameId, userId])

  async function deployUnit(unitTypeId, row, col) {
    const unitType = unitTypes.find(t => t.id === unitTypeId)
    if (!unitType || !currentPlayer) throw new Error('Invalid deployment')
    if (!isAdmin && currentPlayer.gold < unitType.cost) throw new Error('Not enough production')

    const occupied = units.find(u => u.grid_row === row && u.grid_col === col)
    if (occupied) throw new Error('Cell is occupied')

    const unitBoard = unitType.board || 'ground'
    const boardTiles = tiles.filter(t => (t.board || 'ground') === unitBoard)

    const myCC = units.find(u => u.owner_id === userId && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
    const myBuildings = units.filter(u => u.owner_id === userId && (u.wg_unit_types?.name === 'Base' || u.wg_unit_types?.name === 'Factory'))
    const myStructures = myCC ? [myCC, ...myBuildings] : []

    function distToNearest(r, c, structs) {
      let min = Infinity
      for (const s of structs) {
        const d = hexDistance(s.grid_row, s.grid_col, r, c)
        if (d < min) min = d
      }
      return min
    }

    const isMiningStation = unitType.name === 'Mining Station'

    if (unitType.name === 'Command Center' || unitType.name === 'Command Ship') {
      if (myCC) throw new Error('Only one Command Center/Ship allowed')
      const distFromEdge = Math.min(row, game.grid_rows - 1 - row, col, game.grid_cols - 1 - col)
      if (distFromEdge > 3) throw new Error('Must be within 3 tiles of an edge')
      const enemyCCs = units.filter(u => u.owner_id !== userId && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
      const tooClose = enemyCCs.some(cc => hexDistance(cc.grid_row, cc.grid_col, row, col) < 20)
      if (tooClose) throw new Error('Too close to enemy Command Center (min 20 tiles)')
    } else if (unitType.name === 'Base' || unitType.name === 'Factory') {
      if (!myCC) throw new Error('Deploy a Command Center first')
      const dist = distToNearest(row, col, myStructures)
      if (dist > 4) throw new Error(`${unitType.name} must be within 4 tiles of a structure`)
    } else {
      if (!myCC) throw new Error('Deploy a Command Center first')
      const dist = distToNearest(row, col, myStructures)
      if (dist > unitType.movement) throw new Error('Too far from Command Center or Base')
    }

    const tile = boardTiles.find(t => t.grid_row === row && t.grid_col === col)
    if (tile) {
      const impassable = new Set(unitBoard === 'space'
        ? (isMiningStation ? ['star'] : ['asteroid', 'large_asteroid', 'star'])
        : ['ocean', 'mountain', 'lake', 'river'])
      if (!tile.has_road && impassable.has(tile.terrain)) {
        throw new Error(`Cannot deploy on ${tile.terrain}`)
      }
    }

    const { error: unitError } = await supabase.from('wg_units').insert({
      game_id: gameId,
      owner_id: userId,
      unit_type_id: unitTypeId,
      grid_row: row,
      grid_col: col,
      current_hp: unitType.hp,
      board: unitBoard,
    })
    if (unitError) throw unitError

    if (!isAdmin) {
      const { error: goldError } = await supabase
        .from('wg_game_players')
        .update({ gold: currentPlayer.gold - unitType.cost })
        .eq('id', currentPlayer.id)
      if (goldError) throw goldError
    }

    await fetchAll()
  }

  async function moveUnit(unitId, newRow, newCol) {
    const unit = units.find(u => u.id === unitId)
    if (!unit || unit.owner_id !== userId) throw new Error('Not your unit')
    if (!isAdmin && unit.has_moved) throw new Error('Unit already moved')

    const unitBoard = unit.board || 'ground'
    const boardTiles = tiles.filter(t => (t.board || 'ground') === unitBoard)
    const isMiningStation = unit.wg_unit_types?.name === 'Mining Station'

    const sourceTile = boardTiles.find(t => t.grid_row === unit.grid_row && t.grid_col === unit.grid_col)
    const destTile = boardTiles.find(t => t.grid_row === newRow && t.grid_col === newCol)

    let maxRange = unit.wg_unit_types.movement
    if (sourceTile?.has_road && destTile?.has_road) {
      maxRange += 2
    }

    const dist = hexDistance(unit.grid_row, unit.grid_col, newRow, newCol)
    if (dist > maxRange) throw new Error('Too far')

    const occupied = units.find(u => u.grid_row === newRow && u.grid_col === newCol && u.id !== unitId)
    if (occupied) throw new Error('Cell is occupied')

    if (destTile) {
      const impassable = new Set(unitBoard === 'space'
        ? (isMiningStation ? ['star'] : ['asteroid', 'large_asteroid', 'star'])
        : ['ocean', 'mountain', 'lake', 'river'])
      if (!destTile.has_road && impassable.has(destTile.terrain)) {
        throw new Error(`Cannot move onto ${destTile.terrain}`)
      }
    }

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
    if (!isAdmin && attacker.has_attacked) throw new Error('Unit already attacked')
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

  async function buildRoad(unitId, row, col) {
    const unit = units.find(u => u.id === unitId)
    if (!unit || unit.owner_id !== userId) throw new Error('Not your unit')
    if (unit.wg_unit_types?.name !== 'Engineer') throw new Error('Only engineers can build roads')
    if (!isAdmin && unit.has_attacked) throw new Error('Engineer already built this turn')

    const dist = hexDistance(unit.grid_row, unit.grid_col, row, col)
    if (dist > 1) throw new Error('Too far to build')

    const unitBoard = unit.board || 'ground'
    const tile = tiles.find(t => t.grid_row === row && t.grid_col === col && (t.board || 'ground') === unitBoard)
    if (!tile) throw new Error('Invalid tile')
    if (tile.has_road) throw new Error('Road already exists here')
    if (tile.terrain === 'mountain') throw new Error('Cannot build road on mountain')

    const { error } = await supabase
      .from('wg_game_tiles')
      .update({ has_road: true })
      .eq('game_id', gameId)
      .eq('grid_row', row)
      .eq('grid_col', col)
      .eq('board', unitBoard)
    if (error) throw error

    const { error: unitError } = await supabase
      .from('wg_units')
      .update({ has_attacked: true })
      .eq('id', unitId)
    if (unitError) throw unitError

    await fetchAll()
  }

  async function destroyRoad(unitId, row, col) {
    const unit = units.find(u => u.id === unitId)
    if (!unit || unit.owner_id !== userId) throw new Error('Not your unit')
    if (unit.wg_unit_types?.name !== 'Engineer') throw new Error('Only engineers can destroy roads')
    if (!isAdmin && unit.has_attacked) throw new Error('Engineer already acted this turn')

    const dist = hexDistance(unit.grid_row, unit.grid_col, row, col)
    if (dist > 1) throw new Error('Too far')

    const unitBoard = unit.board || 'ground'
    const tile = tiles.find(t => t.grid_row === row && t.grid_col === col && (t.board || 'ground') === unitBoard)
    if (!tile) throw new Error('Invalid tile')
    if (!tile.has_road) throw new Error('No road to destroy')

    const { error } = await supabase
      .from('wg_game_tiles')
      .update({ has_road: false })
      .eq('game_id', gameId)
      .eq('grid_row', row)
      .eq('grid_col', col)
      .eq('board', unitBoard)
    if (error) throw error

    const { error: unitError } = await supabase
      .from('wg_units')
      .update({ has_attacked: true })
      .eq('id', unitId)
    if (unitError) throw unitError

    await fetchAll()
  }

  async function excavate(unitId) {
    const unit = units.find(u => u.id === unitId)
    if (!unit || unit.owner_id !== userId) throw new Error('Not your unit')
    const canExcavate = unit.wg_unit_types?.name === 'Mining Station' || unit.wg_unit_types?.name === 'Excavator'
    if (!canExcavate) throw new Error('This unit cannot excavate')

    const unitBoard = unit.board || 'ground'
    const tile = tiles.find(t => t.grid_row === unit.grid_row && t.grid_col === unit.grid_col && (t.board || 'ground') === unitBoard)
    if (!tile || !tile.resource) throw new Error('No resource on this tile')

    const isLuxury = !!LUXURY_BY_ID[tile.resource]

    if (!isLuxury && (!tile.ore_amount || tile.ore_amount <= 0)) throw new Error('No ore remaining')

    const resources = { ...(currentPlayer.resources || {}) }
    if (isLuxury) {
      resources[tile.resource] = 1
    } else {
      resources[tile.resource] = (resources[tile.resource] || 0) + tile.ore_amount
    }

    const { error: resError } = await supabase
      .from('wg_game_players')
      .update({ resources })
      .eq('id', currentPlayer.id)
    if (resError) throw resError

    const { error: tileError } = await supabase
      .from('wg_game_tiles')
      .update({ resource: null, ore_amount: 0 })
      .eq('game_id', gameId)
      .eq('grid_row', unit.grid_row)
      .eq('grid_col', unit.grid_col)
      .eq('board', unitBoard)
    if (tileError) throw tileError

    await fetchAll()
  }

  async function upgradeShipCompartment(unitId, compartmentId) {
    const unit = units.find(u => u.id === unitId)
    if (!unit) throw new Error('Unit not found')

    const upgrades = unit.upgrades || {}
    const currentLevel = upgrades[compartmentId] || 0
    if (currentLevel >= 5) throw new Error('Already max level')

    const ironCost = 10
    const resources = { ...(currentPlayer.resources || {}) }
    if (!isAdmin && (resources.iron || 0) < ironCost) throw new Error('Not enough iron')

    if (!isAdmin) {
      resources.iron = (resources.iron || 0) - ironCost
      const { error: resError } = await supabase
        .from('wg_game_players')
        .update({ resources })
        .eq('id', currentPlayer.id)
      if (resError) throw resError
    }

    const newUpgrades = { ...upgrades, [compartmentId]: currentLevel + 1 }
    const { error } = await supabase
      .from('wg_units')
      .update({ upgrades: newUpgrades })
      .eq('id', unitId)
    if (error) throw error

    await fetchAll()
  }

  async function endTurn() {
    if (!isMyTurn) throw new Error('Not your turn')

    const teamPlayers = players.filter(p => p.color === myColor)

    const { error: endError } = await supabase
      .from('wg_game_players')
      .update({ has_ended_turn: true })
      .eq('id', currentPlayer.id)
    if (endError) throw endError

    const { data: freshTeam } = await supabase
      .from('wg_game_players')
      .select('has_ended_turn')
      .eq('game_id', gameId)
      .eq('color', myColor)

    const allEnded = freshTeam?.every(p => p.has_ended_turn)

    if (!allEnded) {
      await fetchAll()
      return
    }

    const teamColors = [...new Set(players.map(p => p.color))]
    const currentColorIdx = teamColors.indexOf(myColor)
    const nextColorIdx = (currentColorIdx + 1) % teamColors.length
    const nextColor = teamColors[nextColorIdx]
    const isNewRound = nextColorIdx <= currentColorIdx
    const newTurnNumber = isNewRound ? game.turn_number + 1 : game.turn_number

    const nextTeamPlayers = players.filter(p => p.color === nextColor)
    const nextTeamPlayerIds = nextTeamPlayers.map(p => p.player_id)

    const nextTeamUnits = units.filter(u => nextTeamPlayerIds.includes(u.owner_id))
    if (nextTeamUnits.length > 0) {
      const { error } = await supabase
        .from('wg_units')
        .update({ has_moved: false, has_attacked: false })
        .in('id', nextTeamUnits.map(u => u.id))
      if (error) throw error
    }

    for (const np of nextTeamPlayers) {
      const { data: freshPlayer } = await supabase
        .from('wg_game_players')
        .select('gold, resources')
        .eq('id', np.id)
        .single()

      const npUnits = units.filter(u => u.owner_id === np.player_id)
      const ccCount = npUnits.filter(u =>
        u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'
      ).length
      const baseCount = npUnits.filter(u => u.wg_unit_types?.name === 'Base').length
      const factoryCount = npUnits.filter(u => u.wg_unit_types?.name === 'Factory').length
      const npResources = { ...(freshPlayer.resources || {}) }
      const coalAvailable = npResources.coal || 0
      const activeFactories = Math.min(factoryCount, coalAvailable)
      const production = (ccCount * 4) + (baseCount * 2) + activeFactories

      if (activeFactories > 0) {
        npResources.coal = coalAvailable - activeFactories
      }

      const unitUpkeep = npUnits.length
      let luxuryIncome = 0
      for (const [resId] of Object.entries(npResources)) {
        const lux = LUXURY_BY_ID[resId]
        if (lux) luxuryIncome += lux.yield
      }

      await supabase
        .from('wg_game_players')
        .update({
          gold: Math.max(0, freshPlayer.gold + production + luxuryIncome - unitUpkeep),
          has_ended_turn: false,
          resources: npResources,
        })
        .eq('id', np.id)
    }

    for (const tp of teamPlayers) {
      await supabase
        .from('wg_game_players')
        .update({ has_ended_turn: false })
        .eq('id', tp.id)
    }

    const { error: turnError } = await supabase.from('wg_turns').insert({
      game_id: gameId,
      player_id: userId,
      turn_number: game.turn_number,
    })
    if (turnError) throw turnError

    const { error: gameError } = await supabase
      .from('wg_games')
      .update({
        current_player_id: nextTeamPlayers[0]?.player_id,
        current_team_color: nextColor,
        turn_number: newTurnNumber,
      })
      .eq('id', gameId)
    if (gameError) throw gameError

    await fetchAll()
  }

  return {
    game, players, units, unitTypes, tiles, discoveredTiles, loading,
    currentPlayer, isMyTurn, isAdmin,
    deployUnit, moveUnit, attackUnit, buildRoad, destroyRoad, endTurn,
    excavate, upgradeShipCompartment,
    persistDiscoveredTiles, productionPerTurn, economy,
    refresh: fetchAll,
  }
}
