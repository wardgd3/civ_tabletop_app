-- --------------------------------------------------------
-- Add terrain seed to games and tile data table
-- --------------------------------------------------------

-- Add seed column to wg_games for deterministic terrain generation
alter table wg_games add column terrain_seed bigint;

-- Store generated terrain per game tile
create table wg_game_tiles (
  game_id uuid not null references wg_games(id) on delete cascade,
  grid_row int not null,
  grid_col int not null,
  terrain text not null default 'plains',
  resource text,
  has_river boolean not null default false,
  primary key (game_id, grid_row, grid_col)
);

alter table wg_game_tiles enable row level security;

create policy "Game tiles are viewable by game participants"
  on wg_game_tiles for select
  to authenticated
  using (
    exists (
      select 1 from wg_game_players
      where wg_game_players.game_id = wg_game_tiles.game_id
        and wg_game_players.player_id = auth.uid()
    )
  );

create policy "Game host can insert tiles"
  on wg_game_tiles for insert
  to authenticated
  with check (
    exists (
      select 1 from wg_games
      where wg_games.id = wg_game_tiles.game_id
        and wg_games.host_id = auth.uid()
    )
  );

create index idx_wg_game_tiles_game on wg_game_tiles(game_id);

-- Track which tiles each player has discovered
create table wg_discovered_tiles (
  game_id uuid not null references wg_games(id) on delete cascade,
  player_id uuid not null references wg_profiles(id) on delete cascade,
  grid_row int not null,
  grid_col int not null,
  discovered_at timestamptz not null default now(),
  primary key (game_id, player_id, grid_row, grid_col)
);

alter table wg_discovered_tiles enable row level security;

create policy "Players can view their own discovered tiles"
  on wg_discovered_tiles for select
  to authenticated
  using (player_id = auth.uid());

create policy "Players can insert their own discovered tiles"
  on wg_discovered_tiles for insert
  to authenticated
  with check (player_id = auth.uid());

create index idx_wg_discovered_tiles_player on wg_discovered_tiles(game_id, player_id);
