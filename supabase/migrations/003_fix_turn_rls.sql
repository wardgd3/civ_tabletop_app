-- Allow any game participant to update the game (for turn changes)
create policy "Game participants can update game for turns"
  on wg_games for update
  to authenticated
  using (
    exists (
      select 1 from wg_game_players
      where wg_game_players.game_id = wg_games.id
        and wg_game_players.player_id = auth.uid()
    )
  );

-- Allow any game participant to update any player row in their game (for gold income)
create policy "Game participants can update game players"
  on wg_game_players for update
  to authenticated
  using (
    exists (
      select 1 from wg_game_players gp
      where gp.game_id = wg_game_players.game_id
        and gp.player_id = auth.uid()
    )
  );

-- Allow any game participant to update any unit in their game (for resetting has_moved/has_attacked)
create policy "Game participants can update units"
  on wg_units for update
  to authenticated
  using (
    exists (
      select 1 from wg_game_players
      where wg_game_players.game_id = wg_units.game_id
        and wg_game_players.player_id = auth.uid()
    )
  );
