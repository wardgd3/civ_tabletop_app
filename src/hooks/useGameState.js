import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LUXURY_RESOURCES } from '../lib/terrainGen'
import { getCompartments } from '../components/CommandShipPanel'

const LUXURY_BY_ID = Object.fromEntries(Object.values(LUXURY_RESOURCES).map(r => [r.id, r]))

export const GROUND_ORES = {
  iron:        { id: 'iron',        name: 'Iron',        chance: 0.35, minAmt: 2, maxAmt: 5, color: '#8a8a8a' },
  copper:      { id: 'copper',      name: 'Copper',      chance: 0.25, minAmt: 1, maxAmt: 4, color: '#b87333' },
  titanium:    { id: 'titanium',    name: 'Titanium',    chance: 0.10, minAmt: 1, maxAmt: 2, color: '#a0b0c0' },
  uranium:     { id: 'uranium',     name: 'Uranium',     chance: 0.04, minAmt: 1, maxAmt: 1, color: '#50c878' },
  diamond:     { id: 'diamond',     name: 'Diamond',     chance: 0.01, minAmt: 1, maxAmt: 1, color: '#b9f2ff', deep: true },
  ionivite:    { id: 'ionivite',    name: 'Ionivite',    chance: 0.01, minAmt: 1, maxAmt: 1, color: '#7b68ee', deep: true },
  verdite:     { id: 'verdite',     name: 'Verdite',     chance: 0.01, minAmt: 1, maxAmt: 1, color: '#3cb371', deep: true },
  sulpharnite: { id: 'sulpharnite', name: 'Sulpharnite', chance: 0.008, minAmt: 1, maxAmt: 1, color: '#e8c840', deep: true },
  titanite:    { id: 'titanite',    name: 'Titanite',    chance: 0.006, minAmt: 1, maxAmt: 1, color: '#c8a080', deep: true },
  umbrite:     { id: 'umbrite',     name: 'Umbrite',     chance: 0.004, minAmt: 1, maxAmt: 1, color: '#4a3060', deep: true },
}

export const SPACE_ORES = {
  helium3:     { id: 'helium3',     name: 'Helium-3',    chance: 0.35, minAmt: 2, maxAmt: 5, color: '#d0e8ff' },
  cobalt:      { id: 'cobalt',      name: 'Cobalt',      chance: 0.25, minAmt: 1, maxAmt: 4, color: '#4070c0' },
  palladium:   { id: 'palladium',   name: 'Palladium',   chance: 0.10, minAmt: 1, maxAmt: 2, color: '#c0b090' },
  iridium:     { id: 'iridium',     name: 'Iridium',     chance: 0.04, minAmt: 1, maxAmt: 1, color: '#e0e8f0' },
  diamond:     { id: 'diamond',     name: 'Diamond',     chance: 0.01, minAmt: 1, maxAmt: 1, color: '#b9f2ff', deep: true },
  ionivite:    { id: 'ionivite',    name: 'Ionivite',    chance: 0.01, minAmt: 1, maxAmt: 1, color: '#7b68ee', deep: true },
  verdite:     { id: 'verdite',     name: 'Verdite',     chance: 0.01, minAmt: 1, maxAmt: 1, color: '#3cb371', deep: true },
  sulpharnite: { id: 'sulpharnite', name: 'Sulpharnite', chance: 0.008, minAmt: 1, maxAmt: 1, color: '#e8c840', deep: true },
  titanite:    { id: 'titanite',    name: 'Titanite',    chance: 0.006, minAmt: 1, maxAmt: 1, color: '#c8a080', deep: true },
  umbrite:     { id: 'umbrite',     name: 'Umbrite',     chance: 0.004, minAmt: 1, maxAmt: 1, color: '#4a3060', deep: true },
}

const HANGAR_ELIGIBLE = new Set(['Bomber', 'Mother Ship', 'Orbital Strike', 'Mining Station', 'Fighter', 'Repair Ship'])

function hexNeighborsOf(r, c) {
  const isOdd = r & 1
  return [
    [r - 1, isOdd ? c : c - 1], [r - 1, isOdd ? c + 1 : c],
    [r, c - 1], [r, c + 1],
    [r + 1, isOdd ? c : c - 1], [r + 1, isOdd ? c + 1 : c],
  ]
}

function getBarracksCapacity(unit) {
  return unit?.wg_unit_types?.name === 'Battleship' ? 6 : 12
}

function getHangarCapacity(unit) {
  return unit?.wg_unit_types?.name === 'Battleship' ? 4 : 8
}

function getConvoySlots(unit) {
  if (unit?.wg_unit_types?.name === 'Battleship') return 1
  if (unit?.wg_unit_types?.name === 'Base') return 1
  return 2
}

const BATTLESHIP_MATERIAL_COST = { uranium: 1, iron: 50, aluminum: 30 }

const CANNON_RANGE = [0, 3, 4, 5]

export const WARHEAD_TYPES = {
  nuclear: { name: 'Nuclear', cost: 30, damage: 20, radius: 8 },
  thermonuclear: { name: 'Thermonuclear', cost: 50, damage: 20, radius: 8 },
}

export function getEffectiveAttackRange(unit) {
  const base = unit?.wg_unit_types?.attack_range || 1
  if (unit?.wg_unit_types?.name !== 'Battleship') return base
  const cannons = unit.upgrades?.cannon || []
  const maxTier = Math.max(0, ...cannons.filter(t => t > 0))
  if (maxTier === 0) return base
  return Math.max(base, CANNON_RANGE[maxTier] || base)
}

function seededRandFromHash(seed) {
  let s = seed | 0
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export const SHIELD_HP = [0, 5, 10, 20]

function getShieldHp(upgrades) {
  if (!upgrades) return { current: 0, max: 0 }
  const shieldSlots = upgrades.shields || []
  const maxTier = Math.max(...shieldSlots.filter(s => s > 0), 0)
  if (maxTier === 0) return { current: 0, max: 0 }
  const max = SHIELD_HP[maxTier] || 0
  const current = upgrades.shieldHp !== undefined ? upgrades.shieldHp : max
  return { current, max }
}

const NPC_UNIT_TYPES = {
  test1: {
    id: 'npc-test1',
    name: 'test1',
    description: 'A hostile alien creature',
    cost: 0,
    attack: 3,
    defense: 1,
    hp: 5,
    movement: 2,
    attack_range: 1,
    visibility: 2,
    icon: 'large_creature.png',
    board: 'ground',
    isNPC: true,
  },
  test2: {
    id: 'npc-test2',
    name: 'test2',
    description: 'A hostile space creature',
    cost: 0,
    attack: 4,
    defense: 2,
    hp: 8,
    movement: 3,
    attack_range: 5,
    visibility: 10,
    icon: 'spacegrunt.png',
    board: 'space',
    isNPC: true,
  },
  warship: {
    id: 'npc-warship',
    name: 'Warship',
    description: 'A hostile alien warship',
    cost: 0,
    attack: 5,
    defense: 3,
    hp: 30,
    movement: 3,
    attack_range: 3,
    visibility: 10,
    icon: 'hostilebattleship.png',
    board: 'space',
    isNPC: true,
    hangar: [
      { npcType: 'test2' },
      { npcType: 'test2' },
    ],
    missiles: { tactical: 2 },
    missileDamage: 7,
  },
}

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
  const fetchingRef = useRef(false)
  const pendingFetchRef = useRef(false)
  const attackingRef = useRef(new Set())
  const npcSpawnedRef = useRef(false)

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
    if (typesRes.data) setUnitTypes(typesRes.data)

    const dbUnits = unitsRes.data || []
    const npcUnits = (gameRes.data?.settings?.npcUnits || []).map(npc => ({
      ...npc,
      wg_unit_types: NPC_UNIT_TYPES[npc.npcType] || NPC_UNIT_TYPES.test1,
      isNPC: true,
    }))
    setUnits([...dbUnits, ...npcUnits])

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
    debounceRef.current = setTimeout(async () => {
      if (fetchingRef.current) {
        pendingFetchRef.current = true
        return
      }
      fetchingRef.current = true
      try {
        await fetchAll()
      } finally {
        fetchingRef.current = false
        if (pendingFetchRef.current) {
          pendingFetchRef.current = false
          debouncedFetch()
        }
      }
    }, 300)
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

  async function deployUnit(unitTypeId, row, col, opts) {
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

    if (unitType.name === 'Battleship' && !isAdmin) {
      const ccForMaterials = units.find(u => u.owner_id === userId && (u.wg_unit_types?.name === 'Command Ship'))
      if (!ccForMaterials) throw new Error('Need a Command Ship to build a Battleship')
      const inv = ccForMaterials.upgrades?.inventory || {}
      for (const [mat, qty] of Object.entries(BATTLESHIP_MATERIAL_COST)) {
        if ((inv[mat] || 0) < qty) throw new Error(`Not enough ${mat} (need ${qty}, have ${inv[mat] || 0})`)
      }
      const newInv = { ...inv }
      for (const [mat, qty] of Object.entries(BATTLESHIP_MATERIAL_COST)) {
        newInv[mat] = (newInv[mat] || 0) - qty
        if (newInv[mat] <= 0) delete newInv[mat]
      }
      const ccUpgrades = { ...(ccForMaterials.upgrades || {}), inventory: newInv }
      await supabase.from('wg_units').update({ upgrades: ccUpgrades }).eq('id', ccForMaterials.id)
    }

    const defaultUpgrades = {}
    const compartments = getCompartments(unitType.name)
    for (const comp of compartments) {
      if (comp.tiers && comp.slots > 0 && !comp.special) {
        const slots = new Array(comp.slots).fill(0)
        slots[0] = 1
        defaultUpgrades[comp.id] = slots
      }
    }
    if (opts?.shipModel) defaultUpgrades.shipModel = opts.shipModel

    const insertData = {
      game_id: gameId,
      owner_id: userId,
      unit_type_id: unitTypeId,
      grid_row: row,
      grid_col: col,
      current_hp: unitType.hp,
      board: unitBoard,
    }
    if (Object.keys(defaultUpgrades).length > 0) {
      insertData.upgrades = defaultUpgrades
    }
    const { error: unitError } = await supabase.from('wg_units').insert(insertData)
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
    if (unitBoard === 'space') maxRange += 3
    if (sourceTile?.has_road && destTile?.has_road) {
      maxRange += 2
    }

    const usedSoFar = unit.moves_used || 0
    const remaining = maxRange - usedSoFar

    const dist = hexDistance(unit.grid_row, unit.grid_col, newRow, newCol)
    if (dist > remaining) throw new Error('Too far')

    const occupied = units.find(u => u.grid_row === newRow && u.grid_col === newCol && u.id !== unitId && (u.board || 'ground') === unitBoard)
    if (occupied) throw new Error('Cell is occupied')

    const commandShipAdj = units.find(u => u.id !== unitId && (u.board || 'ground') === unitBoard
      && (u.wg_unit_types?.name === 'Command Ship' || u.wg_unit_types?.name === 'Command Center')
      && hexNeighborsOf(u.grid_row, u.grid_col).some(([nr, nc]) => nr === newRow && nc === newCol))
    if (commandShipAdj) throw new Error('Cell is adjacent to Command Ship')

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

  function getPlayerName(playerId) {
    const p = players.find(pl => pl.player_id === playerId)
    return p?.wg_profiles?.display_name || 'Unknown'
  }

  async function addBattleLogEntry(entry) {
    const { data: freshGame } = await supabase.from('wg_games').select('settings').eq('id', gameId).single()
    const settings = freshGame?.settings || {}
    const log = settings.battleLog || []
    log.push({ ...entry, timestamp: Date.now() })
    if (log.length > 100) log.splice(0, log.length - 100)
    await supabase.from('wg_games').update({ settings: { ...settings, battleLog: log } }).eq('id', gameId)
  }

  async function attackUnit(attackerId, targetId) {
    if (attackingRef.current.has(attackerId)) throw new Error('Attack in progress')
    const attacker = units.find(u => u.id === attackerId)
    const target = units.find(u => u.id === targetId)
    if (!attacker || !target) throw new Error('Invalid attack')
    if (attacker.owner_id !== userId) throw new Error('Not your unit')
    if (attacker.has_attacked) throw new Error('Unit already attacked')
    if (!target.isNPC && target.owner_id === userId) throw new Error("Can't attack your own unit")
    attackingRef.current.add(attackerId)
    setUnits(prev => prev.map(u => u.id === attackerId ? { ...u, has_attacked: true } : u))

    try {

    const dist = hexDistance(attacker.grid_row, attacker.grid_col, target.grid_row, target.grid_col)
    if (dist > getEffectiveAttackRange(attacker)) throw new Error('Out of range')

    const rawDamage = Math.max(1, attacker.wg_unit_types.attack - target.wg_unit_types.defense)
    const shield = getShieldHp(target.upgrades)
    const shieldAbsorbed = Math.min(shield.current, rawDamage)
    const hpDamage = rawDamage - shieldAbsorbed
    const newShieldHp = shield.current - shieldAbsorbed
    const newHp = target.current_hp - hpDamage

    const attackerName = attacker.wg_unit_types?.name || 'Unit'
    const targetName = target.isNPC ? (target.wg_unit_types?.name || 'creature') : (target.wg_unit_types?.name || 'Unit')
    const targetOwnerName = target.isNPC ? null : getPlayerName(target.owner_id)
    const killed = newHp <= 0

    await addBattleLogEntry({
      type: 'attack',
      attackerId: attacker.owner_id,
      attackerUnit: attackerName,
      targetId: target.isNPC ? null : target.owner_id,
      targetUnit: targetName,
      targetIsNPC: !!target.isNPC,
      attackerPlayerName: getPlayerName(attacker.owner_id),
      targetPlayerName: targetOwnerName,
      damage: rawDamage,
      shieldAbsorbed,
      killed,
    })

    if (target.isNPC) {
      const { data: freshGame } = await supabase.from('wg_games').select('settings').eq('id', gameId).single()
      const settings = freshGame?.settings || {}
      let npcUnits = settings.npcUnits || []
      if (newHp <= 0) {
        npcUnits = npcUnits.filter(n => n.id !== targetId)
      } else {
        npcUnits = npcUnits.map(n => n.id === targetId ? { ...n, current_hp: newHp } : n)
      }
      await supabase.from('wg_games').update({ settings: { ...settings, npcUnits } }).eq('id', gameId)
      await supabase.from('wg_units').update({ has_attacked: true }).eq('id', attackerId)
      await fetchAll()
      return
    }

    const shieldUpdate = shield.max > 0 ? { upgrades: { ...target.upgrades, shieldHp: newShieldHp, shieldMaxHp: shield.max } } : {}

    if (newHp <= 0) {
      const { error } = await supabase.from('wg_units').update({ current_hp: 0, is_alive: false, ...shieldUpdate }).eq('id', targetId)
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
      const { error } = await supabase.from('wg_units').update({ current_hp: newHp, ...shieldUpdate }).eq('id', targetId)
      if (error) throw error
    }

    const { error: atkError } = await supabase.from('wg_units').update({ has_attacked: true }).eq('id', attackerId)
    if (atkError) throw atkError

    await fetchAll()

    } finally {
      attackingRef.current.delete(attackerId)
    }
  }

  async function spawnNPCs(count = 5, npcType = 'test1') {
    if (!game) return
    const { data: freshGame } = await supabase.from('wg_games').select('*').eq('id', gameId).single()
    if (!freshGame) return
    const settings = freshGame.settings || {}
    const existing = settings.npcUnits || []

    const npcDef = NPC_UNIT_TYPES[npcType]
    if (!npcDef) return

    const occupiedSet = new Set()
    for (const u of units) occupiedSet.add(`${u.grid_row}-${u.grid_col}`)
    for (const n of existing) occupiedSet.add(`${n.grid_row}-${n.grid_col}`)

    const impassable = new Set(['ocean', 'mountain', 'lake', 'river'])
    const tilesByKey = new Map(tiles.map(t => [`${t.grid_row}-${t.grid_col}`, t]))

    const candidates = []
    for (let r = 0; r < freshGame.grid_rows; r++) {
      for (let c = 0; c < freshGame.grid_cols; c++) {
        const key = `${r}-${c}`
        if (occupiedSet.has(key)) continue
        const tile = tilesByKey.get(key)
        if (tile && impassable.has(tile.terrain)) continue
        candidates.push({ row: r, col: c })
      }
    }

    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }

    const newNPCs = []
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const spot = candidates[i]
      newNPCs.push({
        id: `npc-${crypto.randomUUID()}`,
        npcType,
        grid_row: spot.row,
        grid_col: spot.col,
        current_hp: npcDef.hp,
        board: 'ground',
        is_alive: true,
      })
    }

    await supabase.from('wg_games').update({
      settings: { ...settings, npcUnits: [...existing, ...newNPCs] }
    }).eq('id', gameId)
    await fetchAll()
  }

  async function buildRoad(unitId, row, col) {
    const unit = units.find(u => u.id === unitId)
    if (!unit || unit.owner_id !== userId) throw new Error('Not your unit')
    if (unit.wg_unit_types?.name !== 'Engineer') throw new Error('Only engineers can build roads')
    if (unit.has_attacked) throw new Error('Engineer already built this turn')

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
    if (unit.has_attacked) throw new Error('Engineer already acted this turn')

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

    const unitTile = tiles.find(t => t.grid_row === unit.grid_row && t.grid_col === unit.grid_col)
    if (unitTile?.has_road && unit.wg_unit_types?.name === 'Excavator') throw new Error('Cannot mine on a bridge')

    const upgrades = unit.upgrades || {}
    if (upgrades.mining) throw new Error('Already mining')
    if (upgrades.miningDisabled) throw new Error('Mining exhausted')

    const newUpgrades = {
      ...upgrades,
      mining: {
        active: true,
        layer: 0,
        turnsSinceLastDig: 0,
        centerRow: unit.grid_row,
        centerCol: unit.grid_col,
      },
    }

    const { error } = await supabase
      .from('wg_units')
      .update({ upgrades: newUpgrades })
      .eq('id', unitId)
    if (error) throw error

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
    if (compartmentId === 'shields') {
      const maxTier = Math.max(...slots.filter(s => s > 0), 0)
      newUpgrades.shieldHp = SHIELD_HP[maxTier] || 0
      newUpgrades.shieldMaxHp = SHIELD_HP[maxTier] || 0
    }
    const { error } = await supabase
      .from('wg_units')
      .update({ upgrades: newUpgrades })
      .eq('id', unitId)
    if (error) throw error

    await fetchAll()
  }

  async function buyMissile(unitId, missileType) {
    const unit = units.find(u => u.id === unitId)
    if (!unit) throw new Error('Unit not found')

    const MISSILE_COSTS = { tactical: 5, cruise: 10, ipbm: 20 }
    const cost = MISSILE_COSTS[missileType]
    if (!cost) throw new Error('Invalid missile type')

    const upgrades = unit.upgrades || {}
    const munitions = { ...(upgrades.munitions || { tactical: 0, cruise: 0, ipbm: 0 }) }
    if ((munitions[missileType] || 0) >= 10) throw new Error('Munitions full for this type')

    if (!isAdmin && teamGold < cost) throw new Error('Not enough gold')

    if (!isAdmin) {
      const perPlayer = Math.ceil(cost / teamPlayers.length)
      for (const tp of teamPlayers) {
        await supabase
          .from('wg_game_players')
          .update({ gold: Math.max(0, (tp.gold || 0) - perPlayer) })
          .eq('id', tp.id)
      }
    }

    munitions[missileType] = (munitions[missileType] || 0) + 1
    const newUpgrades = { ...upgrades, munitions }
    const { error } = await supabase
      .from('wg_units')
      .update({ upgrades: newUpgrades })
      .eq('id', unitId)
    if (error) throw error

    await fetchAll()
  }

  const MISSILE_DAMAGE = { tactical: 8, cruise: 15, ipbm: 20 }
  const MISSILE_RANGE = { tactical: 5, cruise: 8, ipbm: 999 }
  async function produceWarhead(unitId, warheadType) {
    const unit = units.find(u => u.id === unitId)
    if (!unit) throw new Error('Unit not found')
    const wh = WARHEAD_TYPES[warheadType]
    if (!wh) throw new Error('Invalid warhead type')

    if (!isAdmin && teamGold < wh.cost) throw new Error('Not enough gold')

    if (!isAdmin) {
      const perPlayer = Math.ceil(wh.cost / teamPlayers.length)
      for (const tp of teamPlayers) {
        await supabase
          .from('wg_game_players')
          .update({ gold: Math.max(0, (tp.gold || 0) - perPlayer) })
          .eq('id', tp.id)
      }
    }

    const upgrades = unit.upgrades || {}
    const munitions = { ...(upgrades.munitions || {}) }
    munitions[warheadType] = (munitions[warheadType] || 0) + 1
    const newUpgrades = { ...upgrades, munitions }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', unitId)
    await fetchAll()
  }

  async function fireMissile(shipId, missileType, targetRow, targetCol, targetBoard, warheadType) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const upgrades = ship.upgrades || {}
    if (upgrades.missileFiredThisTurn) throw new Error('Already fired a missile this turn')
    const munitions = { ...(upgrades.munitions || {}) }
    if ((munitions[missileType] || 0) <= 0) throw new Error('No munitions of this type')

    const wh = warheadType ? WARHEAD_TYPES[warheadType] : null
    if (warheadType && !wh) throw new Error('Invalid warhead type')
    if (warheadType && (munitions[warheadType] || 0) <= 0) throw new Error('No warheads of this type')
    if (warheadType && missileType !== 'ipbm') throw new Error('Warheads can only be mounted on IPBMs')

    const board = targetBoard || 'space'

    if (missileType !== 'ipbm' && board === 'ground') throw new Error('Only IPBM can strike ground targets')

    if (board === 'space') {
      const range = MISSILE_RANGE[missileType]
      const dist = hexDistance(ship.grid_row, ship.grid_col, targetRow, targetCol)
      if (dist > range) throw new Error('Target out of range')
    }

    munitions[missileType] = (munitions[missileType] || 0) - 1
    if (warheadType) munitions[warheadType] = (munitions[warheadType] || 0) - 1
    const damage = wh ? wh.damage : MISSILE_DAMAGE[missileType]
    const splashRadius = wh ? wh.radius : 2

    if (board === 'ground') {
      const pendingStrikes = [...(upgrades.pendingStrikes || [])]
      pendingStrikes.push({ row: targetRow, col: targetCol, damage, missileType, warheadType: warheadType || null, splashRadius })
      const newUpgrades = { ...upgrades, munitions, pendingStrikes, missileFiredThisTurn: true }
      await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)

      await addBattleLogEntry({
        type: 'missile_launch',
        attackerId: userId,
        attackerUnit: ship.wg_unit_types?.name,
        attackerPlayerName: getPlayerName(userId),
        missileType,
        warheadType: warheadType || null,
        targetBoard: 'ground',
        targetRow, targetCol,
        message: `${warheadType ? WARHEAD_TYPES[warheadType].name + ' ' : ''}${missileType.toUpperCase()} launched at ground X${targetRow}/Y${targetCol} — strikes next turn`,
      })

      await fetchAll()
      return
    }

    const boardUnits = units.filter(u => (u.board || 'ground') === 'space')
    const hitUnits = []
    for (const u of boardUnits) {
      if (u.id === shipId) continue
      if (!wh && u.owner_id === userId) continue
      const d = hexDistance(targetRow, targetCol, u.grid_row, u.grid_col)
      let dmg = 0
      if (wh) {
        if (d <= splashRadius) dmg = damage
      } else {
        if (d === 0) dmg = damage
        else if (d === 1) dmg = Math.floor(damage / 2)
        else if (d === 2) dmg = Math.floor(damage / 4)
      }
      if (dmg > 0) hitUnits.push({ unit: u, dmg, dist: d })
    }

    for (const { unit: target, dmg } of hitUnits) {
      if (target.isNPC) {
        const { data: freshGame } = await supabase.from('wg_games').select('settings').eq('id', gameId).single()
        const settings = freshGame?.settings || {}
        let npcUnits = settings.npcUnits || []
        const npc = npcUnits.find(n => n.id === target.id)
        if (npc) {
          const newHp = (npc.current_hp || target.wg_unit_types?.hp || 0) - dmg
          if (newHp <= 0) {
            npcUnits = npcUnits.filter(n => n.id !== target.id)
          } else {
            npcUnits = npcUnits.map(n => n.id === target.id ? { ...n, current_hp: newHp } : n)
          }
          await supabase.from('wg_games').update({ settings: { ...settings, npcUnits } }).eq('id', gameId)
        }
      } else {
        const shield = getShieldHp(target.upgrades)
        const shieldAbsorbed = Math.min(shield.current, dmg)
        const hpDamage = dmg - shieldAbsorbed
        const newShieldHp = shield.current - shieldAbsorbed
        const newHp = target.current_hp - hpDamage
        const shieldUpdate = shield.max > 0 ? { upgrades: { ...target.upgrades, shieldHp: newShieldHp, shieldMaxHp: shield.max } } : {}
        if (newHp <= 0) {
          await supabase.from('wg_units').update({ current_hp: 0, is_alive: false, ...shieldUpdate }).eq('id', target.id)
        } else {
          await supabase.from('wg_units').update({ current_hp: newHp, ...shieldUpdate }).eq('id', target.id)
        }
      }
    }

    const newUpgrades = { ...upgrades, munitions, missileFiredThisTurn: true }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)

    await addBattleLogEntry({
      type: 'missile_strike',
      attackerId: userId,
      attackerUnit: ship.wg_unit_types?.name,
      attackerPlayerName: getPlayerName(userId),
      missileType,
      warheadType: warheadType || null,
      targetBoard: 'space',
      targetRow, targetCol,
      unitsHit: hitUnits.length,
      damage,
    })

    await fetchAll()
  }

  async function processMissileStrikes() {
    const STRIKE_SHIPS = new Set(['Command Ship', 'Battleship'])
    const myShips = units.filter(u => u.owner_id === userId && STRIKE_SHIPS.has(u.wg_unit_types?.name))

    for (const ship of myShips) {
      const upgrades = ship.upgrades || {}
      const pendingStrikes = upgrades.pendingStrikes || []
      if (pendingStrikes.length === 0) continue

      const groundUnits = units.filter(u => (u.board || 'ground') === 'ground')
      const { data: freshGame } = await supabase.from('wg_games').select('settings').eq('id', gameId).single()
      const settings = freshGame?.settings || {}
      let npcUnits = [...(settings.npcUnits || [])]
      let npcChanged = false

      for (const strike of pendingStrikes) {
        const { row, col, damage, warheadType: strikeWarhead, splashRadius: strikeSplash } = strike
        const hasWarhead = !!strikeWarhead
        const radius = strikeSplash ?? 2

        for (const target of groundUnits) {
          if (!hasWarhead && target.owner_id === userId) continue
          const d = hexDistance(row, col, target.grid_row, target.grid_col)
          let dmg = 0
          if (hasWarhead) {
            if (d <= radius) dmg = damage
          } else {
            if (d === 0) dmg = damage
            else if (d === 1) dmg = Math.floor(damage / 2)
            else if (d === 2) dmg = Math.floor(damage / 4)
          }
          if (dmg <= 0) continue

          if (target.isNPC) {
            const npc = npcUnits.find(n => n.id === target.id)
            if (npc) {
              const newHp = (npc.current_hp || target.wg_unit_types?.hp || 0) - dmg
              if (newHp <= 0) {
                npcUnits = npcUnits.filter(n => n.id !== target.id)
              } else {
                npcUnits = npcUnits.map(n => n.id === target.id ? { ...n, current_hp: newHp } : n)
              }
              npcChanged = true
            }
          } else {
            const shield = getShieldHp(target.upgrades)
            const shieldAbsorbed = Math.min(shield.current, dmg)
            const hpDamage = dmg - shieldAbsorbed
            const newShieldHp = shield.current - shieldAbsorbed
            const newHp = target.current_hp - hpDamage
            const shieldUpdate = shield.max > 0 ? { upgrades: { ...target.upgrades, shieldHp: newShieldHp, shieldMaxHp: shield.max } } : {}
            if (newHp <= 0) {
              await supabase.from('wg_units').update({ current_hp: 0, is_alive: false, ...shieldUpdate }).eq('id', target.id)
            } else {
              await supabase.from('wg_units').update({ current_hp: newHp, ...shieldUpdate }).eq('id', target.id)
            }
          }
        }

        if (hasWarhead) {
          const craterRadius = strikeWarhead === 'thermonuclear' ? 5 : 3
          const groundTiles = tiles.filter(t => (t.board || 'ground') === 'ground')
          let seed = (row * 7919 + col * 104729 + Date.now()) & 0x7fffffff
          const craterRand = () => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff }

          const craterTiles = []
          for (const tile of groundTiles) {
            const d = hexDistance(row, col, tile.grid_row, tile.grid_col)
            if (d > craterRadius + 1) continue
            if (d <= craterRadius - 2) {
              craterTiles.push({ tile, terrain: 'crater_inner' })
            } else if (d === craterRadius - 1) {
              craterTiles.push({ tile, terrain: craterRand() < 0.7 ? 'crater_inner' : 'crater_outer' })
            } else if (d === craterRadius) {
              craterTiles.push({ tile, terrain: craterRand() < 0.55 ? 'crater_outer' : null })
            } else if (d === craterRadius + 1) {
              if (craterRand() < 0.2) craterTiles.push({ tile, terrain: 'crater_outer' })
            }
          }
          for (const { tile, terrain } of craterTiles) {
            if (!terrain) continue
            await supabase.from('wg_game_tiles')
              .update({ terrain, resource: null, has_road: false })
              .eq('game_id', gameId)
              .eq('grid_row', tile.grid_row)
              .eq('grid_col', tile.grid_col)
              .eq('board', 'ground')
          }
        }

        await addBattleLogEntry({
          type: 'missile_impact',
          attackerId: userId,
          attackerUnit: ship.wg_unit_types?.name,
          attackerPlayerName: getPlayerName(userId),
          missileType: strike.missileType,
          warheadType: strikeWarhead || null,
          targetBoard: 'ground',
          targetRow: row, targetCol: col,
          damage,
        })
      }

      if (npcChanged) {
        await supabase.from('wg_games').update({ settings: { ...settings, npcUnits } }).eq('id', gameId)
      }

      const newUpgrades = { ...upgrades, pendingStrikes: [] }
      await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', ship.id)
    }
  }

  function getGuildConvoys(upgrades) {
    if (upgrades.guildConvoys) return [...upgrades.guildConvoys]
    if (upgrades.guildConvoy) return [upgrades.guildConvoy]
    return []
  }

  async function sendConvoyToGuild(shipId, convoyIndex) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')
    if ((ship.board || 'ground') !== 'space') throw new Error('Only space units can trade with the Space Guild')

    const upgrades = ship.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy || convoy.inTransit) throw new Error('Convoy not available')

    const guildConvoys = getGuildConvoys(upgrades)
    if (guildConvoys.length >= 2) throw new Error('Guild convoy bay is full')
    if (guildConvoys.some(gc => gc.inTransit)) throw new Error('A convoy is already en route to the Space Guild')

    convoys.splice(convoyIndex, 1)

    guildConvoys.push({
      units: [...(convoy.units || [])],
      cargo: { ...(convoy.cargo || {}) },
      inTransit: true,
      turnsLeft: 3,
    })

    const newUpgrades = { ...upgrades, convoys, guildConvoys, guildConvoy: undefined }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function sellAtGuild(shipId, convoyIdx, sellUnits, sellResources) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const upgrades = ship.upgrades || {}
    const guildConvoys = getGuildConvoys(upgrades)
    const gc = guildConvoys[convoyIdx]
    if (!gc || gc.inTransit) throw new Error('No convoy docked at the Space Guild')

    let goldEarned = 0
    const remainingUnits = [...(gc.units || [])]
    const cargo = { ...(gc.cargo || {}), resources: { ...(gc.cargo?.resources || {}) } }

    if (sellUnits && sellUnits.length > 0) {
      for (const idx of [...sellUnits].sort((a, b) => b - a)) {
        if (idx >= 0 && idx < remainingUnits.length) {
          const u = remainingUnits.splice(idx, 1)[0]
          goldEarned += u.cost || 10
        }
      }
    }

    const RESOURCE_VALUES = {
      coal: 3, iron: 5, uranium: 8, aluminum: 4, tritium: 10,
      ruby: 15, sapphire: 15, diamond: 20, amethyst: 12, quasicrystals: 25,
    }

    if (sellResources) {
      for (const [key, amount] of Object.entries(sellResources)) {
        const available = cargo.resources[key] || 0
        const sellAmt = Math.min(amount, available)
        if (sellAmt > 0) {
          goldEarned += sellAmt * (RESOURCE_VALUES[key] || 5)
          cargo.resources[key] = available - sellAmt
          if (cargo.resources[key] <= 0) delete cargo.resources[key]
        }
      }
    }

    const isEmpty = remainingUnits.length === 0 &&
      (cargo.gold || 0) === 0 &&
      Object.values(cargo.resources || {}).every(v => v <= 0)

    if (isEmpty) {
      guildConvoys.splice(convoyIdx, 1)
    } else {
      guildConvoys[convoyIdx] = { ...gc, units: remainingUnits, cargo, inTransit: false }
    }

    await supabase.from('wg_units').update({
      upgrades: { ...upgrades, guildConvoys, guildConvoy: undefined }
    }).eq('id', shipId)

    if (goldEarned > 0 && !isAdmin) {
      const perPlayer = Math.ceil(goldEarned / teamPlayers.length)
      for (const tp of teamPlayers) {
        await supabase.from('wg_game_players').update({ gold: (tp.gold || 0) + perPlayer }).eq('id', tp.id)
      }
    }

    await fetchAll()
    return goldEarned
  }

  async function buyUnitAtGuild(shipId, convoyIdx, unitTypeId) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const ut = unitTypes.find(t => t.id === unitTypeId)
    if (!ut) throw new Error('Unit type not found')

    const upgrades = ship.upgrades || {}
    const guildConvoys = getGuildConvoys(upgrades)
    const gc = guildConvoys[convoyIdx]
    if (!gc || gc.inTransit) throw new Error('No convoy docked at the Space Guild')

    const cost = ut.cost
    if (!isAdmin) {
      const totalGold = teamPlayers.reduce((s, p) => s + (p.gold || 0), 0)
      if (totalGold < cost) throw new Error('Not enough gold')
    }

    const unitEntry = {
      typeName: ut.name,
      typeId: ut.id,
      hp: ut.hp,
      cost: ut.cost,
    }

    const updatedUnits = [...(gc.units || []), unitEntry]
    guildConvoys[convoyIdx] = { ...gc, units: updatedUnits }

    await supabase.from('wg_units').update({
      upgrades: { ...upgrades, guildConvoys, guildConvoy: undefined }
    }).eq('id', shipId)

    if (!isAdmin) {
      let remaining = cost
      for (const tp of teamPlayers) {
        const deduct = Math.min(remaining, tp.gold || 0)
        if (deduct > 0) {
          await supabase.from('wg_game_players').update({ gold: (tp.gold || 0) - deduct }).eq('id', tp.id)
          remaining -= deduct
        }
        if (remaining <= 0) break
      }
    }

    await fetchAll()
  }

  async function buyMunitionAtGuild(shipId, convoyIdx, missileType) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const MISSILE_COSTS = { tactical: 5, cruise: 10, ipbm: 20 }
    const cost = MISSILE_COSTS[missileType]
    if (!cost) throw new Error('Invalid missile type')

    const upgrades = ship.upgrades || {}
    const guildConvoys = getGuildConvoys(upgrades)
    const gc = guildConvoys[convoyIdx]
    if (!gc || gc.inTransit) throw new Error('No convoy docked at the Space Guild')

    if (!isAdmin) {
      const totalGold = teamPlayers.reduce((s, p) => s + (p.gold || 0), 0)
      if (totalGold < cost) throw new Error('Not enough gold')
    }

    const munitions = { ...(gc.munitions || { tactical: 0, cruise: 0, ipbm: 0 }) }
    munitions[missileType] = (munitions[missileType] || 0) + 1
    guildConvoys[convoyIdx] = { ...gc, munitions }

    await supabase.from('wg_units').update({
      upgrades: { ...upgrades, guildConvoys, guildConvoy: undefined }
    }).eq('id', shipId)

    if (!isAdmin) {
      let remaining = cost
      for (const tp of teamPlayers) {
        const deduct = Math.min(remaining, tp.gold || 0)
        if (deduct > 0) {
          await supabase.from('wg_game_players').update({ gold: (tp.gold || 0) - deduct }).eq('id', tp.id)
          remaining -= deduct
        }
        if (remaining <= 0) break
      }
    }

    await fetchAll()
  }

  async function returnConvoyFromGuild(shipId, convoyIdx) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const upgrades = ship.upgrades || {}
    const guildConvoys = getGuildConvoys(upgrades)
    const gc = guildConvoys[convoyIdx]
    if (!gc || gc.inTransit) throw new Error('No convoy docked at the Space Guild')

    const convoys = [...(upgrades.convoys || [])]
    if (convoys.length >= 2) throw new Error('Convoy bays full')

    const convoyMunitions = gc.munitions || {}
    const shipMunitions = { ...(upgrades.munitions || { tactical: 0, cruise: 0, ipbm: 0 }) }
    for (const [key, amount] of Object.entries(convoyMunitions)) {
      if (amount > 0) {
        shipMunitions[key] = Math.min(10, (shipMunitions[key] || 0) + amount)
      }
    }

    convoys.push({ units: gc.units || [], cargo: gc.cargo || {}, inTransit: false })
    guildConvoys.splice(convoyIdx, 1)
    await supabase.from('wg_units').update({
      upgrades: { ...upgrades, convoys, guildConvoys, guildConvoy: undefined, munitions: shipMunitions }
    }).eq('id', shipId)
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
    if (holdingBay.length >= getBarracksCapacity(ship)) throw new Error('Holding bay full')

    const removed = convoy.units.splice(unitIndex, 1)[0]
    holdingBay.push(removed)
    convoys[convoyIndex] = convoy

    const newUpgrades = { ...upgrades, convoys, holdingBay }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function sendConvoy(shipId, convoyIndex, destinationId) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const upgrades = ship.upgrades || {}
    const convoys = [...(upgrades.convoys || [])]
    const convoy = convoys[convoyIndex]
    if (!convoy || convoy.inTransit) throw new Error('Already in transit')

    if (destinationId === 'space_guild') {
      return sendConvoyToGuild(shipId, convoyIndex)
    }

    let dest
    if (destinationId) {
      dest = units.find(u => u.id === destinationId && u.owner_id === ship.owner_id)
    } else {
      const isCommandShip = ship.wg_unit_types?.name === 'Command Ship'
      const destType = isCommandShip ? 'Command Center' : 'Command Ship'
      dest = units.find(u => u.owner_id === ship.owner_id && u.wg_unit_types?.name === destType)
    }
    if (!dest) throw new Error('No destination found to receive convoy')

    convoys.splice(convoyIndex, 1)
    await supabase.from('wg_units').update({ upgrades: { ...upgrades, convoys } }).eq('id', shipId)

    const { data: freshDest } = await supabase.from('wg_units').select('upgrades').eq('id', dest.id).single()
    const destUpgrades = freshDest?.upgrades || {}
    const destConvoys = [...(destUpgrades.convoys || [])]
    destConvoys.push({
      units: [...(convoy.units || [])],
      cargo: { ...(convoy.cargo || {}) },
      inTransit: true,
      turnsLeft: 3,
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
      const maxSlots = getConvoySlots(ship)
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
      if (holdingBay.length >= getBarracksCapacity(ship)) throw new Error('Barracks full')

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

  async function deployFromHangar(shipId, hangarIndex, row, col) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    if (row === ship.grid_row && col === ship.grid_col) throw new Error('Cannot deploy on the structure tile')
    const shipBoard = ship.board || 'ground'
    const occupied = units.find(u => u.grid_row === row && u.grid_col === col && (u.board || 'ground') === shipBoard)
    if (occupied) throw new Error('Tile is occupied')

    const upgrades = ship.upgrades || {}
    const hangar = [...(upgrades.hangar || [])]
    if (hangarIndex < 0 || hangarIndex >= hangar.length) throw new Error('Invalid hangar index')

    const storedUnit = hangar.splice(hangarIndex, 1)[0]

    const { error, data: inserted } = await supabase.from('wg_units').insert({
      game_id: gameId,
      owner_id: userId,
      unit_type_id: storedUnit.typeId,
      grid_row: row,
      grid_col: col,
      current_hp: storedUnit.hp,
      board: shipBoard,
      has_moved: true,
      has_attacked: true,
      moves_used: 99,
      is_alive: true,
      upgrades: { hangarCooldown: 5 },
    }).select('id').single()
    if (error) throw error

    const newUpgrades = { ...upgrades, hangar }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function produceUnitToHangar(shipId, unitTypeId, unitTypeName) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')

    const ut = unitTypes.find(t => t.id === unitTypeId)
    if (!ut) throw new Error('Unit type not found')

    const upgrades = ship.upgrades || {}
    const hangar = [...(upgrades.hangar || [])]
    if (hangar.length >= getHangarCapacity(ship)) throw new Error('Hangar full')

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

    hangar.push({
      typeId: unitTypeId,
      typeName: unitTypeName,
      hp: ut.hp,
    })

    const newUpgrades = { ...upgrades, hangar }
    await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', shipId)
    await fetchAll()
  }

  async function transferHangarUnit(fromShipId, hangarIndex, toShipId) {
    const fromShip = units.find(u => u.id === fromShipId)
    const toShip = units.find(u => u.id === toShipId)
    if (!fromShip || !toShip) throw new Error('Ship not found')

    const fromUpgrades = fromShip.upgrades || {}
    const toUpgrades = toShip.upgrades || {}
    const fromHangar = [...(fromUpgrades.hangar || [])]
    const toHangar = [...(toUpgrades.hangar || [])]

    if (hangarIndex < 0 || hangarIndex >= fromHangar.length) throw new Error('Invalid hangar index')
    if (toHangar.length >= getHangarCapacity(toShip)) throw new Error('Destination hangar full')

    const transferred = fromHangar.splice(hangarIndex, 1)[0]
    toHangar.push(transferred)

    await Promise.all([
      supabase.from('wg_units').update({ upgrades: { ...fromUpgrades, hangar: fromHangar } }).eq('id', fromShipId),
      supabase.from('wg_units').update({ upgrades: { ...toUpgrades, hangar: toHangar } }).eq('id', toShipId),
    ])
    await fetchAll()
  }

  async function transferAllHangar(fromShipId, toShipId) {
    const fromShip = units.find(u => u.id === fromShipId)
    const toShip = units.find(u => u.id === toShipId)
    if (!fromShip || !toShip) throw new Error('Ship not found')

    const fromUpgrades = fromShip.upgrades || {}
    const toUpgrades = toShip.upgrades || {}
    const fromHangar = [...(fromUpgrades.hangar || [])]
    const toHangar = [...(toUpgrades.hangar || [])]
    const toCapacity = getHangarCapacity(toShip)
    const slotsAvailable = toCapacity - toHangar.length
    if (slotsAvailable <= 0) throw new Error('Destination hangar full')

    const transferCount = Math.min(fromHangar.length, slotsAvailable)
    const moved = fromHangar.splice(0, transferCount)
    toHangar.push(...moved)

    await Promise.all([
      supabase.from('wg_units').update({ upgrades: { ...fromUpgrades, hangar: fromHangar } }).eq('id', fromShipId),
      supabase.from('wg_units').update({ upgrades: { ...toUpgrades, hangar: toHangar } }).eq('id', toShipId),
    ])
    await fetchAll()
  }

  async function addToHangar(shipId, unitId) {
    const ship = units.find(u => u.id === shipId)
    if (!ship) throw new Error('Ship not found')
    const target = units.find(u => u.id === unitId)
    if (!target) throw new Error('Unit not found')
    if (target.owner_id !== ship.owner_id) throw new Error('Not your unit')

    const cooldown = target.upgrades?.hangarCooldown || 0
    if (cooldown > 0) throw new Error(`Unit must wait ${cooldown} more turns`)

    const d = hexDistance(ship.grid_row, ship.grid_col, target.grid_row, target.grid_col)
    if (d > 4) throw new Error('Unit too far away (max 4 tiles)')

    const shipUpgrades = ship.upgrades || {}
    const hangar = [...(shipUpgrades.hangar || [])]
    if (hangar.length >= getHangarCapacity(ship)) throw new Error('Hangar full')

    const typeName = target.wg_unit_types?.name
    if (!HANGAR_ELIGIBLE.has(typeName)) throw new Error('This unit cannot enter a hangar')

    hangar.push({
      typeId: target.unit_type_id,
      typeName,
      hp: target.current_hp,
    })

    await Promise.all([
      supabase.from('wg_units').delete().eq('id', unitId),
      supabase.from('wg_units').update({ upgrades: { ...shipUpgrades, hangar } }).eq('id', shipId),
    ])
    await fetchAll()
  }

  async function buyAndLoadToTransport(structId, transportIndex, unitTypeId, unitTypeName) {
    const struct = units.find(u => u.id === structId)
    if (!struct) throw new Error('Structure not found')

    const ut = unitTypes.find(t => t.id === unitTypeId)
    if (!ut) throw new Error('Unit type not found')

    const upgrades = struct.upgrades || {}
    const loadingBay = [...(upgrades.loadingBay || [])]
    const transport = loadingBay[transportIndex]
    if (!transport) throw new Error('Transport not found')
    if ((transport.units || []).length >= 4) throw new Error('Transport full (max 4)')

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

    transport.units = [...(transport.units || []), {
      typeId: unitTypeId,
      typeName: unitTypeName,
      hp: ut.hp,
    }]
    loadingBay[transportIndex] = transport

    await supabase.from('wg_units').update({ upgrades: { ...upgrades, loadingBay } }).eq('id', structId)
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
    const maxSlots = getConvoySlots(struct)
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
    if (holdingBay.length >= getBarracksCapacity(struct)) throw new Error('Holding bay full')

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
      upgrades: { deployedFromTransport: true },
    })
    if (error) throw error

    await supabase.from('wg_units').update({ upgrades: { ...transport.upgrades, loadedUnits: remaining } }).eq('id', transportId)
    await fetchAll()
  }

  async function setAutoPath(unitId, path) {
    const unit = units.find(u => u.id === unitId)
    if (!unit || unit.owner_id !== userId) throw new Error('Not your unit')
    const upgrades = unit.upgrades || {}
    await supabase.from('wg_units').update({ upgrades: { ...upgrades, autoPath: path } }).eq('id', unitId)
    await fetchAll()
  }

  async function clearAutoPath(unitId) {
    const unit = units.find(u => u.id === unitId)
    if (!unit) return
    const upgrades = { ...(unit.upgrades || {}) }
    delete upgrades.autoPath
    await supabase.from('wg_units').update({ upgrades }).eq('id', unitId)
    await fetchAll()
  }

  async function boardSoldierToTransport(soldierUnitId, transportUnitId) {
    const soldier = units.find(u => u.id === soldierUnitId)
    if (!soldier) throw new Error('Unit not found')
    if (soldier.owner_id !== userId) throw new Error('Not your unit')
    if (soldier.upgrades?.deployedFromTransport) throw new Error('Cannot re-enter transport on the same turn')

    const transport = units.find(u => u.id === transportUnitId)
    if (!transport) throw new Error('Transport not found')
    if (transport.wg_unit_types?.name !== 'Armor Transport') throw new Error('Not a transport')
    if (transport.owner_id !== userId) throw new Error('Not your transport')

    const dist = hexDistance(soldier.grid_row, soldier.grid_col, transport.grid_row, transport.grid_col)
    if (dist > 1) throw new Error('Must be adjacent to transport')

    const loaded = transport.upgrades?.loadedUnits || []
    if (loaded.length >= 4) throw new Error('Transport full (max 4)')

    const updatedLoaded = [...loaded, {
      typeId: soldier.unit_type_id,
      typeName: soldier.wg_unit_types?.name || 'Unknown',
      hp: soldier.current_hp,
    }]

    await supabase.from('wg_units').update({ is_alive: false }).eq('id', soldierUnitId)
    await supabase.from('wg_units').update({ upgrades: { ...transport.upgrades, loadedUnits: updatedLoaded } }).eq('id', transportUnitId)
    await fetchAll()
  }

  async function processMiningTicks() {
    const myUnits = units.filter(u => u.owner_id === userId)
    const miners = myUnits.filter(u => {
      const name = u.wg_unit_types?.name
      return (name === 'Mining Station' || name === 'Excavator') && u.upgrades?.mining?.active
    })
    if (miners.length === 0) return

    const claimedTiles = new Map()
    for (const miner of miners) {
      const m = miner.upgrades.mining
      const centerR = m.centerRow
      const centerC = m.centerCol
      const tiles = [[centerR, centerC], ...hexNeighborsOf(centerR, centerC)]
      for (const [r, c] of tiles) {
        const key = `${r}-${c}`
        if (!claimedTiles.has(key)) claimedTiles.set(key, miner.id)
      }
    }

    const tilesByKey = new Map(tiles.map(t => [`${t.grid_row}-${t.grid_col}`, t]))
    const GROUND_EXCLUDED = new Set(['ocean', 'lake', 'river', 'mountain'])
    const SPACE_EXCLUDED = new Set(['void', 'nebula', 'nebula_core', 'nebula_bright', 'nebula_hotspot', 'star'])

    for (const miner of miners) {
      const mining = { ...miner.upgrades.mining }
      const unitBoard = miner.board || 'ground'
      const isSpace = unitBoard === 'space'
      const oreTable = isSpace ? SPACE_ORES : GROUND_ORES
      const excluded = isSpace ? SPACE_EXCLUDED : GROUND_EXCLUDED

      mining.turnsSinceLastDig = (mining.turnsSinceLastDig || 0) + 1

      if (mining.turnsSinceLastDig >= 3) {
        mining.turnsSinceLastDig = 0
        mining.layer = (mining.layer || 0) + 1

        if (mining.layer <= 120) {
          const centerR = mining.centerRow
          const centerC = mining.centerCol
          const allTiles = [[centerR, centerC], ...hexNeighborsOf(centerR, centerC)]
          const mineTiles = allTiles.filter(([r, c]) => {
            if (claimedTiles.get(`${r}-${c}`) !== miner.id) return false
            const td = tilesByKey.get(`${r}-${c}`)
            if (!td) return false
            if (td.has_road && !isSpace) return false
            return !excluded.has(td.terrain)
          })

          const seed = centerR * 1000 + centerC * 7 + mining.layer * 31 + (miner.id?.charCodeAt?.(0) || 0)
          const rand = seededRandFromHash(seed)

          const ccUnit = myUnits.find(u => {
            const n = u.wg_unit_types?.name
            return isSpace ? n === 'Command Ship' : n === 'Command Center'
          })

          if (ccUnit) {
            const ccUpgrades = { ...(ccUnit.upgrades || {}) }
            const inventory = { ...(ccUpgrades.inventory || {}) }
            let changed = false

            for (let t = 0; t < mineTiles.length; t++) {
              const roll = rand()
              for (const ore of Object.values(oreTable)) {
                const depthFrac = Math.min(mining.layer / 120, 1)
                const depthBonus = ore.deep ? depthFrac * 0.06 : depthFrac * 0.02
                if (roll < ore.chance + depthBonus) {
                  const amt = ore.minAmt + Math.floor(rand() * (ore.maxAmt - ore.minAmt + 1))
                  inventory[ore.id] = (inventory[ore.id] || 0) + amt
                  changed = true
                  break
                }
              }
            }

            if (changed) {
              ccUpgrades.inventory = inventory
              await supabase.from('wg_units').update({ upgrades: ccUpgrades }).eq('id', ccUnit.id)
            }
          }
        }

        if (mining.layer >= 120) {
          const newUpgrades = { ...miner.upgrades, miningDisabled: true }
          delete newUpgrades.mining
          await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', miner.id)
          continue
        }
      }

      const newUpgrades = { ...miner.upgrades, mining }
      await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', miner.id)
    }
  }

  async function processConvoyTicks() {
    const CONVOY_HOSTS = new Set(['Command Center', 'Command Ship', 'Battleship'])
    const myStructures = units.filter(u => u.owner_id === userId && CONVOY_HOSTS.has(u.wg_unit_types?.name))

    for (const struct of myStructures) {
      const upgrades = struct.upgrades || {}
      const convoys = upgrades.convoys || []
      const guildConvoys = upgrades.guildConvoys || []
      let changed = false

      const newConvoys = convoys.map(c => {
        if (!c.inTransit) return c
        const updated = { ...c, turnsLeft: (c.turnsLeft || 1) - 1 }
        if (updated.turnsLeft <= 0) {
          updated.inTransit = false
          updated.turnsLeft = 0
        }
        changed = true
        return updated
      })

      const newGuildConvoys = guildConvoys.map(c => {
        if (!c.inTransit) return c
        const updated = { ...c, turnsLeft: (c.turnsLeft || 1) - 1 }
        if (updated.turnsLeft <= 0) {
          updated.inTransit = false
          updated.turnsLeft = 0
        }
        changed = true
        return updated
      })

      if (changed) {
        const newUpgrades = { ...upgrades, convoys: newConvoys }
        if (guildConvoys.length > 0) newUpgrades.guildConvoys = newGuildConvoys
        await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', struct.id)
      }
    }
  }

  async function processNPCTicks() {
    const { data: freshGame } = await supabase.from('wg_games').select('settings').eq('id', gameId).single()
    if (!freshGame) return
    const settings = freshGame.settings || {}
    let npcUnits = [...(settings.npcUnits || [])]
    if (npcUnits.length === 0) return

    const { data: freshUnits } = await supabase.from('wg_units').select('*, wg_unit_types(*)').eq('game_id', gameId).eq('is_alive', true)
    let playerUnits = (freshUnits || []).filter(u => u.owner_id)
    if (playerUnits.length === 0) return

    const spaceImpassable = new Set(['asteroid', 'large_asteroid', 'star'])
    const spaceTileMap = new Map(tiles.filter(t => (t.board || 'ground') === 'space').map(t => [`${t.grid_row}-${t.grid_col}`, t]))
    const rows = freshGame.grid_rows
    const cols = freshGame.grid_cols

    let changed = false
    let battleLogArr = settings.battleLog || []

    function applyDamageToPlayer(target, damage, attackerName) {
      const shield = getShieldHp(target.upgrades)
      const shieldAbsorbed = Math.min(shield.current, damage)
      const hpDamage = damage - shieldAbsorbed
      const newShieldHp = shield.current - shieldAbsorbed
      const newHp = target.current_hp - hpDamage
      const killed = newHp <= 0

      battleLogArr = [...battleLogArr, {
        type: 'attack', attackerId: null, attackerUnit: attackerName,
        targetId: target.owner_id, targetUnit: target.wg_unit_types?.name || 'Unit',
        targetIsNPC: false, attackerPlayerName: 'Hostile Creature', targetPlayerName: null,
        damage, shieldAbsorbed, killed, timestamp: Date.now(),
      }]

      target.current_hp = newHp
      if (shield.max > 0) {
        target.upgrades = { ...target.upgrades, shieldHp: newShieldHp, shieldMaxHp: shield.max }
      }
      return { newHp, killed, shieldUpdate: shield.max > 0 ? { upgrades: target.upgrades } : {} }
    }

    for (let ni = 0; ni < npcUnits.length; ni++) {
      const npc = npcUnits[ni]
      const npcDef = NPC_UNIT_TYPES[npc.npcType]
      if (!npcDef || npcDef.board !== 'space') continue

      const visibility = npcDef.visibility || 2
      const attackRange = npcDef.attack_range || 1
      const movement = npcDef.movement || 1

      const spacePlayerUnits = playerUnits.filter(u => (u.board || 'ground') === 'space' && u.current_hp > 0)
      const targets = spacePlayerUnits
        .map(u => ({ unit: u, dist: hexDistance(npc.grid_row, npc.grid_col, u.grid_row, u.grid_col) }))
        .filter(t => t.dist <= visibility)
        .sort((a, b) => a.dist - b.dist)

      if (targets.length === 0) continue

      const closest = targets[0]

      // Warship: deploy hangar units when targets sighted
      if (npc.hangar && npc.hangar.length > 0) {
        const npcPositions = new Set(npcUnits.map(n => `${n.grid_row}-${n.grid_col}`))
        const unitPositions = new Set(spacePlayerUnits.map(u => `${u.grid_row}-${u.grid_col}`))
        const toRemove = []
        for (let hi = 0; hi < npc.hangar.length; hi++) {
          const hUnit = npc.hangar[hi]
          const hDef = NPC_UNIT_TYPES[hUnit.npcType]
          if (!hDef) continue
          const odd = npc.grid_row & 1
          const dirs = odd
            ? [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]]
            : [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]]
          let placed = false
          for (const [dr, dc] of dirs) {
            const nr = npc.grid_row + dr, nc = npc.grid_col + dc
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
            const nk = `${nr}-${nc}`
            const tile = spaceTileMap.get(nk)
            if (tile && spaceImpassable.has(tile.terrain)) continue
            if (unitPositions.has(nk) || npcPositions.has(nk)) continue
            npcUnits.push({
              id: `npc-${Date.now()}-deploy-${ni}-${hi}`,
              npcType: hUnit.npcType,
              grid_row: nr, grid_col: nc,
              board: 'space',
              current_hp: hDef.hp,
              owner_id: null,
            })
            npcPositions.add(nk)
            toRemove.push(hi)
            placed = true
            break
          }
        }
        if (toRemove.length > 0) {
          npc.hangar = npc.hangar.filter((_, i) => !toRemove.includes(i))
          npcUnits[ni] = { ...npcUnits[ni], hangar: npc.hangar }
          changed = true
        }
      }

      // Warship: fire 1 missile per turn
      if (npc.missiles) {
        const missileTypes = Object.keys(npc.missiles)
        for (const mType of missileTypes) {
          if ((npc.missiles[mType] || 0) <= 0) continue
          const missileDmg = npcDef.missileDamage || 7
          const target = closest.unit
          if (target.current_hp <= 0) break

          const result = applyDamageToPlayer(target, missileDmg, npcDef.name + ' Missile')
          if (result.killed) {
            await supabase.from('wg_units').update({ current_hp: 0, is_alive: false, ...result.shieldUpdate }).eq('id', target.id)
          } else {
            await supabase.from('wg_units').update({ current_hp: result.newHp, ...result.shieldUpdate }).eq('id', target.id)
          }
          npc.missiles = { ...npc.missiles, [mType]: npc.missiles[mType] - 1 }
          npcUnits[ni] = { ...npcUnits[ni], missiles: npc.missiles }
          changed = true
          break
        }
      }

      // Cannon attack if in range (before moving)
      let hasAttacked = false
      if (closest.dist <= attackRange && closest.unit.current_hp > 0) {
        const damage = Math.max(1, npcDef.attack - (closest.unit.wg_unit_types?.defense || 0))
        const result = applyDamageToPlayer(closest.unit, damage, npcDef.name)
        if (result.killed) {
          await supabase.from('wg_units').update({ current_hp: 0, is_alive: false, ...result.shieldUpdate }).eq('id', closest.unit.id)
        } else {
          await supabase.from('wg_units').update({ current_hp: result.newHp, ...result.shieldUpdate }).eq('id', closest.unit.id)
        }
        changed = true
        hasAttacked = true
      }

      // Move toward target if not already in attack range
      if (!hasAttacked || closest.dist > attackRange) {
        const targetR = closest.unit.grid_row
        const targetC = closest.unit.grid_col
        let curR = npcUnits[ni].grid_row
        let curC = npcUnits[ni].grid_col
        let stepsLeft = movement

        const npcPositions = new Set(npcUnits.map(n => `${n.grid_row}-${n.grid_col}`))
        const unitPositions = new Set(spacePlayerUnits.filter(u => u.current_hp > 0).map(u => `${u.grid_row}-${u.grid_col}`))
        for (const pu of spacePlayerUnits) {
          if (pu.current_hp > 0 && (pu.wg_unit_types?.name === 'Command Ship' || pu.wg_unit_types?.name === 'Command Center')) {
            for (const [nr, nc] of hexNeighborsOf(pu.grid_row, pu.grid_col)) {
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) unitPositions.add(`${nr}-${nc}`)
            }
          }
        }

        while (stepsLeft > 0) {
          const odd = curR & 1
          const dirs = odd
            ? [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]]
            : [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]]

          const curDist = hexDistance(curR, curC, targetR, targetC)
          const candidates = []
          for (const [dr, dc] of dirs) {
            const nr = curR + dr, nc = curC + dc
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
            const nk = `${nr}-${nc}`
            const tile = spaceTileMap.get(nk)
            if (tile && spaceImpassable.has(tile.terrain)) continue
            if (unitPositions.has(nk)) continue
            if (npcPositions.has(nk) && !(nr === npcUnits[ni].grid_row && nc === npcUnits[ni].grid_col)) continue
            candidates.push({ r: nr, c: nc, dist: hexDistance(nr, nc, targetR, targetC) })
          }
          if (candidates.length === 0) break
          candidates.sort((a, b) => a.dist - b.dist)
          const best = candidates[0]
          if (best.dist > curDist + 1) break
          npcPositions.delete(`${curR}-${curC}`)
          curR = best.r
          curC = best.c
          npcPositions.add(`${curR}-${curC}`)
          stepsLeft--
          if (hexDistance(curR, curC, targetR, targetC) <= attackRange) break
        }

        if (curR !== npcUnits[ni].grid_row || curC !== npcUnits[ni].grid_col) {
          npcUnits[ni] = { ...npcUnits[ni], grid_row: curR, grid_col: curC }
          changed = true
        }

        // Attack after moving if now in range and haven't attacked yet
        if (!hasAttacked && closest.unit.current_hp > 0) {
          const newDist = hexDistance(curR, curC, closest.unit.grid_row, closest.unit.grid_col)
          if (newDist <= attackRange) {
            const damage = Math.max(1, npcDef.attack - (closest.unit.wg_unit_types?.defense || 0))
            const result = applyDamageToPlayer(closest.unit, damage, npcDef.name)
            if (result.killed) {
              await supabase.from('wg_units').update({ current_hp: 0, is_alive: false, ...result.shieldUpdate }).eq('id', closest.unit.id)
            } else {
              await supabase.from('wg_units').update({ current_hp: result.newHp, ...result.shieldUpdate }).eq('id', closest.unit.id)
            }
            changed = true
          }
        }
      }
    }

    if (changed) {
      await supabase.from('wg_games').update({ settings: { ...settings, npcUnits, battleLog: battleLogArr } }).eq('id', gameId)
    }
  }

  async function processHangarCooldowns() {
    const myUnits = units.filter(u => u.owner_id === userId && ((u.upgrades?.hangarCooldown || 0) > 0 || u.upgrades?.missileFiredThisTurn))
    for (const u of myUnits) {
      const newUpgrades = { ...u.upgrades }
      if (newUpgrades.hangarCooldown) {
        const cd = newUpgrades.hangarCooldown - 1
        if (cd <= 0) delete newUpgrades.hangarCooldown
        else newUpgrades.hangarCooldown = cd
      }
      delete newUpgrades.missileFiredThisTurn
      await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', u.id)
    }
  }

  async function processShieldRegen() {
    const myShielded = units.filter(u => u.owner_id === userId && u.is_alive && u.upgrades?.shieldMaxHp > 0)
    for (const u of myShielded) {
      const shield = getShieldHp(u.upgrades)
      if (shield.current >= shield.max) continue
      const newShieldHp = Math.min(shield.current + 1, shield.max)
      const newUpgrades = { ...u.upgrades, shieldHp: newShieldHp }
      await supabase.from('wg_units').update({ upgrades: newUpgrades }).eq('id', u.id)
    }
  }

  const REPAIR_HP = [0, 1, 2, 3]
  const REPAIR_RADIUS = [0, 3, 4, 5]

  async function processRepairTicks() {
    const myRepairShips = units.filter(u => u.owner_id === userId && u.wg_unit_types?.name === 'Repair Ship' && u.is_alive)
    if (myRepairShips.length === 0) return

    const myColor = currentPlayer?.color
    const teamUnits = units.filter(u => {
      if (!u.is_alive || !u.owner_id) return false
      const p = players.find(pl => pl.user_id === u.owner_id)
      return p && p.color === myColor && (u.board || 'ground') === 'space'
    })

    const bestHeal = new Map()
    for (const eng of myRepairShips) {
      const repairSlots = eng.upgrades?.repair
      const tier = Array.isArray(repairSlots) ? Math.max(...repairSlots) : 0
      if (tier <= 0) continue
      const hp = REPAIR_HP[tier]
      const radius = REPAIR_RADIUS[tier]

      for (const target of teamUnits) {
        if (target.id === eng.id) continue
        if (target.current_hp >= (target.wg_unit_types?.hp || 0)) continue
        const d = hexDistance(eng.grid_row, eng.grid_col, target.grid_row, target.grid_col)
        if (d > radius) continue
        const prev = bestHeal.get(target.id) || 0
        if (hp > prev) bestHeal.set(target.id, hp)
      }
    }

    for (const [targetId, hp] of bestHeal) {
      const target = teamUnits.find(u => u.id === targetId)
      if (!target) continue
      const newHp = Math.min(target.current_hp + hp, target.wg_unit_types?.hp || target.current_hp)
      await supabase.from('wg_units').update({ current_hp: newHp }).eq('id', targetId)
    }
  }

  async function endTurn() {
    if (!isMyTurn) throw new Error('Not your turn')

    await processConvoyTicks()
    await processMiningTicks()
    await processMissileStrikes()
    await processHangarCooldowns()
    await processShieldRegen()
    await processRepairTicks()
    await processNPCTicks()

    const { data, error } = await supabase.functions.invoke('end-turn', {
      body: { gameId },
    })
    if (error) throw new Error(error.message || 'End turn failed')
    if (data?.error) throw new Error(data.error)

    await fetchAll()
  }

  async function spawnNPCs(count, npcType = 'test1') {
    if (!game || !tiles.length) return
    const npcDef = NPC_UNIT_TYPES[npcType]
    if (!npcDef) return
    const targetBoard = npcDef.board || 'ground'
    const impassable = targetBoard === 'space'
      ? new Set(['asteroid', 'large_asteroid', 'star'])
      : new Set(['ocean', 'mountain', 'lake', 'river'])
    const boardTiles = tiles.filter(t => {
      if ((t.board || 'ground') !== targetBoard) return false
      if (impassable.has(t.terrain)) return false
      const occupied = units.some(u => (u.board || 'ground') === targetBoard && u.grid_row === t.grid_row && u.grid_col === t.grid_col)
      return !occupied
    })
    const shuffled = [...boardTiles].sort(() => Math.random() - 0.5)
    const chosen = shuffled.slice(0, count)
    const npcUnits = chosen.map((tile, i) => {
      const unit = {
        id: `npc-${Date.now()}-${i}`,
        npcType,
        grid_row: tile.grid_row,
        grid_col: tile.grid_col,
        board: targetBoard,
        current_hp: npcDef.hp,
        owner_id: null,
      }
      if (npcDef.hangar) unit.hangar = npcDef.hangar.map(h => ({ ...h }))
      if (npcDef.missiles) unit.missiles = { ...npcDef.missiles }
      return unit
    })
    const { data: freshGame } = await supabase.from('wg_games').select('settings').eq('id', gameId).single()
    const settings = freshGame?.settings || {}
    const existing = settings.npcUnits || []
    await supabase.from('wg_games').update({ settings: { ...settings, npcUnits: [...existing, ...npcUnits] } }).eq('id', gameId)
    await fetchAll()
  }

  useEffect(() => {
    if (!isAdmin || !game || !tiles.length || npcSpawnedRef.current) return
    const existing = game.settings?.npcUnits || []
    if (existing.length > 0) { npcSpawnedRef.current = true; return }
    npcSpawnedRef.current = true
    ;(async () => {
      await spawnNPCs(5, 'test1')
      await spawnNPCs(10, 'test2')
      await spawnNPCs(3, 'warship')
    })()
  }, [isAdmin, game, tiles])

  const battleLog = (game?.settings?.battleLog || []).filter(
    e => e.attackerId === userId || e.targetId === userId
  )

  return {
    game, players, units, unitTypes, tiles, discoveredTiles, loading,
    currentPlayer, isMyTurn, isAdmin, battleLog,
    deployUnit, moveUnit, attackUnit, buildRoad, destroyRoad, endTurn,
    excavate, upgradeShipCompartment, levelUpUnit, buyMissile, fireMissile, produceWarhead, sendConvoyToGuild, sellAtGuild, buyUnitAtGuild, buyMunitionAtGuild, returnConvoyFromGuild,
    buildConvoy, loadUnitToConvoy, loadFromBayToConvoy, unloadToHoldingBay, sendConvoy, deployFromBay, produceUnitToBay, loadCargoToConvoy, unloadCargoFromConvoy,
    dockTransport, loadSoldierToTransport, loadBaySoldierToTransport, unloadSoldierFromTransport, undockTransport, deployFromTransport, buyAndLoadToTransport, boardSoldierToTransport,
    setAutoPath, clearAutoPath,
    deployFromHangar, produceUnitToHangar, transferHangarUnit, transferAllHangar, addToHangar,
    persistDiscoveredTiles, productionPerTurn, economy, spawnNPCs,
    refresh: fetchAll,
  }
}
