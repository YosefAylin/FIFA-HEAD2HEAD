# FC 26 Tournament Tracking Application - Open Access Rebuild Plan

## 🎯 Vision
Build a simple, open-access FC 26 tournament tracking application for close friends where anyone can add players, add match results, and view standings without restrictions. Includes serious statistics tracking plus fun/mocking elements to enhance the social experience. Focus on backend functionality first, then iteratively improve UI/UX. The first screen shows large player cards with pictures and an "Add Player" button.

## 📋 Core Features

### 1. Open Access User Management & Media
- Anyone can add new players (no authentication required)
- Player profiles include name, optional profile picture upload (via Supabase Storage) or URL
- Automatic SVG avatar fallback with initials for players without pictures
- All users have equal permissions to add/edit/soft-delete data
- No personalization or user selection - completely open system

### 2. Real-Time Tournament Tracking
- Dynamic live standings computed directly via PostgreSQL Views (no stale cached tables)
- Match entry form with validation:
  - Non-negative scores
  - No duplicate player selections in the same match
- Full **1v1** and **2v2** mode support (with partner assignments and optional team names)
- Soft delete (`deleted_at`) for matches to prevent accidental data loss
- Real-time updates via Supabase broadcast/subscriptions

### 3. Enhanced Statistics & Tracking (Serious + Fun)
- **Serious Stats**: Wins, losses, draws, goals for/against, goal difference, points, win percentage, streaks
- **Fun/Mocking Stats**: Creative, humorous dynamic badges based on live statistics:
  - "Most Likely to Blame Lag"
  - "King of Own Goals"
  - "Comeback King"
  - "Current Goal Drought"
- **Rotating Fun Comments**: Screen displays randomized banter and predefined group phrases that refresh periodically
- **Player Ability Mocking**: Light-hearted comments about player strengths/weaknesses rotating dynamically

### 4. Weekly Cycle & Archiving
- **קובה Schedule**: Every Saturday cycle (anchored to Israel Time `Asia/Jerusalem`)
- **Dynamic Weekly Partitioning**: Matches are tagged with `week_start_date` (the Saturday of that cycle)
- **Zero-Maintenance Archiving**: Because standings are view-based, previous weeks and all-time aggregate views require no cron batch runs or static table mutations
- **Fresh Start**: Filter by current week by default for active weekend competitions

### 5. Player Profiles & Statistics
- Individual player pages (`/players/[id]`):
  - Overall rank in tournament (current week & all-time)
  - Goal statistics (for, against, difference, per game)
  - Recent form (last 5 matches with W/L/D badges)
  - Head-to-Head match history against specific opponents
  - Profile picture display with quick replacement
  - Tabbed views: Serious Stats, Fun/Banter Stats, Match History

### 6. Match History & Management
- Complete match history with filtering by week, date, and player
- Edit match scores and participant mappings
- Soft-delete with restore/confirmation modal
- View archived weeks seamlessly via dropdown

### 7. Social Features
- **Real-Time Whiskey Survey**: Live voting for who should bring whiskey next week
  - Stored in Supabase (`whiskey_votes`) with voter fingerprinting
  - Real-time results broadcast to all connected devices
  - Daily/Weekly voting limits
- **Random Phrases Banner**: Rotating group classics ("מי יביא וויסקי", "מי ינצח את יוסף", "מתי מנשה יבוא")

### 8. Technical Foundation
- PWA ready for mobile home screen installation
- Responsive mobile-first design prioritizing large touch targets
- Native RTL/Hebrew typography and alignment
- Supabase PostgreSQL backend with Row Level Security (RLS) open policies

---

## 🏗️ Project Structure (Backend-First Approach)

fifa-head-to-head/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── layout.tsx          # Root layout with RTL/Hebrew
│   │   ├── page.tsx            # Home page - Player Cards & Fun Banner
│   │   ├── history/            # Match history & edit/delete
│   │   │   └── page.tsx
│   │   ├── standings/          # Full Standings & League Tables
│   │   │   └── page.tsx
│   │   ├── players/            # Player profiles
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── survey/             # Whiskey survey view
│   │   │   └── page.tsx
│   │   └── ...                 # Other routes
│   ├── components/             # Reusable UI components
│   │   ├── layout/             # Header, navigation, footer
│   │   ├── forms/              # MatchEntryForm (1v1 & 2v2), AddPlayerForm
│   │   ├── cards/              # PlayerCard, StandingsCard, PlayerProfileCard
│   │   ├── widgets/            # WhiskeySurvey, FunComments, WeekSelector, RandomPhrases
│   │   └── ui/                 # Primitives (Button, Input, Avatar, Dialog/Modal)
│   ├── lib/                    # Core logic and service layers
│   │   ├── supabase/           # Supabase client & table services
│   │   │   ├── client.ts       # Supabase client initialization
│   │   │   ├── players.ts      # Player CRUD & image upload
│   │   │   ├── matches.ts      # Match CRUD (with 2v2 support & soft-delete)
│   │   │   ├── standings.ts    # Queries for weekly & all-time views
│   │   │   ├── survey.ts       # Real-time Whiskey survey service
│   │   │   └── stats.ts        # Fun stats & dynamic mocking calculations
│   │   ├── utils/              # Helper utilities
│   │   │   ├── dateHelpers.ts  # Saturday-based week key calculations (Israel Timezone)
│   │   │   ├── avatarHelpers.ts# SVG initials fallback generator
│   │   │   └── validation.ts   # Form & payload validation
│   │   └── types/              # Unified TypeScript definitions
│   │       ├── database.ts     # Supabase generated types
│   │       ├── player.ts
│   │       ├── match.ts
│   │       ├── standings.ts
│   │       └── survey.ts
│   └── styles/                 # Global styles and Tailwind configuration
├── public/
│   ├── favicon.ico
│   └── manifest.json           # PWA configuration
├── supabase/                   # Supabase configuration & migrations
│   ├── schema.sql              # Core tables, views, indexes, RLS
│   ├── storage.sql             # Storage bucket definitions & policies
│   └── seed.sql                # Initial test seed data
├── .env.local                  # Supabase URL & Anon Key
├── next.config.js
├── tailwind.config.ts
└── README.md


---

## 🗄️ Database Schema & Architecture (START HERE)

### 1. Extensions & Players Table
```sql
create extension if not exists "uuid-ossp";

create table players (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  profile_picture_url text,
  created_at timestamptz default now() not null
);
2. Matches Table (with 2v2 Support & Soft Delete)
SQL
create table matches (
  id uuid default uuid_generate_v4() primary key,
  game_mode text default '1v1' not null check (game_mode in ('1v1', '2v2')),
  
  -- Home Side
  home_player_1_id uuid references players(id) not null,
  home_player_2_id uuid references players(id), -- Optional, used in 2v2
  home_score integer not null check (home_score >= 0),
  home_team_name text,
  
  -- Away Side
  away_player_1_id uuid references players(id) not null,
  away_player_2_id uuid references players(id), -- Optional, used in 2v2
  away_score integer not null check (away_score >= 0),
  away_team_name text,
  
  -- Timing & Archiving
  week_start_date date not null, -- Saturday of the relevant cycle
  created_at timestamptz default now() not null,
  deleted_at timestamptz default null, -- Soft-delete support
  
  -- Validation: Prevent player duplicates within the same match
  constraint chk_distinct_1v1 check (
    home_player_1_id <> away_player_1_id
  ),
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
3. Whiskey Survey Table (Shared Real-Time Voting)
SQL
create table whiskey_votes (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references players(id) on delete cascade not null,
  voter_token text not null, -- Anonymous client ID / device fingerprint
  week_start_date date not null,
  vote_date date default current_date not null,
  created_at timestamptz default now() not null,
  unique(voter_token, vote_date) -- One vote per device per day
);
4. Dynamic Standings Views (No Inconsistent Tables)
SQL
-- Weekly Standings View
create or replace view weekly_standings as
with unnested_matches as (
  -- Home Player 1
  select week_start_date, home_player_1_id as player_id, home_score as gf, away_score as ga,
         case when home_score > away_score then 3 when home_score = away_score then 1 else 0 end as points,
         home_score > away_score as is_win, home_score = away_score as is_draw, home_score < away_score as is_loss
  from matches where deleted_at is null
  union all
  -- Home Player 2 (if 2v2)
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
  -- Away Player 2 (if 2v2)
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

-- All-Time Standings View
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
5. Performance Indexes & RLS Policies
SQL
-- Indexes
create index idx_matches_home_p1 on matches(home_player_1_id);
create index idx_matches_away_p1 on matches(away_player_1_id);
create index idx_matches_week_date on matches(week_start_date);
create index idx_matches_deleted_at on matches(deleted_at);
create index idx_whiskey_week_date on whiskey_votes(week_start_date);

-- Enable RLS
alter table players enable row level security;
alter table matches enable row level security;
alter table whiskey_votes enable row level security;

-- Open Access Policies
create policy "Open access for players" on players for all using (true) with check (true);
create policy "Open access for matches" on matches for all using (true) with check (true);
create policy "Open access for whiskey votes" on whiskey_votes for all using (true) with check (true);
6. Storage Bucket Configuration (Avatars)
SQL
-- Create avatars bucket
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public avatar access" on storage.objects for select using (bucket_id = 'avatars');
create policy "Public avatar upload" on storage.objects for insert with check (bucket_id = 'avatars');
create policy "Public avatar update" on storage.objects for update using (bucket_id = 'avatars');
💡 Component Architecture (UI Execution)
Layout & Global State
RootLayout: Standard HTML with lang="he" and dir="rtl", Hebrew font, and toast notifications container.

MainHeader: App title, active Saturday date badge, and navigation tabs.

RealtimeProvider: Global Supabase subscription listeners for matches and whiskey_votes.

Home Page Focus (/)
FunCommentsDisplay: Top banner showing rotating banter and classic group phrases.

PlayerCardGrid: Prominent grid of large cards showing:

Avatar (uploaded image or initials fallback)

Player name & current rank medal (🥇, 🥈, 🥉)

Current week stats: Pld, W-D-L, Points, Goal Difference

Dynamic humor badge (e.g., "Controller Destroyer", "King of קובה")

AddPlayerModal: Modal dialog to quickly add a player name and upload a profile picture.

FloatingActionButton: Fast entry for both "Add Match" and "Add Player".

Match Management (/history & Components)
MatchEntryForm:

1v1 / 2v2 mode toggle

Team 1 & Team 2 player selectors (prevents selecting the same player twice)

Numerical score inputs with quick stepper buttons (+ / -)

Optional team name inputs

Automatic week_start_date assignment

MatchHistoryTable: Filterable list of games with score editing and soft-delete/restore confirmation.

Social & Banter Widgets
WhiskeySurveyCard: Daily voting poll displaying live vote bars, voter counts, and "Who brings the bottle this week".

HeadToHeadModal: Direct comparison between any two players (win percentage, total goals, recent match history).

🎨 Design System & RTL Specifications
Palette
Background: #0f172a (Modern Dark Slate) or clean #ffffff

Surface/Card: #1e293b (Elevated dark surface) / #f8f9fa (Light mode)

Primary / Brand: #3b82f6 (Vibrant Blue)

Success / Win: #10b981 (Emerald Green)

Draw: #f59e0b (Amber)

Destructive / Loss: #ef4444 (Coral Red)

Accent / Banter: #8b5cf6 (Purple / Fun highlights)

Typography & Formatting
Hebrew Support: System UI font stack (system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)

Direction: Strict RTL layout with proper padding and icon orientation (dir="rtl")

Touch-First: 48px minimum touch target height for buttons and score inputs

🔧 Technical Implementation Roadmap
Phase 0: Backend & Database Foundations (FIRST STEP)
Run complete SQL migration in Supabase (tables, views, indexes, RLS, storage).

Set up lib/supabase/client.ts with typed definitions.

Implement lib/utils/dateHelpers.ts with getSaturdayWeekKey(date) anchored to Israel Timezone.

Add avatar upload helper with automated fallback generator.

Populate seed data with 6–8 players and sample 1v1 and 2v2 matches to verify the database views.

Phase 1: Service Layer & Business Logic
matches.ts: Create, update, soft-delete, and fetch matches.

standings.ts: Fetch from weekly_standings and all_time_standings.

survey.ts: Submit vote, retrieve daily/weekly survey results.

stats.ts: Calculate dynamic fun stats (streaks, goal drought, comeback metrics).

Set up Supabase Realtime listeners for instant view invalidation on client.

Phase 2: Core User Interface
Build RTL base layout and responsive navigation.

Build Home Page with PlayerCardGrid and rotating banter banner.

Implement AddPlayerModal with image upload and instant preview.

Implement MatchEntryForm supporting both 1v1 and 2v2 mode.

Implement StandingsTable with week selector dropdown.

Phase 3: Social & Extended Features
Connect WhiskeySurvey widget to Supabase realtime channel.

Build Player Profile pages (/players/[id]) with detailed stats and head-to-head match history.

Build Match History page with score editing and soft-delete confirmation.

Configure PWA manifest and mobile app icons.

Phase 4: Field Testing & Polish
Run user testing during a Saturday game night.

Verify week boundary transition at the end of Saturday night.

Fine-tune fun comments and banter triggers based on group reactions.

🧪 Testing & Verification Checklist
Backend & Data Integrity
[ ] 1v1 matches insert with accurate week_start_date

[ ] 2v2 matches reject duplicate player selections

[ ] Soft-deleted matches immediately drop out of weekly_standings view

[ ] Updating a match score recalculates standings views in real time without stale data

[ ] Storage bucket accepts image uploads and serves public URLs correctly

[ ] Whiskey survey limits votes to 1 per device token per day

Frontend & Realtime UI
[ ] Live standings refresh automatically when a match is logged on another device

[ ] Player cards render properly with initials when no image URL is provided

[ ] Rotating comments cycle smoothly every 20–30 seconds

[ ] RTL layout displays labels, numbers, and scores in proper Hebrew alignment

[ ] Match form works smoothly on mobile without zoom glitches

✅ Measurable Success Criteria
Zero Setup Friction: Any friend can open the link and log a match within 15 seconds.

Instant Sync: Standings and survey updates appear on all connected devices in < 2 seconds.

Data Integrity: Edits and soft-deletions never leave the tournament standings in an inconsistent state.

Social Engagement: The whiskey survey and dynamic banter stats become an active part of the Saturday קובה routine.