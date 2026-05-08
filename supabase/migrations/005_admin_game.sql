-- Add admin game flag for unlimited gold/moves sandbox mode
alter table wg_games add column is_admin boolean not null default false;
