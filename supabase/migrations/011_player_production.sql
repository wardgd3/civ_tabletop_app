-- Add production column to track accumulated production per player
alter table wg_game_players add column if not exists production integer not null default 0;
