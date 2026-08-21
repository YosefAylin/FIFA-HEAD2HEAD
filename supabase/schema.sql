-- ============================================================
-- FC 26 Tournament Tracker — Core Schema
-- Open-access app for a group of friends. All RLS policies are open.
-- Run once (idempotent). Order matters: tables -> views -> indexes -> RLS.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- Players
-- ------------------------------------------------------------
create table if not exists players (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  profile_picture_url text,
  created_at timestamptz default now() not null
);

-- ------------------------------------------------------------
-- Matches (1v1 & 2v2, soft delete)
-- ------------------------------------------------------------
create table if not exists matches (
  id uuid default uuid_generate_v4() primary key,
  game_mode text default '1v1' not null check (game_mode in ('1v1', '2v2')),

  -- Home Side
  home_player_1_id uuid references players(id) not null,
  home_player_2_id uuid references players(id),
  home_score integer not null check (home_score >= 0),
  home_team_name text,

  -- Away Side
  away_player_1_id uuid references players(id) not null,
  away_player_2_id uuid references players(id),
  away_score integer not null check (away_score >= 0),
  away_team_name text,

  -- Timing & Archiving
  week_start_date date not null, -- Saturday of the relevant cycle
  created_at timestamptz default now() not null,
  deleted_at timestamptz default null, -- Soft-delete support

  -- Validation: prevent the same player on both sides of a match
  constraint chk_distinct_1v1 check (home_player_1_id <> away_player_1_id),
  constraint chk_distinct_2v2 check (
    game_mode = '1v1' or (
      home_player_2_id is not null and
      away_player_2_id is not null and
      home_player_1_id <> home_player_2_id and
      away_player_1_id <> away_player_2_id and
      home_player_1_id <> away_player_2_id and
      home_player_2_id <> away_player_1_id
    )
  )
);

-- ------------------------------------------------------------
-- Whiskey Survey (shared real-time voting)
-- ------------------------------------------------------------
create table if not exists whiskey_votes (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references players(id) on delete cascade not null,
  voter_token text not null, -- anonymous device fingerprint
  week_start_date date not null,
  vote_date date default current_date not null,
  created_at timestamptz default now() not null,
  unique(voter_token, week_start_date) -- one vote per device per week
);

-- ------------------------------------------------------------
-- Dynamic Standings Views (no stale cached tables)
-- ------------------------------------------------------------
create or replace view weekly_standings as
with unnested_matches as (
  -- Home Player 1
  select week_start_date, home_player_1_id as player_id, home_score as gf, away_score as ga,
         case when home_score > away_score then 3 when home_score = away_score then 1 else 0 end as points,
         home_score > away_score as is_win, home_score = away_score as is_draw, home_score < away_score as is_loss
  from matches where deleted_at is null
  union all
  -- Home Player 2 (2v2)
  select week_start_date, home_player_2_id as player_id, home_score as gf, away_score as ga,
         case when home_score > away_score then 3 when home_score = away_score then 1 else 0 end as points,
         home_score > away_score as is_win, home_score = away_score as is_draw, home_score < away_score as is_loss
  from matches where deleted_at is null and home_player_2_id is not null
  union all
  -- Away Player 1
  select week_start_date, away_player_1_id as player_id, away_score as gf, home_score as ga,
         case when away_score > home_score then 3 when away_score = home_score then 1 else 0 end as points,
         away_score > home_score as is_win, away_score = home_score as is_draw, away_score < home_score as is_loss
  from matches where deleted_at is null
  union all
  -- Away Player 2 (2v2)
  select week_start_date, away_player_2_id as player_id, away_score as gf, home_score as ga,
         case when away_score > home_score then 3 when away_score = home_score then 1 else 0 end as points,
         away_score > home_score as is_win, away_score = home_score as is_draw, away_score < home_score as is_loss
  from matches where deleted_at is null and away_player_2_id is not null
)
select
  p.id as player_id,
  p.name as player_name,
  p.profile_picture_url,
  um.week_start_date,
  count(um.player_id) as matches_played,
  coalesce(sum(case when um.is_win then 1 else 0 end), 0) as wins,
  coalesce(sum(case when um.is_draw then 1 else 0 end), 0) as draws,
  coalesce(sum(case when um.is_loss then 1 else 0 end), 0) as losses,
  coalesce(sum(um.gf), 0) as goals_for,
  coalesce(sum(um.ga), 0) as goals_against,
  coalesce(sum(um.gf) - sum(um.ga), 0) as goal_difference,
  coalesce(sum(um.points), 0) as points,
  case when count(um.player_id) > 0
       then round((sum(case when um.is_win then 1 else 0 end)::numeric / count(um.player_id)::numeric) * 100, 2)
       else 0.00 end as win_percentage
from players p
join unnested_matches um on p.id = um.player_id
group by p.id, p.name, p.profile_picture_url, um.week_start_date;

create or replace view all_time_standings as
select
  player_id,
  player_name,
  profile_picture_url,
  sum(matches_played) as matches_played,
  sum(wins) as wins,
  sum(draws) as draws,
  sum(losses) as losses,
  sum(goals_for) as goals_for,
  sum(goals_against) as goals_against,
  sum(goal_difference) as goal_difference,
  sum(points) as points,
  case when sum(matches_played) > 0
       then round((sum(wins)::numeric / sum(matches_played)::numeric) * 100, 2)
       else 0.00 end as win_percentage
from weekly_standings
group by player_id, player_name, profile_picture_url;

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
create index if not exists idx_matches_home_p1 on matches(home_player_1_id);
create index if not exists idx_matches_away_p1 on matches(away_player_1_id);
create index if not exists idx_matches_week_date on matches(week_start_date);
create index if not exists idx_matches_deleted_at on matches(deleted_at);
create index if not exists idx_whiskey_week_date on whiskey_votes(week_start_date);

-- ------------------------------------------------------------
-- Row Level Security — open access
-- ------------------------------------------------------------
alter table players enable row level security;
alter table matches enable row level security;
alter table whiskey_votes enable row level security;

drop policy if exists "Open access for players" on players;
create policy "Open access for players" on players for all using (true) with check (true);

drop policy if exists "Open access for matches" on matches;
create policy "Open access for matches" on matches for all using (true) with check (true);

drop policy if exists "Open access for whiskey votes" on whiskey_votes;
create policy "Open access for whiskey votes" on whiskey_votes for all using (true) with check (true);
