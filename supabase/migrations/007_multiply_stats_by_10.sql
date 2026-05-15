-- Multiply all HP, attack, and defense values by 10
update wg_unit_types set
  hp = hp * 10,
  attack = attack * 10,
  defense = defense * 10;

-- Also update current_hp for all living units
update wg_units set
  current_hp = current_hp * 10
where is_alive = true;
