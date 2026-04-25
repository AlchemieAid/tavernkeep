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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          revoked_at: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          revoked_at?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          revoked_at?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          access_count: number | null
          accessed_at: string | null
          cache_key: string
          created_at: string
          response: Json
        }
        Insert: {
          access_count?: number | null
          accessed_at?: string | null
          cache_key: string
          created_at?: string
          response: Json
        }
        Update: {
          access_count?: number | null
          accessed_at?: string | null
          cache_key?: string
          created_at?: string
          response?: Json
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string | null
          dm_id: string
          estimated_cost: number
          generation_type: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          prompt: string
          tokens_used: number
        }
        Insert: {
          created_at?: string | null
          dm_id: string
          estimated_cost: number
          generation_type: string
          id?: string
          input_tokens: number
          model: string
          output_tokens: number
          prompt: string
          tokens_used: number
        }
        Update: {
          created_at?: string | null
          dm_id?: string
          estimated_cost?: number
          generation_type?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          prompt?: string
          tokens_used?: number
        }
        Relationships: []
      }
      app_config: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          schema: Json | null
          updated_at: string
          updated_by: string | null
          value: Json
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          schema?: Json | null
          updated_at?: string
          updated_by?: string | null
          value: Json
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          schema?: Json | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
        }
        Relationships: []
      }
      app_config_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          config_id: string
          id: string
          key: string
          new_value: Json
          old_value: Json
          version: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          config_id: string
          id?: string
          key: string
          new_value: Json
          old_value: Json
          version: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          config_id?: string
          id?: string
          key?: string
          new_value?: Json
          old_value?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "app_config_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "app_config"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_maps: {
        Row: {
          biome_profile: string | null
          campaign_id: string
          created_at: string | null
          creation_method: string
          dm_id: string
          generation_count: number | null
          height_px: number | null
          id: string
          image_url: string
          is_selected: boolean | null
          map_grammar: Json | null
          map_size: string
          map_style: string | null
          original_filename: string | null
          setup_stage: string
          width_px: number | null
        }
        Insert: {
          biome_profile?: string | null
          campaign_id: string
          created_at?: string | null
          creation_method?: string
          dm_id: string
          generation_count?: number | null
          height_px?: number | null
          id?: string
          image_url: string
          is_selected?: boolean | null
          map_grammar?: Json | null
          map_size: string
          map_style?: string | null
          original_filename?: string | null
          setup_stage?: string
          width_px?: number | null
        }
        Update: {
          biome_profile?: string | null
          campaign_id?: string
          created_at?: string | null
          creation_method?: string
          dm_id?: string
          generation_count?: number | null
          height_px?: number | null
          id?: string
          image_url?: string
          is_selected?: boolean | null
          map_grammar?: Json | null
          map_size?: string
          map_style?: string | null
          original_filename?: string | null
          setup_stage?: string
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_maps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_maps_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_members: {
        Row: {
          campaign_id: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          last_active_at: string
          player_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          last_active_at?: string
          player_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          last_active_at?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          currencies: Json | null
          currency: string | null
          currency_description: string | null
          currency_name: string | null
          description: string | null
          dm_id: string
          history: string | null
          id: string
          invite_token: string
          name: string
          pantheon: string | null
          ruleset: string | null
          setting: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          currencies?: Json | null
          currency?: string | null
          currency_description?: string | null
          currency_name?: string | null
          description?: string | null
          dm_id: string
          history?: string | null
          id?: string
          invite_token: string
          name: string
          pantheon?: string | null
          ruleset?: string | null
          setting?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          currencies?: Json | null
          currency?: string | null
          currency_description?: string | null
          currency_name?: string | null
          description?: string | null
          dm_id?: string
          history?: string | null
          id?: string
          invite_token?: string
          name?: string
          pantheon?: string | null
          ruleset?: string | null
          setting?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          character_id: string
          created_at: string
          id: string
          item_id: string
          locked_at: string
          quantity: number
          shop_id: string
          updated_at: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          item_id: string
          locked_at?: string
          quantity?: number
          shop_id: string
          updated_at?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          item_id?: string
          locked_at?: string
          quantity?: number
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          base_price: number
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          description: string | null
          id: string
          is_magical: boolean
          name: string
          price_currency: string
          rarity: Database["public"]["Enums"]["item_rarity"]
          requires_attunement: boolean
          ruleset: string
          shop_tags: string[]
          source_book: string | null
          system_stats: Json | null
          weight: number | null
        }
        Insert: {
          base_price?: number
          category: Database["public"]["Enums"]["item_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_magical?: boolean
          name: string
          price_currency?: string
          rarity?: Database["public"]["Enums"]["item_rarity"]
          requires_attunement?: boolean
          ruleset?: string
          shop_tags?: string[]
          source_book?: string | null
          system_stats?: Json | null
          weight?: number | null
        }
        Update: {
          base_price?: number
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_magical?: boolean
          name?: string
          price_currency?: string
          rarity?: Database["public"]["Enums"]["item_rarity"]
          requires_attunement?: boolean
          ruleset?: string
          shop_tags?: string[]
          source_book?: string | null
          system_stats?: Json | null
          weight?: number | null
        }
        Relationships: []
      }
      characters: {
        Row: {
          avatar_url: string | null
          campaign_id: string
          created_at: string
          id: string
          name: string
          player_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          name: string
          player_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          name?: string
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_events: {
        Row: {
          campaign_id: string
          created_at: string | null
          description: string | null
          dm_id: string
          event_name: string
          event_type: string | null
          id: string
          is_known_to_players: boolean | null
          lingering_effect: string | null
          map_id: string
          x_pct: number
          y_pct: number
          years_ago: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          description?: string | null
          dm_id: string
          event_name: string
          event_type?: string | null
          id?: string
          is_known_to_players?: boolean | null
          lingering_effect?: string | null
          map_id: string
          x_pct: number
          y_pct: number
          years_ago?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          dm_id?: string
          event_name?: string
          event_type?: string | null
          id?: string
          is_known_to_players?: boolean | null
          lingering_effect?: string | null
          map_id?: string
          x_pct?: number
          y_pct?: number
          years_ago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_events_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historical_events_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      item_library: {
        Row: {
          attunement_required: boolean
          base_price_gp: number
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          cursed: boolean
          description: string | null
          dm_id: string
          id: string
          is_magical: boolean
          name: string
          notes: string | null
          properties: Json | null
          rarity: Database["public"]["Enums"]["item_rarity"]
          ruleset: string
          shop_tags: string[]
          updated_at: string
          weight_lbs: number | null
        }
        Insert: {
          attunement_required?: boolean
          base_price_gp?: number
          category: Database["public"]["Enums"]["item_category"]
          created_at?: string
          cursed?: boolean
          description?: string | null
          dm_id: string
          id?: string
          is_magical?: boolean
          name: string
          notes?: string | null
          properties?: Json | null
          rarity?: Database["public"]["Enums"]["item_rarity"]
          ruleset?: string
          shop_tags?: string[]
          updated_at?: string
          weight_lbs?: number | null
        }
        Update: {
          attunement_required?: boolean
          base_price_gp?: number
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          cursed?: boolean
          description?: string | null
          dm_id?: string
          id?: string
          is_magical?: boolean
          name?: string
          notes?: string | null
          properties?: Json | null
          rarity?: Database["public"]["Enums"]["item_rarity"]
          ruleset?: string
          shop_tags?: string[]
          updated_at?: string
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_library_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          added_at: string
          attunement_required: boolean | null
          base_price_gp: number
          category: Database["public"]["Enums"]["item_category"]
          crafting_time_days: number | null
          currency_reference: string | null
          cursed: boolean | null
          deleted_at: string | null
          description: string | null
          expires_at: string | null
          hidden_condition: string | null
          id: string
          identified: boolean | null
          image_url: string | null
          is_hidden: boolean
          is_revealed: boolean
          name: string
          properties: Json | null
          rarity: Database["public"]["Enums"]["item_rarity"]
          reveal_state: boolean
          shop_id: string
          source: Database["public"]["Enums"]["item_source"] | null
          stock_quantity: number
          weight_lbs: number | null
        }
        Insert: {
          added_at?: string
          attunement_required?: boolean | null
          base_price_gp: number
          category: Database["public"]["Enums"]["item_category"]
          crafting_time_days?: number | null
          currency_reference?: string | null
          cursed?: boolean | null
          deleted_at?: string | null
          description?: string | null
          expires_at?: string | null
          hidden_condition?: string | null
          id?: string
          identified?: boolean | null
          image_url?: string | null
          is_hidden?: boolean
          is_revealed?: boolean
          name: string
          properties?: Json | null
          rarity: Database["public"]["Enums"]["item_rarity"]
          reveal_state?: boolean
          shop_id: string
          source?: Database["public"]["Enums"]["item_source"] | null
          stock_quantity?: number
          weight_lbs?: number | null
        }
        Update: {
          added_at?: string
          attunement_required?: boolean | null
          base_price_gp?: number
          category?: Database["public"]["Enums"]["item_category"]
          crafting_time_days?: number | null
          currency_reference?: string | null
          cursed?: boolean | null
          deleted_at?: string | null
          description?: string | null
          expires_at?: string | null
          hidden_condition?: string | null
          id?: string
          identified?: boolean | null
          image_url?: string | null
          is_hidden?: boolean
          is_revealed?: boolean
          name?: string
          properties?: Json | null
          rarity?: Database["public"]["Enums"]["item_rarity"]
          reveal_state?: boolean
          shop_id?: string
          source?: Database["public"]["Enums"]["item_source"] | null
          stock_quantity?: number
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      notable_people: {
        Row: {
          backstory: string | null
          created_at: string | null
          dm_id: string
          id: string
          image_url: string | null
          is_revealed: boolean
          motivation: string | null
          name: string
          personality_traits: string[] | null
          race: string | null
          role: string
          town_id: string
          updated_at: string | null
        }
        Insert: {
          backstory?: string | null
          created_at?: string | null
          dm_id: string
          id?: string
          image_url?: string | null
          is_revealed?: boolean
          motivation?: string | null
          name: string
          personality_traits?: string[] | null
          race?: string | null
          role: string
          town_id: string
          updated_at?: string | null
        }
        Update: {
          backstory?: string | null
          created_at?: string | null
          dm_id?: string
          id?: string
          image_url?: string | null
          is_revealed?: boolean
          motivation?: string | null
          name?: string
          personality_traits?: string[] | null
          race?: string | null
          role?: string
          town_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notable_people_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      party_access: {
        Row: {
          campaign_id: string
          id: string
          last_seen_at: string
          player_alias: string | null
          session_token: string
        }
        Insert: {
          campaign_id: string
          id?: string
          last_seen_at?: string
          player_alias?: string | null
          session_token: string
        }
        Update: {
          campaign_id?: string
          id?: string
          last_seen_at?: string
          player_alias?: string | null
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_access_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      points_of_interest: {
        Row: {
          campaign_id: string
          created_at: string | null
          description: string | null
          dm_id: string
          id: string
          image_url: string | null
          is_discovered: boolean | null
          is_visible_to_players: boolean | null
          linked_shop_id: string | null
          linked_town_id: string | null
          map_id: string
          name: string | null
          player_hint: string | null
          poi_category: string
          poi_type: string
          x_pct: number
          y_pct: number
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          description?: string | null
          dm_id: string
          id?: string
          image_url?: string | null
          is_discovered?: boolean | null
          is_visible_to_players?: boolean | null
          linked_shop_id?: string | null
          linked_town_id?: string | null
          map_id: string
          name?: string | null
          player_hint?: string | null
          poi_category: string
          poi_type: string
          x_pct: number
          y_pct: number
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          description?: string | null
          dm_id?: string
          id?: string
          image_url?: string | null
          is_discovered?: boolean | null
          is_visible_to_players?: boolean | null
          linked_shop_id?: string | null
          linked_town_id?: string | null
          map_id?: string
          name?: string | null
          player_hint?: string | null
          poi_category?: string
          poi_type?: string
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "points_of_interest_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_linked_shop_id_fkey"
            columns: ["linked_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_linked_town_id_fkey"
            columns: ["linked_town_id"]
            isOneToOne: false
            referencedRelation: "world_towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_interest_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      political_territories: {
        Row: {
          attitude_to_strangers: string | null
          campaign_id: string
          color: string | null
          created_at: string | null
          dm_id: string
          faction: string | null
          id: string
          law_level: string | null
          map_id: string
          name: string
          notes: string | null
          patrol_intensity: string | null
          polygon: Json
        }
        Insert: {
          attitude_to_strangers?: string | null
          campaign_id: string
          color?: string | null
          created_at?: string | null
          dm_id: string
          faction?: string | null
          id?: string
          law_level?: string | null
          map_id: string
          name: string
          notes?: string | null
          patrol_intensity?: string | null
          polygon: Json
        }
        Update: {
          attitude_to_strangers?: string | null
          campaign_id?: string
          color?: string | null
          created_at?: string | null
          dm_id?: string
          faction?: string | null
          id?: string
          law_level?: string | null
          map_id?: string
          name?: string
          notes?: string | null
          patrol_intensity?: string | null
          polygon?: Json
        }
        Relationships: [
          {
            foreignKeyName: "political_territories_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "political_territories_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "political_territories_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      resource_points: {
        Row: {
          id: string
          influence_radius_pct: number | null
          map_id: string
          name: string | null
          placed_by: string | null
          resource_type: string
          richness: number
          x_pct: number
          y_pct: number
        }
        Insert: {
          id?: string
          influence_radius_pct?: number | null
          map_id: string
          name?: string | null
          placed_by?: string | null
          resource_type: string
          richness: number
          x_pct: number
          y_pct: number
        }
        Update: {
          id?: string
          influence_radius_pct?: number | null
          map_id?: string
          name?: string | null
          placed_by?: string | null
          resource_type?: string
          richness?: number
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "resource_points_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          campaign_id: string
          created_at: string
          dm_id: string
          economic_tier: Database["public"]["Enums"]["economic_tier"]
          haggle_dc: number | null
          haggle_enabled: boolean
          id: string
          inventory_volatility: Database["public"]["Enums"]["inventory_volatility"]
          is_active: boolean
          is_public: boolean | null
          is_revealed: boolean
          keeper_backstory: string | null
          keeper_image_url: string | null
          keeper_motivation: string | null
          keeper_name: string | null
          keeper_personality_traits: string[] | null
          keeper_race: string | null
          last_restocked_at: string | null
          location_descriptor: string | null
          name: string
          notable_person_id: string | null
          operating_hours: string | null
          price_modifier: number
          reputation: Database["public"]["Enums"]["shop_reputation"] | null
          security: Database["public"]["Enums"]["shop_security"] | null
          shop_exterior_image_url: string | null
          shop_interior_image_url: string | null
          shop_type: Database["public"]["Enums"]["shop_type"]
          size: Database["public"]["Enums"]["shop_size"] | null
          slug: string
          special_services: string[] | null
          town_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          dm_id: string
          economic_tier: Database["public"]["Enums"]["economic_tier"]
          haggle_dc?: number | null
          haggle_enabled?: boolean
          id?: string
          inventory_volatility?: Database["public"]["Enums"]["inventory_volatility"]
          is_active?: boolean
          is_public?: boolean | null
          is_revealed?: boolean
          keeper_backstory?: string | null
          keeper_image_url?: string | null
          keeper_motivation?: string | null
          keeper_name?: string | null
          keeper_personality_traits?: string[] | null
          keeper_race?: string | null
          last_restocked_at?: string | null
          location_descriptor?: string | null
          name: string
          notable_person_id?: string | null
          operating_hours?: string | null
          price_modifier?: number
          reputation?: Database["public"]["Enums"]["shop_reputation"] | null
          security?: Database["public"]["Enums"]["shop_security"] | null
          shop_exterior_image_url?: string | null
          shop_interior_image_url?: string | null
          shop_type: Database["public"]["Enums"]["shop_type"]
          size?: Database["public"]["Enums"]["shop_size"] | null
          slug: string
          special_services?: string[] | null
          town_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          dm_id?: string
          economic_tier?: Database["public"]["Enums"]["economic_tier"]
          haggle_dc?: number | null
          haggle_enabled?: boolean
          id?: string
          inventory_volatility?: Database["public"]["Enums"]["inventory_volatility"]
          is_active?: boolean
          is_public?: boolean | null
          is_revealed?: boolean
          keeper_backstory?: string | null
          keeper_image_url?: string | null
          keeper_motivation?: string | null
          keeper_name?: string | null
          keeper_personality_traits?: string[] | null
          keeper_race?: string | null
          last_restocked_at?: string | null
          location_descriptor?: string | null
          name?: string
          notable_person_id?: string | null
          operating_hours?: string | null
          price_modifier?: number
          reputation?: Database["public"]["Enums"]["shop_reputation"] | null
          security?: Database["public"]["Enums"]["shop_security"] | null
          shop_exterior_image_url?: string | null
          shop_interior_image_url?: string | null
          shop_type?: Database["public"]["Enums"]["shop_type"]
          size?: Database["public"]["Enums"]["shop_size"] | null
          slug?: string
          special_services?: string[] | null
          town_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_notable_person_id_fkey"
            columns: ["notable_person_id"]
            isOneToOne: false
            referencedRelation: "notable_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      terrain_areas: {
        Row: {
          annual_rainfall_mm: number | null
          atmosphere_generated_at: string | null
          atmosphere_text: string | null
          climate_zone: string | null
          computed_elevation_m: number | null
          ecosystem_fauna: string[] | null
          ecosystem_flora: string[] | null
          elevation_max_m: number | null
          elevation_min_m: number | null
          encounter_type: string | null
          foraging_yield: string | null
          growing_season_months: number | null
          hazards: Json | null
          id: string
          intensity: number
          map_id: string
          pass_open_months: number | null
          placed_by: string | null
          polygon: Json
          snowfall_likely: boolean | null
          temp_summer_high_c: number | null
          temp_winter_low_c: number | null
          terrain_type: string
        }
        Insert: {
          annual_rainfall_mm?: number | null
          atmosphere_generated_at?: string | null
          atmosphere_text?: string | null
          climate_zone?: string | null
          computed_elevation_m?: number | null
          ecosystem_fauna?: string[] | null
          ecosystem_flora?: string[] | null
          elevation_max_m?: number | null
          elevation_min_m?: number | null
          encounter_type?: string | null
          foraging_yield?: string | null
          growing_season_months?: number | null
          hazards?: Json | null
          id?: string
          intensity?: number
          map_id: string
          pass_open_months?: number | null
          placed_by?: string | null
          polygon: Json
          snowfall_likely?: boolean | null
          temp_summer_high_c?: number | null
          temp_winter_low_c?: number | null
          terrain_type: string
        }
        Update: {
          annual_rainfall_mm?: number | null
          atmosphere_generated_at?: string | null
          atmosphere_text?: string | null
          climate_zone?: string | null
          computed_elevation_m?: number | null
          ecosystem_fauna?: string[] | null
          ecosystem_flora?: string[] | null
          elevation_max_m?: number | null
          elevation_min_m?: number | null
          encounter_type?: string | null
          foraging_yield?: string | null
          growing_season_months?: number | null
          hazards?: Json | null
          id?: string
          intensity?: number
          map_id?: string
          pass_open_months?: number | null
          placed_by?: string | null
          polygon?: Json
          snowfall_likely?: boolean | null
          temp_summer_high_c?: number | null
          temp_winter_low_c?: number | null
          terrain_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "terrain_areas_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
        ]
      }
      towns: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          dm_id: string
          history: string | null
          id: string
          is_revealed: boolean
          location: Database["public"]["Enums"]["geographic_location"] | null
          name: string
          political_system:
            | Database["public"]["Enums"]["political_system"]
            | null
          population: number | null
          ruler: string | null
          ruler_id: string | null
          size: Database["public"]["Enums"]["town_size"] | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          dm_id: string
          history?: string | null
          id?: string
          is_revealed?: boolean
          location?: Database["public"]["Enums"]["geographic_location"] | null
          name: string
          political_system?:
            | Database["public"]["Enums"]["political_system"]
            | null
          population?: number | null
          ruler?: string | null
          ruler_id?: string | null
          size?: Database["public"]["Enums"]["town_size"] | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          dm_id?: string
          history?: string | null
          id?: string
          is_revealed?: boolean
          location?: Database["public"]["Enums"]["geographic_location"] | null
          name?: string
          political_system?:
            | Database["public"]["Enums"]["political_system"]
            | null
          population?: number | null
          ruler?: string | null
          ruler_id?: string | null
          size?: Database["public"]["Enums"]["town_size"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "towns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "towns_ruler_id_fkey"
            columns: ["ruler_id"]
            isOneToOne: false
            referencedRelation: "notable_people"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_routes: {
        Row: {
          id: string
          map_id: string
          path_points: Json | null
          primary_goods: string[] | null
          town_a_id: string
          town_b_id: string
          trade_volume: number | null
        }
        Insert: {
          id?: string
          map_id: string
          path_points?: Json | null
          primary_goods?: string[] | null
          town_a_id: string
          town_b_id: string
          trade_volume?: number | null
        }
        Update: {
          id?: string
          map_id?: string
          path_points?: Json | null
          primary_goods?: string[] | null
          town_a_id?: string
          town_b_id?: string
          trade_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_routes_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_routes_town_a_id_fkey"
            columns: ["town_a_id"]
            isOneToOne: false
            referencedRelation: "world_towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_routes_town_b_id_fkey"
            columns: ["town_b_id"]
            isOneToOne: false
            referencedRelation: "world_towns"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          dm_id: string | null
          id: string
          metadata: Json | null
          operation: string
          service: string
          timestamp: string
        }
        Insert: {
          dm_id?: string | null
          id?: string
          metadata?: Json | null
          operation: string
          service: string
          timestamp?: string
        }
        Update: {
          dm_id?: string | null
          id?: string
          metadata?: Json | null
          operation?: string
          service?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      world_towns: {
        Row: {
          campaign_id: string
          created_at: string | null
          dm_id: string
          economic_context: Json | null
          id: string
          map_id: string
          name: string | null
          poi_id: string | null
          population_est: number | null
          price_index: Json | null
          resource_snapshot: Json
          shop_id: string | null
          specializations: string[] | null
          town_tier: string | null
          trade_partners: Json | null
          wealth_score: number | null
          x_pct: number
          y_pct: number
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          dm_id: string
          economic_context?: Json | null
          id?: string
          map_id: string
          name?: string | null
          poi_id?: string | null
          population_est?: number | null
          price_index?: Json | null
          resource_snapshot: Json
          shop_id?: string | null
          specializations?: string[] | null
          town_tier?: string | null
          trade_partners?: Json | null
          wealth_score?: number | null
          x_pct: number
          y_pct: number
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          dm_id?: string
          economic_context?: Json | null
          id?: string
          map_id?: string
          name?: string | null
          poi_id?: string | null
          population_est?: number | null
          price_index?: Json | null
          resource_snapshot?: Json
          shop_id?: string | null
          specializations?: string[] | null
          town_tier?: string | null
          trade_partners?: Json | null
          wealth_score?: number | null
          x_pct?: number
          y_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_towns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_towns_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_towns_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "campaign_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_towns_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_towns_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      clean_expired_cache: {
        Args: { older_than_hours?: number }
        Returns: number
      }
      get_all_policies: {
        Args: never
        Returns: {
          cmd: string
          policyname: unknown
          qual: string
          schemaname: unknown
          tablename: unknown
          with_check: string
        }[]
      }
      get_cache_stats: {
        Args: never
        Returns: {
          avg_access_count: number
          newest_entry: string
          oldest_entry: string
          total_entries: number
          total_size_mb: number
        }[]
      }
      get_cart_conflicts: {
        Args: { p_item_id: string }
        Returns: {
          character_id: string
          character_name: string
          locked_at: string
          player_display_name: string
          quantity: number
        }[]
      }
      get_config: {
        Args: { config_key: string; fallback?: Json }
        Returns: Json
      }
      get_dangerous_policies: {
        Args: never
        Returns: {
          cmd: string
          issue: string
          policyname: unknown
          qual: string
          tablename: unknown
        }[]
      }
      get_table_policies: {
        Args: { table_name: string }
        Returns: {
          cmd: string
          policyname: unknown
          qual: string
          with_check: string
        }[]
      }
      is_admin: {
        Args: { required_role?: string; user_id: string }
        Returns: boolean
      }
      is_item_locked_by_other: {
        Args: { p_character_id: string; p_item_id: string }
        Returns: boolean
      }
      verify_dm_table_security: {
        Args: never
        Returns: {
          has_auth_check: boolean
          has_dm_id_check: boolean
          has_select_policy: boolean
          status: string
          tablename: string
        }[]
      }
    }
    Enums: {
      economic_tier: "poor" | "modest" | "comfortable" | "wealthy" | "opulent"
      geographic_location:
        | "desert"
        | "forest"
        | "wilderness"
        | "necropolis"
        | "arctic"
        | "plains"
        | "riverside"
        | "coastal"
        | "mountain"
        | "swamp"
        | "underground"
        | "floating"
        | "jungle"
      inventory_volatility: "static" | "slow" | "moderate" | "fast"
      item_category:
        | "weapon"
        | "armor"
        | "potion"
        | "scroll"
        | "tool"
        | "magic_item"
        | "misc"
      item_rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary"
      item_source:
        | "purchased"
        | "crafted"
        | "looted"
        | "generated"
        | "quest_reward"
        | "gift"
      political_system:
        | "monarchy"
        | "democracy"
        | "oligarchy"
        | "theocracy"
        | "anarchy"
        | "military"
        | "tribal"
        | "merchant_guild"
        | "magocracy"
      shop_reputation: "unknown" | "poor" | "fair" | "good" | "excellent"
      shop_security: "none" | "basic" | "moderate" | "high" | "fortress"
      shop_size: "tiny" | "small" | "medium" | "large" | "massive"
      shop_type:
        | "general"
        | "weapons"
        | "armor"
        | "magic"
        | "apothecary"
        | "black_market"
      town_size: "hamlet" | "village" | "town" | "city" | "metropolis"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      economic_tier: ["poor", "modest", "comfortable", "wealthy", "opulent"],
      geographic_location: [
        "desert",
        "forest",
        "wilderness",
        "necropolis",
        "arctic",
        "plains",
        "riverside",
        "coastal",
        "mountain",
        "swamp",
        "underground",
        "floating",
        "jungle",
      ],
      inventory_volatility: ["static", "slow", "moderate", "fast"],
      item_category: [
        "weapon",
        "armor",
        "potion",
        "scroll",
        "tool",
        "magic_item",
        "misc",
      ],
      item_rarity: ["common", "uncommon", "rare", "very_rare", "legendary"],
      item_source: [
        "purchased",
        "crafted",
        "looted",
        "generated",
        "quest_reward",
        "gift",
      ],
      political_system: [
        "monarchy",
        "democracy",
        "oligarchy",
        "theocracy",
        "anarchy",
        "military",
        "tribal",
        "merchant_guild",
        "magocracy",
      ],
      shop_reputation: ["unknown", "poor", "fair", "good", "excellent"],
      shop_security: ["none", "basic", "moderate", "high", "fortress"],
      shop_size: ["tiny", "small", "medium", "large", "massive"],
      shop_type: [
        "general",
        "weapons",
        "armor",
        "magic",
        "apothecary",
        "black_market",
      ],
      town_size: ["hamlet", "village", "town", "city", "metropolis"],
    },
  },
} as const

