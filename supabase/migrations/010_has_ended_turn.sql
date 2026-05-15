-- Add has_ended_turn column to track per-player end turn in team games
alter table wg_game_players add column if not exists has_ended_turn boolean not null default false;
