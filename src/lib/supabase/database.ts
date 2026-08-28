import type { Mode } from "@/lib/data/types";
import type { ProfileGrantId, ProfileHeaderId } from "@/lib/profile/headers";
import type { ProfilePageThemeId } from "@/lib/profile/themes";
import type { ClimbTarget, WzPlacementId } from "@/lib/ranked";

export type ProfileRow = {
  id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  equipped_header_id: ProfileHeaderId;
  page_theme_id: ProfilePageThemeId;
  preferred_mode: Mode;
  climb_goals: ClimbTarget[];
  current_sr: number;
  is_private: boolean;
  notify_cutoff: boolean;
  notify_climb: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileGrantRow = {
  profile_id: string;
  grant_id: ProfileGrantId;
};

export type ClimbSessionRow = {
  id: string;
  user_id: string;
  mode: Mode;
  started_at: string;
  ended_at: string | null;
  start_sr: number;
};

export type ClimbMatchRow = {
  id: string;
  user_id: string;
  session_id: string;
  mode: Mode;
  created_at: string;
  sr_before: number;
  sr_after: number;
  net: number;
  placement: WzPlacementId | null;
  squad_elims: number | null;
  your_elims: number | null;
  fee: number | null;
  placement_sr: number | null;
  elim_sr: number | null;
  capped: boolean | null;
  sr_per_win: number | null;
  teammates: Array<{
    displayName: string;
    slug: string | null;
    avatarUrl: string | null;
  }>;
};

export type ProfileVoteRow = {
  voter_id: string;
  profile_id: string;
  value: -1 | 1;
  created_at: string;
  updated_at: string;
};

export type DesktopWaitlistRow = {
  id: string;
  email: string;
  user_id: string | null;
  want_updates: boolean;
  want_beta: boolean;
  source: string;
  created_at: string;
};

export type MatchInviteStatus = "pending" | "accepted" | "denied";

export type MatchInviteRow = {
  id: string;
  source_match_id: string;
  inviter_id: string;
  invitee_id: string;
  status: MatchInviteStatus;
  accepted_match_id: string | null;
  created_at: string;
  responded_at: string | null;
};

export type CastProfileVoteResult = {
  ups: number;
  downs: number;
  viewer_vote: -1 | 1;
  can_change_vote: boolean;
};

export type Database = {
  public: {
    Tables: {
      seasons: {
        Row: {
          id: string;
          name: string;
          starts_at: string;
          ends_at: string | null;
          is_active: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      snapshots: {
        Row: {
          id: string;
          season_id: string;
          mode: Mode;
          captured_at: string;
          source: string;
          cutoff_sr: number;
          rank1_sr: number;
          player_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          slug: string;
          display_name: string;
          avatar_url?: string | null;
          equipped_header_id?: ProfileHeaderId;
          page_theme_id?: ProfilePageThemeId;
          preferred_mode?: Mode;
          climb_goals?: ClimbTarget[];
          current_sr?: number;
          is_private?: boolean;
          notify_cutoff?: boolean;
          notify_climb?: boolean;
          onboarding_completed_at?: string | null;
        };
        Update: {
          slug?: string;
          display_name?: string;
          avatar_url?: string | null;
          equipped_header_id?: ProfileHeaderId;
          page_theme_id?: ProfilePageThemeId;
          preferred_mode?: Mode;
          climb_goals?: ClimbTarget[];
          current_sr?: number;
          is_private?: boolean;
          notify_cutoff?: boolean;
          notify_climb?: boolean;
          onboarding_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_grants: {
        Row: ProfileGrantRow;
        Insert: ProfileGrantRow;
        Update: never;
        Relationships: [];
      };
      climb_sessions: {
        Row: ClimbSessionRow;
        Insert: ClimbSessionRow;
        Update: Partial<Omit<ClimbSessionRow, "id" | "user_id">>;
        Relationships: [];
      };
      climb_matches: {
        Row: ClimbMatchRow;
        Insert: ClimbMatchRow;
        Update: Partial<Omit<ClimbMatchRow, "id" | "user_id">>;
        Relationships: [];
      };
      profile_votes: {
        Row: ProfileVoteRow;
        Insert: {
          voter_id: string;
          profile_id: string;
          value: -1 | 1;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          value?: -1 | 1;
          updated_at?: string;
        };
        Relationships: [];
      };
      desktop_waitlist: {
        Row: DesktopWaitlistRow;
        Insert: {
          id?: string;
          email: string;
          user_id?: string | null;
          want_updates?: boolean;
          want_beta?: boolean;
          source?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      match_invites: {
        Row: MatchInviteRow;
        Insert: {
          id?: string;
          source_match_id: string;
          inviter_id: string;
          invitee_id: string;
          status?: MatchInviteStatus;
          accepted_match_id?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          status?: MatchInviteStatus;
          accepted_match_id?: string | null;
          responded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_invites_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_invites_invitee_id_fkey";
            columns: ["invitee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_invites_source_match_id_fkey";
            columns: ["source_match_id"];
            isOneToOne: false;
            referencedRelation: "climb_matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_invites_accepted_match_id_fkey";
            columns: ["accepted_match_id"];
            isOneToOne: false;
            referencedRelation: "climb_matches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cast_profile_vote: {
        Args: { target_id: string; vote: number };
        Returns: CastProfileVoteResult;
      };
    };
    CompositeTypes: Record<string, never>;
    Enums: {
      mode: Mode;
      match_invite_status: MatchInviteStatus;
    };
  };
};
