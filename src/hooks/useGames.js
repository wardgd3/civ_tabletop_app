import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generateTerrain } from '../lib/terrainGen'

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
          players:wg_game_players(player_id, color, player_order, wg_profiles(display_name))
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

  async function createGame(name, gridRows = 32, gridCols = 48, maxPlayers = 2) {
    const terrainSeed = Math.floor(Math.random() * 2147483647)

    const { data, error } = await supabase
      .from('wg_games')
      .insert({ name, host_id: userId, grid_rows: gridRows, grid_cols: gridCols, max_players: maxPlayers, terrain_seed: terrainSeed })
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
      has_river: t.hasRiver,
    }))

    const BATCH = 500
    for (let i = 0; i < tileRows.length; i += BATCH) {
      const { error: tileErr } = await supabase
        .from('wg_game_tiles')
        .insert(tileRows.slice(i, i + BATCH))
      if (tileErr) throw tileErr
    }

    await supabase
      .from('wg_game_players')
      .insert({ game_id: data.id, player_id: userId, player_order: 0, color: '#3b82f6' })

    await fetchGames()
    return data
  }

  async function createAdminGame() {
    const terrainSeed = Math.floor(Math.random() * 2147483647)
    const gridRows = 32, gridCols = 48

    const { data, error } = await supabase
      .from('wg_games')
      .insert({
        name: `Admin ${new Date().toLocaleTimeString()}`,
        host_id: userId,
        grid_rows: gridRows,
        grid_cols: gridCols,
        max_players: 2,
        terrain_seed: terrainSeed,
        is_admin: true,
        status: 'active',
        turn_number: 1,
        current_player_id: userId,
        started_at: new Date().toISOString(),
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
      has_river: t.hasRiver,
    }))

    const BATCH = 500
    for (let i = 0; i < tileRows.length; i += BATCH) {
      const { error: tileErr } = await supabase
        .from('wg_game_tiles')
        .insert(tileRows.slice(i, i + BATCH))
      if (tileErr) throw tileErr
    }

    await supabase
      .from('wg_game_players')
      .insert({ game_id: data.id, player_id: userId, player_order: 0, color: '#3b82f6', gold: 99999 })

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
    const { data: players } = await supabase
      .from('wg_game_players')
      .select('player_id')
      .eq('game_id', gameId)
      .order('player_order')

    if (!players || players.length < 2) throw new Error('Need at least 2 players')

    const { error } = await supabase
      .from('wg_games')
      .update({
        status: 'active',
        turn_number: 1,
        current_player_id: players[0].player_id,
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

  return { games, invites, loading, createGame, createAdminGame, inviteToGame, acceptInvite, declineInvite, startGame, deleteGame, refresh: fetchGames }
}
