-- Add Recon Drone unit type (stats already x10)
insert into wg_unit_types (name, description, cost, attack, defense, hp, movement, attack_range, icon, board) values
  ('Recon Drone', 'Fast surveillance drone. High visibility, no weapons.', 3, 0, 10, 30, 5, 0, 'recondrone.png', 'space');
