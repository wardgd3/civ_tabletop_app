-- Replace default unit types with image-based units
delete from wg_unit_types;

alter table wg_unit_types add column if not exists board text not null default 'ground';

insert into wg_unit_types (name, description, cost, attack, defense, hp, movement, attack_range, icon, board) values
  ('Infantry',         'Basic foot soldier. Cheap and reliable.',                 2,  3, 2,  5, 2, 1, 'infantry.png',        'ground'),
  ('Scout',            'Very fast recon unit. Low combat stats.',                 2,  1, 1,  2, 5, 1, 'scout.png',           'ground'),
  ('Armored Cavalry',  'Fast armored unit. Great for flanking.',                  4,  4, 3,  6, 4, 1, 'armoredcalvalry.png', 'ground'),
  ('Heavy Unit',       'Slow but heavily armored frontline brawler.',             5,  5, 5,  8, 1, 1, 'heavyunit.png',       'ground'),
  ('Engineer',         'Support unit. Builds and repairs.',                       3,  1, 2,  4, 2, 1, 'engineer.png',        'ground'),
  ('Medic',            'Heals nearby allied units. Fragile.',                     3,  0, 1,  3, 3, 1, 'medic.png',           'ground'),
  ('Excavator',        'Heavy utility vehicle. Tough but slow.',                  3,  2, 3,  6, 1, 1, 'excavator.png',       'ground'),
  ('Armor Transport',  'Armored troop carrier. High defense.',                    4,  1, 4,  7, 3, 1, 'armortransport.png',  'ground'),
  ('Rocket Artillery', 'Long-range bombardment. Glass cannon.',                   5,  7, 1,  3, 1, 3, 'rocketartillery.png', 'ground'),
  ('Modern Armor',     'Main battle tank. Strong all-around.',                    6,  6, 5,  8, 2, 2, 'modernarmor.png',     'ground'),
  ('Missile Defense',  'Anti-air and missile interception platform.',             4,  3, 3,  5, 1, 3, 'missile defense.png', 'ground'),
  ('Bomber',           'Aerial strike unit. Devastating but fragile.',            6,  8, 1,  4, 3, 2, 'bomber unit.png',     'space'),
  ('Convoy Ship',      'Naval transport. Moves troops across water.',             4,  1, 3,  6, 3, 1, 'convoy ship.png',     'space'),
  ('Mother Ship',      'Capital ship. Powerful and durable.',                     8,  6, 6, 10, 1, 3, 'mother ship.png',     'space'),
  ('Orbital Strike',   'Superweapon. Extreme damage, minimal defense.',          10, 12, 0,  2, 1, 4, 'orbital strike.png',  'space'),
  ('Command Center',   'Base structure. Buffs nearby allies. Immobile.',          7,  1, 7, 12, 0, 1, 'command center.jpg',  'ground'),
  ('Fighter',          'Fast space interceptor. Cannon only.',                    4,  5, 2,  8, 4, 2, 'fighter.png',         'space');
