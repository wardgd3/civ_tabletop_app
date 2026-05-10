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

  const teamPlayers = players.filter(p => p.color === myColor)
  const teamPlayerIds = teamPlayers.map(p => p.player_id)
  const teamGold = teamPlayers.reduce((sum, p) => sum + (p.gold || 0), 0)

  const economy = (() => {
    if (!currentPlayer) return { production: 0, upkeep: 0, excavationIncome: 0, net: 0, teamGold }
    const teamUnits = units.filter(u => teamPlayerIds.includes(u.owner_id))
    const ccCount = teamUnits.filter(u =>
      u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'
    ).length
    const baseCount = teamUnits.filter(u => u.wg_unit_types?.name === 'Base').length
    const factoryCount = teamUnits.filter(u => u.wg_unit_types?.name === 'Factory').length
    let totalCoal = 0
    let totalExcavations = 0
    let luxuryIncome = 0
    for (const tp of teamPlayers) {
      const res = tp.resources || {}
      totalCoal += res.coal || 0
      totalExcavations += res.excavations || 0
      for (const [resId] of Object.entries(res)) {
        const lux = LUXURY_BY_ID[resId]
        if (lux) luxuryIncome += lux.yield
      }
    }
    const activeFactories = Math.min(factoryCount, totalCoal)
    const production = (ccCount * 4) + (baseCount * 2) + activeFactories
    const upkeep = teamUnits.length
    const excavationIncome = totalExcavations + luxuryIncome
    return { production, upkeep, excavationIncome, net: production + excavationIncome - upkeep, teamGold }
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
    if (!isAdmin && teamGold < unitType.cost) throw new Error('Not enough production')

    const unitBoard = unitType.board || 'ground'

    const occupied = units.find(u => u.grid_row === row && u.grid_col === col && (u.board || 'ground') === unitBoard)
    if (occupied) throw new Error('Cell is occupied')
    const boardTiles = tiles.filter(t => (t.board || 'ground') === unitBoard)

    const myCC = units.find(u => u.owner_id === userId && (u.board || 'ground') === unitBoard && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
    const myCCAnyBoard = units.find(u => u.owner_id === userId && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
    const myBuildings = units.filter(u => u.owner_id === userId && (u.board || 'ground') === unitBoard && (u.wg_unit_types?.name === 'Base' || u.wg_unit_types?.name === 'Factory'))
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
      if (myCC) throw new Error('Only one Command Center/Ship allowed per board')
      const distFromEdge = Math.min(row, game.grid_rows - 1 - row, col, game.grid_cols - 1 - col)
      if (distFromEdge > 3) throw new Error('Must be within 3 tiles of an edge')
      const enemyCCs = units.filter(u => u.owner_id !== userId && (u.board || 'ground') === unitBoard && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
      const tooClose = enemyCCs.some(cc => hexDistance(cc.grid_row, cc.grid_col, row, col) < 20)
      if (tooClose) throw new Error('Too close to enemy Command Center (min 20 tiles)')
    } else if (unitType.name === 'Base' || unitType.name === 'Factory') {
      if (!myCC && !myCCAnyBoard) throw new Error('Deploy a Command Center first')
      if (!myCC) throw new Error('Deploy a Command structure on this board first')
      const dist = distToNearest(row, col, myStructures)
      if (dist > 4) throw new Error(`${unitType.name} must be within 4 tiles of a structure`)
    } else {
      if (!myCC && !myCCAnyBoard) throw new Error('Deploy a Command Center first')
      if (!myCC) throw new Error('Deploy a Command structure on this board first')
      const dist = distToNearest(row, col, myStructures)
      if (dist > 3) throw new Error('Too far from Command Center or Base')
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
      let remaining = unitType.cost
      for (const tp of teamPlayers) {
        if (remaining <= 0) break
        const deduct = Math.min(tp.gold || 0, remaining)
        if (deduct > 0) {
          await supabase.from('wg_game_players').update({ gold: tp.gold - deduct }).eq('id', tp.id)
          remaining -= deduct
        }
      }
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

    const usedSoFar = unit.moves_used || 0
    const remaining = maxRange - usedSoFar

    const dist = hexDistance(unit.grid_row, unit.grid_col, newRow, newCol)
    if (dist > remaining) throw new Error('Too far')

    const occupied = units.find(u => u.grid_row === newRow && u.grid_col === newCol && u.id !== unitId && (u.board || 'ground') === unitBoard)
    if (occupied) throw new Error('Cell is occupied')

    if (destTile) {
      const impassable = new Set(unitBoard === 'space'
        ? (isMiningStation ? ['star'] : ['asteroid', 'large_asteroid', 'star'])
        : ['ocean', 'mountain', 'lake', 'river'])
      if (!destTile.has_road && impassable.has(destTile.terrain)) {
        throw new Error(`Cannot move onto ${destTile.terrain}`)
      }
    }

    const newMovesUsed = usedSoFar + dist
    const fullyMoved = newMovesUsed >= maxRange

    const { error } = await supabase
      .from('wg_units')
      .update({ grid_row: newRow, grid_col: newCol, has_moved: fullyMoved, moves_used: newMovesUsed })
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

      const loadedUnits = target.upgrades?.loadedUnits || []
      if (loadedUnits.length > 0) {
        const targetBoard = target.board || 'ground'
        const odd = target.grid_row & 1
        const dirs = odd
          ? [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]]
          : [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]]
        const occupiedSet = new Set(units.filter(u => (u.board || 'ground') === targetBoard && u.id !== targetId).map(u => `${u.grid_row}-${u.grid_col}`))
        const impassable = targetBoard === 'space'
          ? new Set(['asteroid', 'large_asteroid', 'star'])
          : new Set(['ocean', 'mountain', 'lake', 'river'])
        const tilesByKey = new Map(tiles.filter(t => (t.board || 'ground') === targetBoard).map(t => [`${t.grid_row}-${t.grid_col}`, t]))
        const available = []
        for (const [dr, dc] of dirs) {
          const nr = target.grid_row + dr, nc = target.grid_col + dc
          const key = `${nr}-${nc}`
          if (occupiedSet.has(key)) continue
          const tile = tilesByKey.get(key)
          if (tile && impassable.has(tile.terrain)) continue
          available.push({ row: nr, col: nc })
        }
        const toInsert = []
        for (const soldier of loadedUnits) {
          const spot = available.shift()
          if (!spot) break
          toInsert.push({
            game_id: gameId,
            owner_id: target.owner_id,
            unit_type_id: soldier.typeId,
            grid_row: spot.row,
            grid_col: spot.col,
            current_hp: soldier.hp,
            board: targetBoard,
            has_moved: true,
            has_attacked: true,
            moves_used: 99,
            is_alive: true,
          })
        }
        if (toInsert.length > 0) {
          await supabase.from('wg_units').insert(toInsert)
        }
      }
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
    resources.excavations = (resources.excavations || 0) + 1

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

  async function levelUpUnit(unitId) {
    const unit = units.find(u => u.id === unitId)
    if (!unit) throw new Error('Unit not found')
    if (unit.owner_id !== userId) throw new Error('Not your unit')

    const upgrades = unit.upgrades || {}
    const currentLevel = upgrades.level || 0
    if (currentLevel >= 5) throw new Error('Already max level')

    const cost = (currentLevel + 1) * 5
    if (!isAdmin && teamGold < cost) throw new Error(`Not enough gold (need ${cost})`)

    if (!isAdmin) {
      let remaining = cost
      for (const tp of teamPlayers) {
        if (remaining <= 0) break
        const deduct = Math.min(tp.gold || 0, remaining)
        if (deduct > 0) {
          await supabase.from('wg_game_players').update({ gold: tp.gold - deduct }).eq('id', tp.id)
          remaining -= deduct
        }
      }
    }

    const newUpgrades = { ...upgrades, level: currentLevel + 1 }
    const { error } = await supabase
      .from('wg_units')
      .update({ upgrades: newUpgrades })
      .eq('id', unitId)
    if (error) throw error

    await fetchAll()
  }

  async function upgradeShipCompartment(unitId, compartmentId, slotIndex, tierLevel) {
    const unit = units.find(u => u.id === unitId)
    if (!unit) throw new Error('Unit not found')

    const upgrades = unit.upgrades || {}
    const existing = upgrades[compartmentId]
    const slots = Array.isArray(existing) ? [...existing] : []

    const currentTier = slots[slotIndex] || 0
    if (tierLevel <= currentTier) throw new Error('Already at this tier or higher')

    const tierCosts = [0, 10, 25]
    const ironCost = tierCosts[tierLevel - 1] || 0

    const resources = { ...(currentPlayer.resources || {}) }
    if (!isAdmin && ironCost > 0 && (resources.iron || 0) < ironCost) throw new Error('Not enough iron')

    if (!isAdmin && ironCost > 0) {
      resources.iron = (resources.iron || 0) - ironCost
      const { error: resError } = await supabase
        .from('wg_game_players')
        .update({ resources })
        .eq('id', currentPlayer.id)
      if (resError) throw resError
    }

    while (slots.length <= slotIndex) slots.push(0)
    slots[slotIndex] = tierLevel

    const newUpgrades = { ...upgrades, [compartmentId]: slots }
    const { error } = await supabase
      .from('wg_units')
      .update({ upgrades: newUpgrades })
      .eq('id', unitId)
    if (error) throw error

    await fetchAll()
  }

  async function buildConvoy(unitId) {
    const unit = units.find(u => u.id === unitId)
    if (!unit) throw new Error('Unit not found')

    const upgrades = unit.upgrades || {}
    const convoys = upgrades.convoys || []
    if (convoys.length >= 2) throw new Error('Max 2 convoys')

    const convoyCost = 15
    if (!isAdmin && teamGold < convoyCost) throw new Error('Not enough gold')

    if (!isAdmin) {
      const perPlayer = Math.ceil(convoyCost / teamPlayers.length)
      for (const tp of teamPlayers) {
        await supabase
          .from('wg_game_players')
          .update({ gold: Math.max(0, (tp.gold || 0) - perPlayer) })
          .eq('id', tp.id)
      }
    }

    const newConvoys = [...convoys, { units: [], inTransit: false, turnsLeft: 0 }]
    const newUpgrades = { ...upgrades, convoys: newConvoys }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', unitId)
    await fetchAll()
  }

  async function loadUnitToConvoy(shipId, convoyIndex, groundUnitId) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const groundUnit = units.find(u => u.id === groundUnitId)
    if (!groundUnit) throw new Error('Unit not found')

    const upgrades = ship.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy) throw new Error('Convoy not found')
    if (convoy.inTransit) throw new Error('Convoy in transit')
    if ((convoy.units || []).length >= 4) throw new Error('Convoy full')

    convoy.units = [...(convoy.units || []), {
      unitId: groundUnitId,
      typeName: groundUnit.wg_unit_types?.name || 'Unknown',
      typeId: groundUnit.unit_type_id,
      hp: groundUnit.current_hp,
    }]
    convoys[convoyIndex] = convoy

    await supabase.from('wg_units').update({ is_alive: false }).eq('id', groundUnitId)

    const newUpgrades = { ...upgrades, convoys }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function unloadToHoldingBay(shipId, convoyIndex, unitIndex) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const upgrades = ship.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy || convoy.inTransit) throw new Error('Cannot unload')

    const holdingBay = [...(upgrades.holdingBay || [])]
    if (holdingBay.length >= 12) throw new Error('Holding bay full')

    const removed = convoy.units.splice(unitIndex, 1)[0]
    holdingBay.push(removed)
    convoys[convoyIndex] = convoy

    const newUpgrades = { ...upgrades, convoys, holdingBay }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function sendConvoy(shipId, convoyIndex) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const upgrades = ship.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy || convoy.inTransit) throw new Error('Already in transit')

    const isCommandShip = ship.wg_unit_types?.name === 'Command Ship'
    const destType = isCommandShip ? 'Command Center' : 'Command Ship'
    const dest = units.find(u => u.owner_id === ship.owner_id && u.wg_unit_types?.name === destType)
    if (!dest) throw new Error(`No ${destType} found to receive convoy`)

    convoys.splice(convoyIndex, 1)
    await supabase.from('wg_units').update({ upgrades: { ...upgrades, convoys } }).eq('id', shipId)

    const { data: freshDest } = await supabase.from('wg_units').select('upgrades').eq('id', dest.id).single()
    const destUpgrades = freshDest?.upgrades || {}
    const destConvoys = [...(destUpgrades.convoys || [])]
    destConvoys.push({
      units: [...(convoy.units || [])],
      cargo: { ...(convoy.cargo || {}) },
      inTransit: true,
      turnsLeft: 5,
    })
    await supabase.from('wg_units').update({ upgrades: { ...destUpgrades, convoys: destConvoys } }).eq('id', dest.id)

    await fetchAll()
  }

  async function loadCargoToConvoy(structId, convoyIndex, { gold = 0, resources = {} }) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')

    const upgrades = struct.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy || convoy.inTransit) throw new Error('Cannot load cargo')

    if (gold > 0) {
      if (!isAdmin && teamGold < gold) throw new Error('Not enough gold')
      if (!isAdmin) {
        let remaining = gold
        for (const tp of teamPlayers) {
          if (remaining <= 0) break
          const deduct = Math.min(tp.gold || 0, remaining)
          if (deduct > 0) {
            await supabase.from('wg_game_players').update({ gold: tp.gold - deduct }).eq('id', tp.id)
            remaining -= deduct
          }
        }
      }
    }

    if (Object.keys(resources).length > 0) {
      const playerRes = { ...(currentPlayer.resources || {}) }
      for (const [key, amount] of Object.entries(resources)) {
        if ((playerRes[key] || 0) < amount) throw new Error(`Not enough ${key}`)
        playerRes[key] = (playerRes[key] || 0) - amount
      }
      await supabase.from('wg_game_players').update({ resources: playerRes }).eq('id', currentPlayer.id)
    }

    const cargo = convoy.cargo || { gold: 0, resources: {} }
    cargo.gold = (cargo.gold || 0) + gold
    if (!cargo.resources) cargo.resources = {}
    for (const [key, amount] of Object.entries(resources)) {
      cargo.resources[key] = (cargo.resources[key] || 0) + amount
    }
    convoy.cargo = cargo
    convoys[convoyIndex] = convoy

    await supabase.from('wg_units').update({ upgrades: { ...upgrades, convoys } }).eq('id', structId)
    await fetchAll()
  }

  async function unloadCargoFromConvoy(structId, convoyIndex) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')

    const upgrades = struct.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy || convoy.inTransit) throw new Error('Cannot unload')

    const cargo = convoy.cargo || { gold: 0, resources: {} }

    if (cargo.gold > 0) {
      const perPlayer = Math.ceil(cargo.gold / teamPlayers.length)
      for (const tp of teamPlayers) {
        await supabase.from('wg_game_players').update({ gold: (tp.gold || 0) + perPlayer }).eq('id', tp.id)
      }
    }

    if (cargo.resources && Object.keys(cargo.resources).length > 0) {
      const playerRes = { ...(currentPlayer.resources || {}) }
      for (const [key, amount] of Object.entries(cargo.resources)) {
        playerRes[key] = (playerRes[key] || 0) + amount
      }
      await supabase.from('wg_game_players').update({ resources: playerRes }).eq('id', currentPlayer.id)
    }

    convoy.cargo = { gold: 0, resources: {} }
    convoys[convoyIndex] = convoy
    await supabase.from('wg_units').update({ upgrades: { ...upgrades, convoys } }).eq('id', structId)
    await fetchAll()
  }

  async function deployFromBay(shipId, bayIndex, row, col) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    if (row === ship.grid_row && col === ship.grid_col) throw new Error('Cannot deploy on the command structure tile')
    const occupied = units.find(u => u.grid_row === row && u.grid_col === col && (u.board || 'ground') === 'ground')
    if (occupied) throw new Error('Tile is occupied')

    const upgrades = ship.upgrades || {}
    const holdingBay = [...(upgrades.holdingBay || [])]
    if (bayIndex < 0 || bayIndex >= holdingBay.length) throw new Error('Invalid bay index')

    const storedUnit = holdingBay.splice(bayIndex, 1)[0]

    const { error } = await supabase.from('wg_units').insert({
      game_id: gameId,
      owner_id: userId,
      unit_type_id: storedUnit.typeId,
      grid_row: row,
      grid_col: col,
      current_hp: storedUnit.hp,
      board: 'ground',
      has_moved: true,
      has_attacked: true,
      moves_used: 99,
      is_alive: true,
    })
    if (error) throw error

    const newUpgrades = { ...upgrades, holdingBay }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function produceUnitToBay(shipId, unitTypeId, unitTypeName) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const ut = unitTypes.find(t => t.id === unitTypeId)
    if (!ut) throw new Error('Unit type not found')

    const upgrades = ship.upgrades || {}

    const isTransport = ut.name === 'Armor Transport'
    const isSpaceBoard = (ship.board || 'ground') === 'space'

    if (isTransport && !isSpaceBoard) {
      const loadingBay = [...(upgrades.loadingBay || [])]
      const maxSlots = ship.wg_unit_types?.name === 'Base' ? 1 : 2
      if (loadingBay.length >= maxSlots) throw new Error('Loading bay full')

      if (!isAdmin && teamGold < ut.cost) throw new Error('Not enough gold')

      if (!isAdmin) {
        const perPlayer = Math.ceil(ut.cost / teamPlayers.length)
        for (const tp of teamPlayers) {
          await supabase
            .from('wg_game_players')
            .update({ gold: Math.max(0, (tp.gold || 0) - perPlayer) })
            .eq('id', tp.id)
        }
      }

      loadingBay.push({
        typeId: unitTypeId,
        typeName: unitTypeName,
        hp: ut.hp,
        units: [],
      })

      const newUpgrades = { ...upgrades, loadingBay }
      await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    } else {
      const holdingBay = [...(upgrades.holdingBay || [])]
      if (holdingBay.length >= 12) throw new Error('Barracks full')

      if (!isAdmin && teamGold < ut.cost) throw new Error('Not enough gold')

      if (!isAdmin) {
        const perPlayer = Math.ceil(ut.cost / teamPlayers.length)
        for (const tp of teamPlayers) {
          await supabase
            .from('wg_game_players')
            .update({ gold: Math.max(0, (tp.gold || 0) - perPlayer) })
            .eq('id', tp.id)
        }
      }

      holdingBay.push({
        typeId: unitTypeId,
        typeName: unitTypeName,
        hp: ut.hp,
      })

      const newUpgrades = { ...upgrades, holdingBay }
      await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    }

    await fetchAll()
  }

  async function loadFromBayToConvoy(shipId, convoyIndex, bayIndex) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const upgrades = ship.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy) throw new Error('Convoy not found')
    if (convoy.inTransit) throw new Error('Convoy in transit')
    if ((convoy.units || []).length >= 4) throw new Error('Convoy full')

    const holdingBay = [...(upgrades.holdingBay || [])]
    if (bayIndex < 0 || bayIndex >= holdingBay.length) throw new Error('Invalid bay index')

    const removed = holdingBay.splice(bayIndex, 1)[0]
    convoy.units = [...(convoy.units || []), removed]
    convoys[convoyIndex] = convoy

    const newUpgrades = { ...upgrades, convoys, holdingBay }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function dockTransport(structId, transportUnitId) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')
    const transport = units.find(u => u.id === transportUnitId)
    if (!transport) throw new Error('Transport not found')

    const dist = hexDistance(struct.grid_row, struct.grid_col, transport.grid_row, transport.grid_col)
    if (dist > 2) throw new Error('Transport must be within 2 tiles of structure')

    const upgrades = struct.upgrades || {}
    const loadingBay = [...(upgrades.loadingBay || [])]
    const maxSlots = struct.wg_unit_types?.name === 'Base' ? 1 : 2
    if (loadingBay.length >= maxSlots) throw new Error('Loading bay full')

    loadingBay.push({
      typeId: transport.unit_type_id,
      typeName: transport.wg_unit_types?.name || 'Armored Transport',
      hp: transport.current_hp,
      units: transport.upgrades?.loadedUnits || [],
    })

    await supabase.from('wg_units').update({ is_alive: false }).eq('id', transportUnitId)
    await supabase.from('wg_units').update({ upgrades: { ...upgrades, loadingBay } }).eq('id', structId)
    await fetchAll()
  }

  async function loadSoldierToTransport(structId, transportIndex, soldierUnitId) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')
    const soldier = units.find(u => u.id === soldierUnitId)
    if (!soldier) throw new Error('Unit not found')

    const upgrades = struct.upgrades || {}
    const loadingBay = [...(upgrades.loadingBay || [])]
    const transport = loadingBay[transportIndex]
    if (!transport) throw new Error('Transport not found')
    if ((transport.units || []).length >= 4) throw new Error('Transport full (max 4)')

    transport.units = [...(transport.units || []), {
      typeId: soldier.unit_type_id,
      typeName: soldier.wg_unit_types?.name || 'Unknown',
      hp: soldier.current_hp,
    }]
    loadingBay[transportIndex] = transport

    await supabase.from('wg_units').update({ is_alive: false }).eq('id', soldierUnitId)
    await supabase.from('wg_units').update({ upgrades: { ...upgrades, loadingBay } }).eq('id', structId)
    await fetchAll()
  }

  async function loadBaySoldierToTransport(structId, transportIndex, bayIndex) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')

    const upgrades = struct.upgrades || {}
    const loadingBay = [...(upgrades.loadingBay || [])]
    const transport = loadingBay[transportIndex]
    if (!transport) throw new Error('Transport not found')
    if ((transport.units || []).length >= 4) throw new Error('Transport full (max 4)')

    const holdingBay = [...(upgrades.holdingBay || [])]
    if (bayIndex < 0 || bayIndex >= holdingBay.length) throw new Error('Invalid bay index')

    const removed = holdingBay.splice(bayIndex, 1)[0]
    transport.units = [...(transport.units || []), removed]
    loadingBay[transportIndex] = transport

    await supabase.from('wg_units').update({ upgrades: { ...upgrades, loadingBay, holdingBay } }).eq('id', structId)
    await fetchAll()
  }

  async function unloadSoldierFromTransport(structId, transportIndex, unitIndex) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')

    const upgrades = struct.upgrades || {}
    const loadingBay = [...(upgrades.loadingBay || [])]
    const transport = loadingBay[transportIndex]
    if (!transport) throw new Error('Transport not found')

    const holdingBay = [...(upgrades.holdingBay || [])]
    if (holdingBay.length >= 12) throw new Error('Holding bay full')

    const removed = transport.units.splice(unitIndex, 1)[0]
    holdingBay.push(removed)
    loadingBay[transportIndex] = transport

    await supabase.from('wg_units').update({ upgrades: { ...upgrades, loadingBay, holdingBay } }).eq('id', structId)
    await fetchAll()
  }

  async function undockTransport(structId, transportIndex, row, col) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')

    if (row === struct.grid_row && col === struct.grid_col) throw new Error('Cannot deploy on the structure tile')
    const occupied = units.find(u => u.grid_row === row && u.grid_col === col && (u.board || 'ground') === 'ground')
    if (occupied) throw new Error('Tile is occupied')

    const upgrades = struct.upgrades || {}
    const loadingBay = [...(upgrades.loadingBay || [])]
    if (transportIndex < 0 || transportIndex >= loadingBay.length) throw new Error('Invalid transport index')

    const transport = loadingBay.splice(transportIndex, 1)[0]

    const { error } = await supabase.from('wg_units').insert({
      game_id: gameId,
      owner_id: userId,
      unit_type_id: transport.typeId,
      grid_row: row,
      grid_col: col,
      current_hp: transport.hp,
      board: 'ground',
      has_moved: true,
      has_attacked: true,
      moves_used: 99,
      is_alive: true,
      upgrades: { loadedUnits: transport.units || [] },
    })
    if (error) throw error

    await supabase.from('wg_units').update({ upgrades: { ...upgrades, loadingBay } }).eq('id', structId)
    await fetchAll()
  }

  async function deployFromTransport(transportId, row, col) {
    const transport = units.find(u => u.id === transportId)
    if (!transport) throw new Error('Transport not found')
    const loaded = transport.upgrades?.loadedUnits || []
    if (loaded.length === 0) throw new Error('No units loaded')

    const occupied = units.find(u => u.grid_row === row && u.grid_col === col && (u.board || 'ground') === (transport.board || 'ground'))
    if (occupied) throw new Error('Tile is occupied')

    const soldier = loaded[0]
    const remaining = loaded.slice(1)

    const { error } = await supabase.from('wg_units').insert({
      game_id: gameId,
      owner_id: userId,
      unit_type_id: soldier.typeId,
      grid_row: row,
      grid_col: col,
      current_hp: soldier.hp,
      board: transport.board || 'ground',
      has_moved: true,
      has_attacked: true,
      moves_used: 99,
      is_alive: true,
    })
    if (error) throw error

    await supabase.from('wg_units').update({ upgrades: { ...transport.upgrades, loadedUnits: remaining } }).eq('id', transportId)
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
        .update({ has_moved: false, has_attacked: false, moves_used: 0 })
        .in('id', nextTeamUnits.map(u => u.id))
      if (error) throw error
    }

    // Advance convoy transit timers for the next team's command structures
    const commandStructures = nextTeamUnits.filter(u =>
      u.wg_unit_types?.name === 'Command Ship' || u.wg_unit_types?.name === 'Command Center'
    )
    let cargoGoldToAdd = 0
    for (const struct of commandStructures) {
      const { data: freshStruct } = await supabase.from('wg_units').select('upgrades').eq('id', struct.id).single()
      const structUpgrades = freshStruct?.upgrades || {}
      const convoys = structUpgrades.convoys
      if (!convoys || !Array.isArray(convoys)) continue

      let changed = false
      const holdingBay = [...(structUpgrades.holdingBay || [])]
      const updatedConvoys = []
      for (const convoy of convoys) {
        if (!convoy.inTransit) {
          updatedConvoys.push(convoy)
          continue
        }
        const newTurns = convoy.turnsLeft - 1
        if (newTurns <= 0) {
          changed = true
          const isGroundStruct = (struct.board || 'ground') === 'ground'
          const loadingBay = [...(structUpgrades.loadingBay || [])]
          const maxLoadingSlots = struct.wg_unit_types?.name === 'Base' ? 1 : 2
          for (const u of (convoy.units || [])) {
            if (isGroundStruct && u.typeName === 'Armor Transport' && loadingBay.length < maxLoadingSlots) {
              loadingBay.push({ ...u, units: u.units || [] })
            } else if (holdingBay.length < 12) {
              holdingBay.push(u)
            }
          }
          structUpgrades.loadingBay = loadingBay
          const cargo = convoy.cargo || {}
          if (cargo.gold) cargoGoldToAdd += cargo.gold
          if (cargo.resources && Object.keys(cargo.resources).length > 0) {
            const structOwner = nextTeamPlayers.find(p => p.player_id === struct.owner_id)
            if (structOwner) {
              const res = { ...(structOwner.resources || {}) }
              for (const [key, amount] of Object.entries(cargo.resources)) {
                res[key] = (res[key] || 0) + amount
              }
              await supabase.from('wg_game_players').update({ resources: res }).eq('id', structOwner.id)
            }
          }
          updatedConvoys.push({ units: [], cargo: { gold: 0, resources: {} }, inTransit: false, turnsLeft: 0 })
        } else {
          changed = true
          updatedConvoys.push({ ...convoy, turnsLeft: newTurns })
        }
      }

      if (changed) {
        await supabase.from('wg_units').update({
          upgrades: { ...structUpgrades, convoys: updatedConvoys, holdingBay, loadingBay: structUpgrades.loadingBay }
        }).eq('id', struct.id)
      }
    }

    const freshNextTeam = []
    for (const np of nextTeamPlayers) {
      const { data: freshPlayer } = await supabase
        .from('wg_game_players')
        .select('gold, resources')
        .eq('id', np.id)
        .single()
      freshNextTeam.push({ ...np, gold: freshPlayer.gold, resources: freshPlayer.resources })
    }

    const ccCount = nextTeamUnits.filter(u =>
      u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'
    ).length
    const baseCount = nextTeamUnits.filter(u => u.wg_unit_types?.name === 'Base').length
    const factoryCount = nextTeamUnits.filter(u => u.wg_unit_types?.name === 'Factory').length
    let totalCoal = 0
    let totalExcavations = 0
    let luxuryIncome = 0
    for (const np of freshNextTeam) {
      const res = np.resources || {}
      totalCoal += res.coal || 0
      totalExcavations += res.excavations || 0
      for (const [resId] of Object.entries(res)) {
        const lux = LUXURY_BY_ID[resId]
        if (lux) luxuryIncome += lux.yield
      }
    }
    const activeFactories = Math.min(factoryCount, totalCoal)
    const production = (ccCount * 4) + (baseCount * 2) + activeFactories
    const unitUpkeep = nextTeamUnits.length
    const excavationIncome = totalExcavations + luxuryIncome

    const currentTeamGold = freshNextTeam.reduce((s, p) => s + (p.gold || 0), 0)
    const newTeamGold = Math.max(0, currentTeamGold + production + excavationIncome - unitUpkeep) + cargoGoldToAdd

    let coalToDeduct = activeFactories
    for (const np of freshNextTeam) {
      const npResources = { ...(np.resources || {}) }
      const playerCoal = npResources.coal || 0
      if (coalToDeduct > 0 && playerCoal > 0) {
        const deduct = Math.min(playerCoal, coalToDeduct)
        npResources.coal = playerCoal - deduct
        coalToDeduct -= deduct
      }
      await supabase
        .from('wg_game_players')
        .update({
          gold: Math.round(newTeamGold / nextTeamPlayers.length),
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
    excavate, upgradeShipCompartment, levelUpUnit,
    buildConvoy, loadUnitToConvoy, loadFromBayToConvoy, unloadToHoldingBay, sendConvoy, deployFromBay, produceUnitToBay, loadCargoToConvoy, unloadCargoFromConvoy,
    dockTransport, loadSoldierToTransport, loadBaySoldierToTransport, unloadSoldierFromTransport, undockTransport, deployFromTransport,
    persistDiscoveredTiles, productionPerTurn, economy,
    refresh: fetchAll,
  }
}
