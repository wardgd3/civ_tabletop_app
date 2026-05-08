-- ============================================================
-- War Game Schema Migration
-- Target project: yfbtrvzpnmmlybapkpeh
-- All tables prefixed with wg_ to coexist with D&D and OSRS apps
-- ============================================================

-- --------------------------------------------------------
-- 1. wg_profiles — public game profile linked to auth.users
-- --------------------------------------------------------
create table wg_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  elo_rating int not null default 1000,
  games_played int not null default 0,
  games_won int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wg_profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on wg_profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on wg_profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on wg_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- --------------------------------------------------------
-- 2. wg_friendships — bidirectional friend relationships
-- --------------------------------------------------------
create table wg_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references wg_profiles(id) on delete cascade,
  addressee_id uuid not null references wg_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_friendship unique (requester_id, addressee_id),
  constraint no_self_friend check (requester_id <> addressee_id)
);

alter table wg_friendships enable row level security;

create policy "Users can view their own friendships"
  on wg_friendships for select
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "Users can send friend requests"
  on wg_friendships for insert
  to authenticated
  with check (requester_id = auth.uid());

create policy "Participants can update friendship status"
  on wg_friendships for update
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "Requester can delete friendship"
  on wg_friendships for delete
  to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- --------------------------------------------------------
-- 3. wg_unit_types — catalog of deployable unit archetypes
-- --------------------------------------------------------
create table wg_unit_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  cost int not null default 1,
  attack int not null default 1,
  defense int not null default 1,
  hp int not null default 3,
  movement int not null default 1,
  attack_range int not null default 1,
  icon text not null default 'sword',
  created_at timestamptz not null default now()
);

alter table wg_unit_types enable row level security;

create policy "Unit types are viewable by authenticated users"
  on wg_unit_types for select
  to authenticated
  using (true);

-- Seed default unit types
insert into wg_unit_types (name, description, cost, attack, defense, hp, movement, attack_range, icon) values
  ('Infantry',   'Basic foot soldier. Cheap and reliable.',           2, 3, 2, 5, 2, 1, 'sword'),
  ('Archer',     'Ranged unit. Weak in melee but strong at range.',   3, 4, 1, 3, 2, 3, 'bow'),
  ('Cavalry',    'Fast-moving mounted unit. Great for flanking.',     4, 4, 3, 6, 4, 1, 'horse'),
  ('Siege',      'Slow but devastating against fortifications.',      6, 7, 1, 4, 1, 2, 'catapult'),
  ('Scout',      'Very fast with low combat stats. Reveals fog.',     2, 1, 1, 2, 5, 1, 'eye'),
  ('Shield Wall','Heavy defensive unit. Absorbs damage.',             3, 1, 6, 8, 1, 1, 'shield'),
  ('Mage',       'Powerful area damage but fragile.',                 5, 6, 1, 3, 2, 2, 'wand'),
  ('General',    'Buffs nearby allied units. High-value target.',     7, 3, 4, 6, 2, 1, 'crown');

-- --------------------------------------------------------
-- 4. wg_games — game session metadata
-- --------------------------------------------------------
create table wg_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_id uuid not null references wg_profiles(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished', 'abandoned')),
  grid_rows int not null default 12,
  grid_cols int not null default 16,
  max_players int not null default 2 check (max_players between 2 and 4),
  turn_number int not null default 0,
  current_player_id uuid references wg_profiles(id),
  winner_id uuid references wg_profiles(id),
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wg_games enable row level security;

create policy "Games are viewable by authenticated users"
  on wg_games for select
  to authenticated
  using (true);

create policy "Authenticated users can create games"
  on wg_games for insert
  to authenticated
  with check (host_id = auth.uid());

create policy "Host can update their game"
  on wg_games for update
  to authenticated
  using (host_id = auth.uid());

-- --------------------------------------------------------
-- 5. wg_game_players — players in a game session
-- --------------------------------------------------------
create table wg_game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references wg_games(id) on delete cascade,
  player_id uuid not null references wg_profiles(id) on delete cascade,
  player_order int not null default 0,
  color text not null default '#3b82f6',
  gold int not null default 10,
  is_eliminated boolean not null default false,
  joined_at timestamptz not null default now(),
  constraint unique_game_player unique (game_id, player_id)
);

alter table wg_game_players enable row level security;

create policy "Game players are viewable by authenticated users"
  on wg_game_players for select
  to authenticated
  using (true);

create policy "Players can join games"
  on wg_game_players for insert
  to authenticated
  with check (player_id = auth.uid());

create policy "Players can update their own game_player row"
  on wg_game_players for update
  to authenticated
  using (player_id = auth.uid());

-- Also allow game host to update any player row (for elimination, etc.)
create policy "Host can update game players"
  on wg_game_players for update
  to authenticated
  using (
    exists (
      select 1 from wg_games
      where wg_games.id = wg_game_players.game_id
        and wg_games.host_id = auth.uid()
    )
  );

create policy "Players can leave games"
  on wg_game_players for delete
  to authenticated
  using (player_id = auth.uid());

-- --------------------------------------------------------
-- 6. wg_game_invites — invitations to join a game
-- --------------------------------------------------------
create table wg_game_invites (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references wg_games(id) on delete cascade,
  inviter_id uuid not null references wg_profiles(id) on delete cascade,
  invitee_id uuid not null references wg_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_game_invite unique (game_id, invitee_id)
);

alter table wg_game_invites enable row level security;

create policy "Users can see invites they sent or received"
  on wg_game_invites for select
  to authenticated
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

create policy "Users can send game invites"
  on wg_game_invites for insert
  to authenticated
  with check (inviter_id = auth.uid());

create policy "Invitee can update invite status"
  on wg_game_invites for update
  to authenticated
  using (invitee_id = auth.uid())
  with check (invitee_id = auth.uid());

create policy "Inviter can delete invites"
  on wg_game_invites for delete
  to authenticated
  using (inviter_id = auth.uid());

-- --------------------------------------------------------
-- 7. wg_turns — log of each completed turn
-- --------------------------------------------------------
create table wg_turns (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references wg_games(id) on delete cascade,
  player_id uuid not null references wg_profiles(id) on delete cascade,
  turn_number int not null,
  actions jsonb not null default '[]'::jsonb,
  gold_earned int not null default 0,
  gold_spent int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table wg_turns enable row level security;

create policy "Turns are viewable by game participants"
  on wg_turns for select
  to authenticated
  using (
    exists (
      select 1 from wg_game_players
      where wg_game_players.game_id = wg_turns.game_id
        and wg_game_players.player_id = auth.uid()
    )
  );

create policy "Players can insert their own turns"
  on wg_turns for insert
  to authenticated
  with check (player_id = auth.uid());

create policy "Players can update their own turns"
  on wg_turns for update
  to authenticated
  using (player_id = auth.uid());

-- --------------------------------------------------------
-- 8. wg_units — units on the battlefield
-- --------------------------------------------------------
create table wg_units (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references wg_games(id) on delete cascade,
  owner_id uuid not null references wg_profiles(id) on delete cascade,
  unit_type_id uuid not null references wg_unit_types(id),
  grid_row int not null,
  grid_col int not null,
  current_hp int not null,
  has_moved boolean not null default false,
  has_attacked boolean not null default false,
  is_alive boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wg_units enable row level security;

create policy "Units are viewable by game participants"
  on wg_units for select
  to authenticated
  using (
    exists (
      select 1 from wg_game_players
      where wg_game_players.game_id = wg_units.game_id
        and wg_game_players.player_id = auth.uid()
    )
  );

create policy "Players can deploy their own units"
  on wg_units for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Players can update their own units"
  on wg_units for update
  to authenticated
  using (owner_id = auth.uid());

-- Also allow opponent to update units (for applying damage)
create policy "Game participants can update units for combat"
  on wg_units for update
  to authenticated
  using (
    exists (
      select 1 from wg_game_players
      where wg_game_players.game_id = wg_units.game_id
        and wg_game_players.player_id = auth.uid()
    )
  );

create policy "Players can delete their own units"
  on wg_units for delete
  to authenticated
  using (owner_id = auth.uid());

-- --------------------------------------------------------
-- Indexes for performance
-- --------------------------------------------------------
create index idx_wg_friendships_requester on wg_friendships(requester_id);
create index idx_wg_friendships_addressee on wg_friendships(addressee_id);
create index idx_wg_games_host on wg_games(host_id);
create index idx_wg_games_status on wg_games(status);
create index idx_wg_game_players_game on wg_game_players(game_id);
create index idx_wg_game_players_player on wg_game_players(player_id);
create index idx_wg_game_invites_invitee on wg_game_invites(invitee_id);
create index idx_wg_units_game on wg_units(game_id);
create index idx_wg_units_owner on wg_units(owner_id);
create index idx_wg_units_position on wg_units(game_id, grid_row, grid_col);
create index idx_wg_turns_game on wg_turns(game_id);

-- --------------------------------------------------------
-- Updated_at trigger function (reuse if it already exists)
-- --------------------------------------------------------
create or replace function wg_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger wg_profiles_updated_at before update on wg_profiles
  for each row execute function wg_set_updated_at();
create trigger wg_friendships_updated_at before update on wg_friendships
  for each row execute function wg_set_updated_at();
create trigger wg_games_updated_at before update on wg_games
  for each row execute function wg_set_updated_at();
create trigger wg_game_invites_updated_at before update on wg_game_invites
  for each row execute function wg_set_updated_at();
create trigger wg_units_updated_at before update on wg_units
  for each row execute function wg_set_updated_at();
