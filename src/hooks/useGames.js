import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateTerrain, generateSpaceTerrain } from '../lib/terrainGen'

export function useGames() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [games, setGames] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGames = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data: playerRows } = await supabase
      .from('wg_game_players')
      .select('game_id')
      .eq('player_id', userId)

    const gameIds = (playerRows || []).map(r => r.game_id)

    if (gameIds.length > 0) {
      const { data } = await supabase
        .from('wg_games')
        .select(`
          *,
          host:wg_profiles!wg_games_host_id_fkey(display_name),
          players:wg_game_players(*, wg_profiles(display_name))
        `)
        .in('id', gameIds)
        .order('created_at', { ascending: false })

      setGames(data || [])
    } else {
      setGames([])
    }

    const { data: inviteData } = await supabase
      .from('wg_game_invites')
      .select(`
        *,
        game:wg_games(id, name, status),
        inviter:wg_profiles!wg_game_invites_inviter_id_fkey(display_name)
      `)
      .eq('invitee_id', userId)
      .eq('status', 'pending')

    setInvites(inviteData || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  const debounceRef = useRef(null)
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGames(), 300)
  }, [fetchGames])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`lobby-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wg_games' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wg_game_players' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wg_game_invites' }, debouncedFetch)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [userId, debouncedFetch])

  async function createGame(name, gridRows = 32, gridCols = 48, maxPlayers = 2, terrainTheme = 'default') {
    const { data: { session: freshSession } } = await supabase.auth.getSession()
    if (!freshSession) throw new Error('Session expired — please sign in again')

    const terrainSeed = Math.floor(Math.random() * 2147483647)

    const { data, error } = await supabase
      .from('wg_games')
      .insert({ name, host_id: userId, grid_rows: gridRows, grid_cols: gridCols, max_players: maxPlayers, terrain_seed: terrainSeed, terrain_theme: terrainTheme })
      .select()
      .single()

    if (error) throw error

    const tiles = generateTerrain(gridRows, gridCols, terrainSeed)
    const tileRows = tiles.map(t => ({
      game_id: data.id,
      grid_row: t.row,
      grid_col: t.col,
      terrain: t.terrain,
      resource: t.resource,
      ore_amount: t.oreAmount || 0,
      has_river: t.hasRiver,
      board: 'ground',
    }))

    const spaceTiles = generateSpaceTerrain(gridRows, gridCols, terrainSeed)
    const spaceTileRows = spaceTiles.map(t => ({
      game_id: data.id,
      grid_row: t.row,
      grid_col: t.col,
      terrain: t.terrain,
      resource: t.resource,
      ore_amount: t.oreAmount || 0,
      has_river: false,
      board: 'space',
    }))

    const allTileRows = [...tileRows, ...spaceTileRows]
    const BATCH = 500
    for (let i = 0; i < allTileRows.length; i += BATCH) {
      const { error: tileErr } = await supabase
        .from('wg_game_tiles')
        .insert(allTileRows.slice(i, i + BATCH))
      if (tileErr) throw tileErr
    }

    const { error: playerErr } = await supabase
      .from('wg_game_players')
      .insert({ game_id: data.id, player_id: userId, player_order: 0, color: '#3b82f6' })
    if (playerErr) throw playerErr

    await fetchGames()
    return data
  }

  async function createAdminGame(gridRows = 32, gridCols = 48, terrainTheme = 'default') {
    const { data: { session: freshSession } } = await supabase.auth.getSession()
    if (!freshSession) throw new Error('Session expired — please sign in again')

    const terrainSeed = Math.floor(Math.random() * 2147483647)

    const { data, error } = await supabase
      .from('wg_games')
      .insert({
        name: `Admin ${new Date().toLocaleTimeString()}`,
        host_id: userId,
        grid_rows: gridRows,
        grid_cols: gridCols,
        max_players: 4,
        terrain_seed: terrainSeed,
        terrain_theme: terrainTheme,
        is_admin: true,
      })
      .select()
      .single()

    if (error) throw error

    const tiles = generateTerrain(gridRows, gridCols, terrainSeed)
    const tileRows = tiles.map(t => ({
      game_id: data.id,
      grid_row: t.row,
      grid_col: t.col,
      terrain: t.terrain,
      resource: t.resource,
      ore_amount: t.oreAmount || 0,
      has_river: t.hasRiver,
      board: 'ground',
    }))

    const spaceTiles = generateSpaceTerrain(gridRows, gridCols, terrainSeed)
    const spaceTileRows = spaceTiles.map(t => ({
      game_id: data.id,
      grid_row: t.row,
      grid_col: t.col,
      terrain: t.terrain,
      resource: t.resource,
      ore_amount: t.oreAmount || 0,
      has_river: false,
      board: 'space',
    }))

    const allTileRows = [...tileRows, ...spaceTileRows]
    const BATCH = 500
    for (let i = 0; i < allTileRows.length; i += BATCH) {
      const { error: tileErr } = await supabase
        .from('wg_game_tiles')
        .insert(allTileRows.slice(i, i + BATCH))
      if (tileErr) throw tileErr
    }

    const { error: playerErr } = await supabase
      .from('wg_game_players')
      .insert({ game_id: data.id, player_id: userId, player_order: 0, color: '#3b82f6', gold: 99999 })
    if (playerErr) {
      await supabase.from('wg_game_tiles').delete().eq('game_id', data.id)
      await supabase.from('wg_games').delete().eq('id', data.id)
      throw playerErr
    }

    await fetchGames()
    return data
  }

  async function inviteToGame(gameId, friendId) {
    const { error } = await supabase
      .from('wg_game_invites')
      .insert({ game_id: gameId, inviter_id: userId, invitee_id: friendId })

    if (error) throw error
    await fetchGames()
  }

  async function acceptInvite(invite) {
    const { error: updateError } = await supabase
      .from('wg_game_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    if (updateError) throw updateError

    const { data: existingPlayers } = await supabase
      .from('wg_game_players')
      .select('player_order')
      .eq('game_id', invite.game_id)
      .order('player_order', { ascending: false })
      .limit(1)

    const nextOrder = existingPlayers?.length > 0 ? existingPlayers[0].player_order + 1 : 0
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308']

    await supabase
      .from('wg_game_players')
      .insert({
        game_id: invite.game_id,
        player_id: userId,
        player_order: nextOrder,
        color: colors[nextOrder % colors.length],
      })

    await fetchGames()
  }

  async function declineInvite(inviteId) {
    await supabase
      .from('wg_game_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId)

    await fetchGames()
  }

  async function startGame(gameId) {
    const { data: gameData } = await supabase
      .from('wg_games')
      .select('is_admin')
      .eq('id', gameId)
      .single()

    const { data: players } = await supabase
      .from('wg_game_players')
      .select('id, player_id, color, is_space_general')
      .eq('game_id', gameId)
      .order('player_order')

    if (!players || players.length < 1) throw new Error('Need at least 1 player')

    const teamColors = [...new Set(players.map(p => p.color))]
    for (const color of teamColors) {
      const teamMembers = players.filter(p => p.color === color)
      if (teamMembers.length >= 2) {
        const hasSpaceCommander = teamMembers.some(p => p.is_space_general)
        if (!hasSpaceCommander) throw new Error('Each 2-player team must have a Space Commander')
      }
    }

    for (const p of players) {
      const updates = { production: 30 }
      if (gameData?.is_admin) updates.gold = 99999
      await supabase.from('wg_game_players').update(updates).eq('id', p.id)
    }

    const firstTeamColor = players[0].color

    const { error } = await supabase
      .from('wg_games')
      .update({
        status: 'active',
        turn_number: 1,
        current_player_id: players[0].player_id,
        current_team_color: firstTeamColor,
        started_at: new Date().toISOString(),
      })
      .eq('id', gameId)

    if (error) throw error
    await fetchGames()
  }

  async function deleteGame(gameId) {
    await supabase.from('wg_units').delete().eq('game_id', gameId)
    await supabase.from('wg_discovered_tiles').delete().eq('game_id', gameId)
    await supabase.from('wg_game_tiles').delete().eq('game_id', gameId)
    await supabase.from('wg_turns').delete().eq('game_id', gameId)
    await supabase.from('wg_game_invites').delete().eq('game_id', gameId)
    await supabase.from('wg_game_players').delete().eq('game_id', gameId)
    const { error } = await supabase.from('wg_games').delete().eq('id', gameId)
    if (error) throw error
    await fetchGames()
  }

  async function updatePlayerColor(playerId, color) {
    const { error } = await supabase
      .from('wg_game_players')
      .update({ color })
      .eq('id', playerId)
    if (error) throw error
    await fetchGames()
  }

  async function updatePlayerSpace(playerId, isSpaceGeneral) {
    const { error } = await supabase
      .from('wg_game_players')
      .update({ is_space_general: isSpaceGeneral })
      .eq('id', playerId)
    if (error) throw error
    await fetchGames()
  }

  return { games, invites, loading, createGame, createAdminGame, inviteToGame, acceptInvite, declineInvite, startGame, deleteGame, updatePlayerColor, updatePlayerSpace, refresh: fetchGames }
}
