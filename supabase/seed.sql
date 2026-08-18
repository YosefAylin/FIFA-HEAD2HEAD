-- ============================================================
-- Seed data — 8 players + sample 1v1/2v2 matches (current week)
-- Idempotent: players insert on conflict do nothing; matches only
-- seed if the table is empty.
-- ============================================================

insert into players (name)
values
  ('יוסף'),
  ('מנשה'),
  ('אבי'),
  ('דני'),
  ('רון'),
  ('עומר'),
  ('גיל'),
  ('נועה')
on conflict (name) do nothing;

do $$
declare
  saturday date := (select max(week_start_date) from matches);
begin
  if saturday is null then
    saturday := current_date + ((6 - extract(dow from current_date)::int + 7) % 7); -- next Saturday
  end if;

  insert into matches (game_mode, home_player_1_id, home_player_2_id, away_player_1_id, away_player_2_id, home_score, away_score, week_start_date)
  select m.*, saturday
  from (
    values
      ('1v1', (select id from players where name='יוסף'), null, (select id from players where name='אבי'), null, 3, 1),
      ('1v1', (select id from players where name='דני'), null, (select id from players where name='גיל'), null, 2, 2),
      ('2v2', (select id from players where name='יוסף'), (select id from players where name='נועה'), (select id from players where name='רון'), (select id from players where name='עומר'), 4, 3),
      ('1v1', (select id from players where name='מנשה'), null, (select id from players where name='נועה'), null, 1, 0),
      ('2v2', (select id from players where name='אבי'), (select id from players where name='גיל'), (select id from players where name='דני'), (select id from players where name='עומר'), 2, 5)
  ) as m(game_mode, home_player_1_id, home_player_2_id, away_player_1_id, away_player_2_id, home_score, away_score)
  where not exists (select 1 from matches);
end $$;
