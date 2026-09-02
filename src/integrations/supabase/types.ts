export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          completed_at: string | null
          created_at: string
          difficulty: string
          feedback: Json | null
          group_id: string | null
          id: string
          learning_input: string | null
          score: number | null
          session_id: string | null
          status: string
          topics: string[]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string
          feedback?: Json | null
          group_id?: string | null
          id?: string
          learning_input?: string | null
          score?: number | null
          session_id?: string | null
          status?: string
          topics?: string[]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          difficulty?: string
          feedback?: Json | null
          group_id?: string | null
          id?: string
          learning_input?: string | null
          score?: number | null
          session_id?: string | null
          status?: string
          topics?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_presence: {
        Row: {
          camera_on: boolean
          channel_id: string
          group_id: string
          id: string
          joined_at: string
          mode: string
          muted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          camera_on?: boolean
          channel_id: string
          group_id: string
          id?: string
          joined_at?: string
          mode?: string
          muted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          camera_on?: boolean
          channel_id?: string
          group_id?: string
          id?: string
          joined_at?: string
          mode?: string
          muted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_presence_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_presence_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          name: string
          position: number
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          name: string
          position?: number
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          name?: string
          position?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      doubt_replies: {
        Row: {
          content: string
          created_at: string
          doubt_id: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          doubt_id: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          doubt_id?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_replies_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doubt_replies_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          ai_explanation: string | null
          created_at: string
          group_id: string
          id: string
          question: string
          status: string
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          created_at?: string
          group_id: string
          id?: string
          question: string
          status?: string
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          created_at?: string
          group_id?: string
          id?: string
          question?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          invite_code: string
          learning_goal: string | null
          name: string
          owner_id: string
          start_date: string | null
          subject: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string
          learning_goal?: string | null
          name: string
          owner_id: string
          start_date?: string | null
          subject?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          invite_code?: string
          learning_goal?: string | null
          name?: string
          owner_id?: string
          start_date?: string | null
          subject?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          group_id: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          group_id: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          group_id?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string | null
          content: string
          created_at: string
          group_id: string
          id: string
          is_system: boolean
          pinned: boolean
          reply_to: string | null
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          content: string
          created_at?: string
          group_id: string
          id?: string
          is_system?: boolean
          pinned?: boolean
          reply_to?: string | null
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          is_system?: boolean
          pinned?: boolean
          reply_to?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_streak: number
          email: string | null
          full_name: string
          id: string
          last_active_day: string | null
          last_seen_at: string
          learning_interests: string[]
          longest_streak: number
          onboarded: boolean
          preferred_study_times: string | null
          presence: string
          total_xp: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          email?: string | null
          full_name?: string
          id: string
          last_active_day?: string | null
          last_seen_at?: string
          learning_interests?: string[]
          longest_streak?: number
          onboarded?: boolean
          preferred_study_times?: string | null
          presence?: string
          total_xp?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          email?: string | null
          full_name?: string
          id?: string
          last_active_day?: string | null
          last_seen_at?: string
          learning_interests?: string[]
          longest_streak?: number
          onboarded?: boolean
          preferred_study_times?: string | null
          presence?: string
          total_xp?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          assessment_id: string
          correct_answer: string
          difficulty: string
          explanation: string | null
          id: string
          options: string[]
          position: number
          question: string
          topic: string | null
          type: string
        }
        Insert: {
          assessment_id: string
          correct_answer: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: string[]
          position?: number
          question: string
          topic?: string | null
          type?: string
        }
        Update: {
          assessment_id?: string
          correct_answer?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: string[]
          position?: number
          question?: string
          topic?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_completions: {
        Row: {
          completed_at: string
          id: string
          resource_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          resource_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          resource_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_completions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          added_by: string | null
          author_name: string | null
          created_at: string
          group_id: string
          id: string
          notes: string | null
          resource_type: string
          thumbnail_url: string | null
          title: string
          topic_id: string | null
          url: string
        }
        Insert: {
          added_by?: string | null
          author_name?: string | null
          created_at?: string
          group_id: string
          id?: string
          notes?: string | null
          resource_type?: string
          thumbnail_url?: string | null
          title: string
          topic_id?: string | null
          url: string
        }
        Update: {
          added_by?: string | null
          author_name?: string | null
          created_at?: string
          group_id?: string
          id?: string
          notes?: string | null
          resource_type?: string
          thumbnail_url?: string | null
          title?: string
          topic_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          left_at: string | null
          participation_mode: string
          session_id: string
          total_minutes: number
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          participation_mode?: string
          session_id: string
          total_minutes?: number
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          participation_mode?: string
          session_id?: string
          total_minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          break_minutes: number | null
          channel_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string
          group_id: string
          id: string
          meeting_url: string | null
          recurrence: string
          recurrence_days: number[]
          resource_url: string | null
          start_time: string
          status: string
          study_minutes: number | null
          title: string
          topic_id: string | null
        }
        Insert: {
          break_minutes?: number | null
          channel_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time: string
          group_id: string
          id?: string
          meeting_url?: string | null
          recurrence?: string
          recurrence_days?: number[]
          resource_url?: string | null
          start_time: string
          status?: string
          study_minutes?: number | null
          title: string
          topic_id?: string | null
        }
        Update: {
          break_minutes?: number | null
          channel_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string
          group_id?: string
          id?: string
          meeting_url?: string | null
          recurrence?: string
          recurrence_days?: number[]
          resource_url?: string | null
          start_time?: string
          status?: string
          study_minutes?: number | null
          title?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          group_id: string
          id: string
          position: number
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id: string
          id?: string
          position?: number
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string
          id?: string
          position?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reports: {
        Row: {
          created_at: string
          group_id: string
          id: string
          report_data: Json
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          report_data: Json
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          report_data?: Json
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          group_id: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          group_id?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          group_id?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_admin: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
