export type GameMode = '1v1' | '2v2'

export interface Player {
  id: string
  name: string
  profile_picture_url: string | null
  created_at: string
  /** Whether the player is active. Inactive players are greyed out in lists. */
  is_active?: boolean
}

export interface Match {
  id: string
  game_mode: GameMode
  home_player_1_id: string
  home_player_2_id: string | null
  home_score: number
  home_team_name: string | null
  away_player_1_id: string
  away_player_2_id: string | null
  away_score: number
  away_team_name: string | null
  week_start_date: string
  created_at: string
  deleted_at: string | null
}

/** A match joined with player names for display. */
export interface MatchWithPlayers extends Match {
  home_player_1_name: string
  home_player_2_name: string | null
  away_player_1_name: string
  away_player_2_name: string | null
  home_avatar_url: string | null
  away_avatar_url: string | null
}

export interface StandingsRow {
  player_id: string
  player_name: string
  profile_picture_url: string | null
  week_start_date: string
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  win_percentage: number
}

export interface WhiskeyVote {
  id: string
  player_id: string
  voter_token: string
  week_start_date: string
  vote_date: string
  created_at: string
}

export interface WhiskeyResult {
  player_id: string
  player_name: string
  profile_picture_url: string | null
  votes: number
}

export interface ChatMessage {
  id: string
  author_name: string
  body: string
  created_at: string
}

export interface Setting {
  key: string
  value: Record<string, unknown>
  updated_at: string
}
