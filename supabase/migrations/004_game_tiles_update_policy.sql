-- Allow game participants to update tiles in their game (for building roads)
CREATE POLICY "Game participants can update game tiles"
  ON wg_game_tiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wg_game_players
      WHERE wg_game_players.game_id = wg_game_tiles.game_id
        AND wg_game_players.player_id = auth.uid()
    )
  );
