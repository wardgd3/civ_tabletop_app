-- Replace default unit types with image-based units
delete from wg_unit_types;

insert into wg_unit_types (name, description, cost, attack, defense, hp, movement, attack_range, icon) values
  ('Infantry',         'Basic foot soldier. Cheap and reliable.',                 2,  3, 2,  5, 2, 1, 'infantry.png'),
  ('Scout',            'Very fast recon unit. Low combat stats.',                 2,  1, 1,  2, 5, 1, 'scout.png'),
  ('Armored Cavalry',  'Fast armored unit. Great for flanking.',                  4,  4, 3,  6, 4, 1, 'armoredcalvalry.png'),
  ('Heavy Unit',       'Slow but heavily armored frontline brawler.',             5,  5, 5,  8, 1, 1, 'heavyunit.png'),
  ('Engineer',         'Support unit. Builds and repairs.',                       3,  1, 2,  4, 2, 1, 'engineer.png'),
  ('Medic',            'Heals nearby allied units. Fragile.',                     3,  0, 1,  3, 3, 1, 'medic.png'),
  ('Excavator',        'Heavy utility vehicle. Tough but slow.',                  3,  2, 3,  6, 1, 1, 'excavator.png'),
  ('Armor Transport',  'Armored troop carrier. High defense.',                    4,  1, 4,  7, 3, 1, 'armortransport.png'),
  ('Rocket Artillery', 'Long-range bombardment. Glass cannon.',                   5,  7, 1,  3, 1, 3, 'rocketartillery.png'),
  ('Modern Armor',     'Main battle tank. Strong all-around.',                    6,  6, 5,  8, 2, 2, 'modernarmor.png'),
  ('Missile Defense',  'Anti-air and missile interception platform.',             4,  3, 3,  5, 1, 3, 'missile defense.png'),
  ('Bomber',           'Aerial strike unit. Devastating but fragile.',            6,  8, 1,  4, 3, 2, 'bomber unit.png'),
  ('Convoy Ship',      'Naval transport. Moves troops across water.',             4,  1, 3,  6, 3, 1, 'convoy ship.png'),
  ('Mother Ship',      'Capital ship. Powerful and durable.',                     8,  6, 6, 10, 1, 3, 'mother ship.png'),
  ('Orbital Strike',   'Superweapon. Extreme damage, minimal defense.',          10, 12, 0,  2, 1, 4, 'orbital strike.png'),
  ('Command Center',   'Base structure. Buffs nearby allies. Immobile.',          7,  1, 7, 12, 0, 1, 'command center.jpg'),
  ('Fighter',          'Fast space interceptor. Cannon only.',                    4,  5, 2,  8, 4, 2, 'fighter.png');
