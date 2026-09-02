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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          config_hash: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          feature: string
          id: string
          latency_ms: number | null
          metadata: Json
          model: string | null
          provider: string
          status: string
        }
        Insert: {
          config_hash?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          feature: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          provider: string
          status: string
        }
        Update: {
          config_hash?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          feature?: string
          id?: string
          latency_ms?: number | null
          metadata?: Json
          model?: string | null
          provider?: string
          status?: string
        }
        Relationships: []
      }
      booking_add_ons: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          inclusion_ids: Json
          label: string
          pricing_unit: string
          unit_eur: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id: string
          inclusion_ids?: Json
          label: string
          pricing_unit: string
          unit_eur: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          inclusion_ids?: Json
          label?: string
          pricing_unit?: string
          unit_eur?: number
          updated_at?: string
        }
        Relationships: []
      }
      booking_quotes: {
        Row: {
          add_on_pricing: Json
          availability_id: string
          base_pricing: Json
          checkout_created_at: string | null
          commercial_mapping_id: string
          commercial_product_key: string
          confirm_attempts: number
          confirmed_at: string | null
          confirming_at: string | null
          consumed_at: string | null
          created_at: string
          currency: string
          database_addon_subtotal_eur: number | null
          date: string
          expired_at: string | null
          expires_at: string
          final_total_eur: number
          flow: string
          itinerary_revision: string | null
          itinerary_snapshot: Json | null
          last_error: string | null
          paid_at: string | null
          pricing_revision: string
          quote_id: string
          quote_token: string
          reserved_at: string | null
          resolved_guest_mix: Json
          start_time: string | null
          state: string
          stripe_session_id: string | null
          traveller_composition: Json
        }
        Insert: {
          add_on_pricing: Json
          availability_id: string
          base_pricing: Json
          checkout_created_at?: string | null
          commercial_mapping_id: string
          commercial_product_key: string
          confirm_attempts?: number
          confirmed_at?: string | null
          confirming_at?: string | null
          consumed_at?: string | null
          created_at?: string
          currency?: string
          database_addon_subtotal_eur?: number | null
          date: string
          expired_at?: string | null
          expires_at: string
          final_total_eur: number
          flow: string
          itinerary_revision?: string | null
          itinerary_snapshot?: Json | null
          last_error?: string | null
          paid_at?: string | null
          pricing_revision: string
          quote_id?: string
          quote_token: string
          reserved_at?: string | null
          resolved_guest_mix: Json
          start_time?: string | null
          state?: string
          stripe_session_id?: string | null
          traveller_composition: Json
        }
        Update: {
          add_on_pricing?: Json
          availability_id?: string
          base_pricing?: Json
          checkout_created_at?: string | null
          commercial_mapping_id?: string
          commercial_product_key?: string
          confirm_attempts?: number
          confirmed_at?: string | null
          confirming_at?: string | null
          consumed_at?: string | null
          created_at?: string
          currency?: string
          database_addon_subtotal_eur?: number | null
          date?: string
          expired_at?: string | null
          expires_at?: string
          final_total_eur?: number
          flow?: string
          itinerary_revision?: string | null
          itinerary_snapshot?: Json | null
          last_error?: string | null
          paid_at?: string | null
          pricing_revision?: string
          quote_id?: string
          quote_token?: string
          reserved_at?: string | null
          resolved_guest_mix?: Json
          start_time?: string | null
          state?: string
          stripe_session_id?: string | null
          traveller_composition?: Json
        }
        Relationships: []
      }
      booking_snapshots: {
        Row: {
          created_at: string
          frozen_at: string | null
          payload: Json
          stripe_session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          frozen_at?: string | null
          payload?: Json
          stripe_session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          frozen_at?: string | null
          payload?: Json
          stripe_session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount_total: number
          booking_details: Json | null
          booking_details_completed_at: string | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at: string
          currency: string
          customer_email: string
          customer_name: string | null
          customer_phone: string | null
          database_addon_subtotal_eur: number | null
          final_total_eur: number | null
          guests: number
          id: string
          metadata: Json
          notes: string | null
          preferred_date: string | null
          quote_id: string | null
          source_journey_id: string | null
          source_tour_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_total: number
          booking_details?: Json | null
          booking_details_completed_at?: string | null
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          currency?: string
          customer_email: string
          customer_name?: string | null
          customer_phone?: string | null
          database_addon_subtotal_eur?: number | null
          final_total_eur?: number | null
          guests?: number
          id?: string
          metadata?: Json
          notes?: string | null
          preferred_date?: string | null
          quote_id?: string | null
          source_journey_id?: string | null
          source_tour_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_total?: number
          booking_details?: Json | null
          booking_details_completed_at?: string | null
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string | null
          customer_phone?: string | null
          database_addon_subtotal_eur?: number | null
          final_total_eur?: number | null
          guests?: number
          id?: string
          metadata?: Json
          notes?: string | null
          preferred_date?: string | null
          quote_id?: string | null
          source_journey_id?: string | null
          source_tour_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      builder_compatibility_rules: {
        Row: {
          cooccurrence_count: number
          created_at: string
          id: string
          stop_a: string
          stop_b: string
        }
        Insert: {
          cooccurrence_count?: number
          created_at?: string
          id?: string
          stop_a: string
          stop_b: string
        }
        Update: {
          cooccurrence_count?: number
          created_at?: string
          id?: string
          stop_a?: string
          stop_b?: string
        }
        Relationships: []
      }
      builder_events: {
        Row: {
          anonymous_id: string
          event: string
          id: string
          meta: Json | null
          occurred_at: string
          route: string | null
        }
        Insert: {
          anonymous_id: string
          event: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          route?: string | null
        }
        Update: {
          anonymous_id?: string
          event?: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          route?: string | null
        }
        Relationships: []
      }
      builder_experience_types: {
        Row: {
          blurb: string | null
          created_at: string
          default_mood: string
          default_pace: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          default_mood?: string
          default_pace?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          created_at?: string
          default_mood?: string
          default_pace?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      builder_journeys: {
        Row: {
          created_at: string
          id: string
          intent: string | null
          owner_token_hash: string
          revoked_at: string | null
          share_token: string
          state: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent?: string | null
          owner_token_hash: string
          revoked_at?: string | null
          share_token: string
          state?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string | null
          owner_token_hash?: string
          revoked_at?: string | null
          share_token?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      builder_rate_limits: {
        Row: {
          bucket: string
          call_count: number
          created_at: string
          id: string
          last_call_at: string
          session_id: string
        }
        Insert: {
          bucket: string
          call_count?: number
          created_at?: string
          id?: string
          last_call_at?: string
          session_id: string
        }
        Update: {
          bucket?: string
          call_count?: number
          created_at?: string
          id?: string
          last_call_at?: string
          session_id?: string
        }
        Relationships: []
      }
      builder_reference_uploads: {
        Row: {
          analyzed_at: string | null
          created_at: string
          expires_at: string
          file_name: string
          file_path: string
          file_size_bytes: number
          file_url: string
          id: string
          mime_type: string
          session_id: string
          tone_keywords: string[]
          tone_summary: string | null
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string
          expires_at?: string
          file_name: string
          file_path: string
          file_size_bytes: number
          file_url: string
          id?: string
          mime_type: string
          session_id: string
          tone_keywords?: string[]
          tone_summary?: string | null
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string
          expires_at?: string
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          file_url?: string
          id?: string
          mime_type?: string
          session_id?: string
          tone_keywords?: string[]
          tone_summary?: string | null
        }
        Relationships: []
      }
      builder_regions: {
        Row: {
          blurb: string | null
          created_at: string
          hero_image_url: string | null
          id: string
          key: string
          label: string
          lat: number
          lng: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          key: string
          label: string
          lat: number
          lng: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          created_at?: string
          hero_image_url?: string | null
          id?: string
          key?: string
          label?: string
          lat?: number
          lng?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      builder_route_cache: {
        Row: {
          created_at: string
          distance_km: number
          drive_minutes: number
          from_key: string
          id: string
          polyline: string
          provider: string
          refreshed_at: string
          to_key: string
        }
        Insert: {
          created_at?: string
          distance_km: number
          drive_minutes: number
          from_key: string
          id?: string
          polyline: string
          provider?: string
          refreshed_at?: string
          to_key: string
        }
        Update: {
          created_at?: string
          distance_km?: number
          drive_minutes?: number
          from_key?: string
          id?: string
          polyline?: string
          provider?: string
          refreshed_at?: string
          to_key?: string
        }
        Relationships: []
      }
      builder_routing_rules: {
        Row: {
          base_price_per_person_eur: number
          created_at: string
          default_pace: string
          id: string
          is_active: boolean
          max_driving_hours: number
          max_experience_hours: number
          max_km_between_stops: number
          max_stops: number
          max_total_km_per_day: number
          min_stops: number
          pace_multiplier_balanced: number
          pace_multiplier_full: number
          pace_multiplier_relaxed: number
          updated_at: string
        }
        Insert: {
          base_price_per_person_eur?: number
          created_at?: string
          default_pace?: string
          id?: string
          is_active?: boolean
          max_driving_hours?: number
          max_experience_hours?: number
          max_km_between_stops?: number
          max_stops?: number
          max_total_km_per_day?: number
          min_stops?: number
          pace_multiplier_balanced?: number
          pace_multiplier_full?: number
          pace_multiplier_relaxed?: number
          updated_at?: string
        }
        Update: {
          base_price_per_person_eur?: number
          created_at?: string
          default_pace?: string
          id?: string
          is_active?: boolean
          max_driving_hours?: number
          max_experience_hours?: number
          max_km_between_stops?: number
          max_stops?: number
          max_total_km_per_day?: number
          min_stops?: number
          pace_multiplier_balanced?: number
          pace_multiplier_full?: number
          pace_multiplier_relaxed?: number
          updated_at?: string
        }
        Relationships: []
      }
      builder_stops: {
        Row: {
          blurb: string | null
          canonical_key: string | null
          compatible_with: string[]
          created_at: string
          duration_minutes: number
          id: string
          image_url: string | null
          intention_tags: string[]
          is_active: boolean
          key: string
          label: string
          lat: number
          lng: number
          mood_tags: string[]
          open_from: string | null
          open_to: string | null
          pace_tags: string[]
          region_key: string
          source_tour_keys: string[]
          tag: string | null
          updated_at: string
          variant_bucket: string | null
          variant_label: string | null
          weight: number
          who_tags: string[]
        }
        Insert: {
          blurb?: string | null
          canonical_key?: string | null
          compatible_with?: string[]
          created_at?: string
          duration_minutes?: number
          id?: string
          image_url?: string | null
          intention_tags?: string[]
          is_active?: boolean
          key: string
          label: string
          lat: number
          lng: number
          mood_tags?: string[]
          open_from?: string | null
          open_to?: string | null
          pace_tags?: string[]
          region_key: string
          source_tour_keys?: string[]
          tag?: string | null
          updated_at?: string
          variant_bucket?: string | null
          variant_label?: string | null
          weight?: number
          who_tags?: string[]
        }
        Update: {
          blurb?: string | null
          canonical_key?: string | null
          compatible_with?: string[]
          created_at?: string
          duration_minutes?: number
          id?: string
          image_url?: string | null
          intention_tags?: string[]
          is_active?: boolean
          key?: string
          label?: string
          lat?: number
          lng?: number
          mood_tags?: string[]
          open_from?: string | null
          open_to?: string | null
          pace_tags?: string[]
          region_key?: string
          source_tour_keys?: string[]
          tag?: string | null
          updated_at?: string
          variant_bucket?: string | null
          variant_label?: string | null
          weight?: number
          who_tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "builder_stops_region_key_fkey"
            columns: ["region_key"]
            isOneToOne: false
            referencedRelation: "builder_regions"
            referencedColumns: ["key"]
          },
        ]
      }
      builder_tour_sources: {
        Row: {
          blurb: string | null
          created_at: string
          duration_text: string | null
          exclusions: string[]
          id: string
          inclusions: string[]
          pickup_zone: string | null
          source_url: string
          title: string
          tour_key: string
          updated_at: string
          varies_by_option: string[]
        }
        Insert: {
          blurb?: string | null
          created_at?: string
          duration_text?: string | null
          exclusions?: string[]
          id?: string
          inclusions?: string[]
          pickup_zone?: string | null
          source_url: string
          title: string
          tour_key: string
          updated_at?: string
          varies_by_option?: string[]
        }
        Update: {
          blurb?: string | null
          created_at?: string
          duration_text?: string | null
          exclusions?: string[]
          id?: string
          inclusions?: string[]
          pickup_zone?: string | null
          source_url?: string
          title?: string
          tour_key?: string
          updated_at?: string
          varies_by_option?: string[]
        }
        Relationships: []
      }
      builder_tour_stops: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          optional: boolean
          position: number
          stop_canonical: string
          tour_key: string
          variant_bucket: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          optional?: boolean
          position: number
          stop_canonical: string
          tour_key: string
          variant_bucket: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          optional?: boolean
          position?: number
          stop_canonical?: string
          tour_key?: string
          variant_bucket?: string
        }
        Relationships: []
      }
      client_error_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          route: string | null
          session_id: string | null
          severity: string
          source: string | null
          stack: string | null
          url: string | null
          user_agent: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          route?: string | null
          session_id?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          route?: string | null
          session_id?: string | null
          severity?: string
          source?: string | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          locale: string | null
          message: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          locale?: string | null
          message: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          locale?: string | null
          message?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      dns_watch_log: {
        Row: {
          a_records: string[]
          checked_at: string
          host: string
          http_ok: boolean
          http_status: number | null
          id: string
          notes: string | null
          points_to_lovable: boolean
          raw: Json | null
          ready: boolean
        }
        Insert: {
          a_records?: string[]
          checked_at?: string
          host: string
          http_ok?: boolean
          http_status?: number | null
          id?: string
          notes?: string | null
          points_to_lovable?: boolean
          raw?: Json | null
          ready?: boolean
        }
        Update: {
          a_records?: string[]
          checked_at?: string
          host?: string
          http_ok?: boolean
          http_status?: number | null
          id?: string
          notes?: string | null
          points_to_lovable?: boolean
          raw?: Json | null
          ready?: boolean
        }
        Relationships: []
      }
      dns_watch_state: {
        Row: {
          all_ready: boolean
          key: string
          last_notified_at: string | null
          last_summary: Json | null
          ready_since: string | null
          updated_at: string
        }
        Insert: {
          all_ready?: boolean
          key: string
          last_notified_at?: string | null
          last_summary?: Json | null
          ready_since?: string | null
          updated_at?: string
        }
        Update: {
          all_ready?: boolean
          key?: string
          last_notified_at?: string | null
          last_summary?: Json | null
          ready_since?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      drift_behavior_events: {
        Row: {
          attraction_target: string | null
          chapter_id: string | null
          decision_latency_ms: number | null
          id: string
          linger_ms: number | null
          meta: Json
          occurred_at: string
          predicted_archetype: string | null
          predicted_intensity: string | null
          predicted_tonal_register: string | null
          reveal_confidence: number | null
          session_id: string
          signal_type: string
        }
        Insert: {
          attraction_target?: string | null
          chapter_id?: string | null
          decision_latency_ms?: number | null
          id?: string
          linger_ms?: number | null
          meta?: Json
          occurred_at?: string
          predicted_archetype?: string | null
          predicted_intensity?: string | null
          predicted_tonal_register?: string | null
          reveal_confidence?: number | null
          session_id: string
          signal_type: string
        }
        Update: {
          attraction_target?: string | null
          chapter_id?: string | null
          decision_latency_ms?: number | null
          id?: string
          linger_ms?: number | null
          meta?: Json
          occurred_at?: string
          predicted_archetype?: string | null
          predicted_intensity?: string | null
          predicted_tonal_register?: string | null
          reveal_confidence?: number | null
          session_id?: string
          signal_type?: string
        }
        Relationships: []
      }
      drift_dna_tokens: {
        Row: {
          created_at: string
          dimension: string
          id: string
          is_active: boolean
          key: string
          label: string
          priority: number
          threshold: number
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          dimension: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          priority?: number
          threshold?: number
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          dimension?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          priority?: number
          threshold?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      drift_session_events: {
        Row: {
          chapter_id: string | null
          event: string
          id: string
          meta: Json | null
          occurred_at: string
          session_id: string
          signal_key: string | null
          signal_value: string | null
        }
        Insert: {
          chapter_id?: string | null
          event: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          session_id: string
          signal_key?: string | null
          signal_value?: string | null
        }
        Update: {
          chapter_id?: string | null
          event?: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          session_id?: string
          signal_key?: string | null
          signal_value?: string | null
        }
        Relationships: []
      }
      drift_voice: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          locale: string
          notes: string | null
          slot: string
          slots: string[]
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          notes?: string | null
          slot: string
          slots?: string[]
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          locale?: string
          notes?: string | null
          slot?: string
          slots?: string[]
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      editorial_image_overrides: {
        Row: {
          alt: string
          caption: string | null
          created_at: string
          id: string
          module_key: string
          photo_src: string
          slot_index: number
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alt: string
          caption?: string | null
          created_at?: string
          id?: string
          module_key: string
          photo_src: string
          slot_index: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alt?: string
          caption?: string | null
          created_at?: string
          id?: string
          module_key?: string
          photo_src?: string
          slot_index?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_deferred_sends: {
        Row: {
          attempts: number
          body_text: string
          created_at: string
          delivered_at: string | null
          failure_kind: string
          html: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          last_error: string | null
          message_id: string
          next_attempt_at: string
          recipient_email: string
          state: string
          subject: string
          template_name: string
        }
        Insert: {
          attempts?: number
          body_text: string
          created_at?: string
          delivered_at?: string | null
          failure_kind?: string
          html: string
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          last_error?: string | null
          message_id: string
          next_attempt_at?: string
          recipient_email: string
          state?: string
          subject: string
          template_name: string
        }
        Update: {
          attempts?: number
          body_text?: string
          created_at?: string
          delivered_at?: string | null
          failure_kind?: string
          html?: string
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          last_error?: string | null
          message_id?: string
          next_attempt_at?: string
          recipient_email?: string
          state?: string
          subject?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      experience_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          image_type: string
          image_url: string
          is_active: boolean
          mood_tags: string[]
          occasion_tags: string[]
          priority_score: number
          region_key: string | null
          related_stop_key: string | null
          related_tour_id: string | null
          source_url: string | null
          title: string | null
          updated_at: string
          usage_role: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          id?: string
          image_type?: string
          image_url: string
          is_active?: boolean
          mood_tags?: string[]
          occasion_tags?: string[]
          priority_score?: number
          region_key?: string | null
          related_stop_key?: string | null
          related_tour_id?: string | null
          source_url?: string | null
          title?: string | null
          updated_at?: string
          usage_role?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          image_type?: string
          image_url?: string
          is_active?: boolean
          mood_tags?: string[]
          occasion_tags?: string[]
          priority_score?: number
          region_key?: string | null
          related_stop_key?: string | null
          related_tour_id?: string | null
          source_url?: string | null
          title?: string | null
          updated_at?: string
          usage_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_images_region_key_fkey"
            columns: ["region_key"]
            isOneToOne: false
            referencedRelation: "builder_regions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "experience_images_related_stop_key_fkey"
            columns: ["related_stop_key"]
            isOneToOne: false
            referencedRelation: "builder_stops"
            referencedColumns: ["key"]
          },
        ]
      }
      gbp_removal_evidence: {
        Row: {
          caption: string
          created_at: string
          created_by: string | null
          file_path: string
          id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          created_by?: string | null
          file_path: string
          id?: string
        }
        Update: {
          caption?: string
          created_at?: string
          created_by?: string | null
          file_path?: string
          id?: string
        }
        Relationships: []
      }
      gbp_removal_state: {
        Row: {
          checklist: Json
          id: number
          notes: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          checklist?: Json
          id?: number
          notes?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          checklist?: Json
          id?: number
          notes?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      hero_ab_assignments: {
        Row: {
          anonymous_id: string
          assigned_at: string
          experiment_key: string
          id: string
          user_agent: string | null
          variant: string
        }
        Insert: {
          anonymous_id: string
          assigned_at?: string
          experiment_key: string
          id?: string
          user_agent?: string | null
          variant: string
        }
        Update: {
          anonymous_id?: string
          assigned_at?: string
          experiment_key?: string
          id?: string
          user_agent?: string | null
          variant?: string
        }
        Relationships: []
      }
      hero_ab_events: {
        Row: {
          anonymous_id: string
          event: string
          experiment_key: string
          id: string
          meta: Json | null
          occurred_at: string
          route: string | null
          scene_id: string | null
          variant: string
        }
        Insert: {
          anonymous_id: string
          event: string
          experiment_key: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          route?: string | null
          scene_id?: string | null
          variant: string
        }
        Update: {
          anonymous_id?: string
          event?: string
          experiment_key?: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          route?: string | null
          scene_id?: string | null
          variant?: string
        }
        Relationships: []
      }
      import_mapping_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          rules: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          rules?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      import_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          ran_by: string | null
          status: string
          tours_failed: number
          tours_imported: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          ran_by?: string | null
          status: string
          tours_failed?: number
          tours_imported?: number
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          ran_by?: string | null
          status?: string
          tours_failed?: number
          tours_imported?: number
        }
        Relationships: []
      }
      imported_tours: {
        Row: {
          ai_model: string | null
          blurb: string
          duration: string
          duration_hours: string
          duration_label: string
          fits_best: string
          highlights: string[]
          id: string
          image_url: string | null
          imported_at: string
          pace: string
          pace_cues: string[]
          price_from: number
          region: string
          region_label: string
          source_url: string
          stops: Json
          styles: string[]
          theme: string
          tier: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          blurb: string
          duration: string
          duration_hours: string
          duration_label: string
          fits_best: string
          highlights?: string[]
          id: string
          image_url?: string | null
          imported_at?: string
          pace: string
          pace_cues?: string[]
          price_from: number
          region: string
          region_label: string
          source_url: string
          stops?: Json
          styles?: string[]
          theme: string
          tier: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          blurb?: string
          duration?: string
          duration_hours?: string
          duration_label?: string
          fits_best?: string
          highlights?: string[]
          id?: string
          image_url?: string | null
          imported_at?: string
          pace?: string
          pace_cues?: string[]
          price_from?: number
          region?: string
          region_label?: string
          source_url?: string
          stops?: Json
          styles?: string[]
          theme?: string
          tier?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_posts: {
        Row: {
          author_name: string | null
          body: string
          created_at: string
          excerpt: string | null
          hero_image_alt: string | null
          hero_image_url: string | null
          id: string
          published_at: string | null
          region: string | null
          signature_slug: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string
          created_at?: string
          excerpt?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          region?: string | null
          signature_slug?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string
          created_at?: string
          excerpt?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          published_at?: string | null
          region?: string | null
          signature_slug?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_captures: {
        Row: {
          consent: boolean
          created_at: string
          email: string
          first_name: string
          id: string
          lead_magnet: string
          locale: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          consent?: boolean
          created_at?: string
          email: string
          first_name: string
          id?: string
          lead_magnet?: string
          locale?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          consent?: boolean
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          lead_magnet?: string
          locale?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      legacy_domain_unlink_checklist: {
        Row: {
          created_at: string
          item_id: string
          note: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          item_id: string
          note?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          item_id?: string
          note?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      mcp_owner_allowlist: {
        Row: {
          created_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mcp_owner_audit_log: {
        Row: {
          created_at: string
          id: number
          outcome: string
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          outcome: string
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          outcome?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      review_submission_tokens: {
        Row: {
          booking_id: string | null
          created_at: string
          expires_at: string
          guest_email: string
          guest_name: string | null
          id: string
          token: string
          tour_id: string
          used_at: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          expires_at?: string
          guest_email: string
          guest_name?: string | null
          id?: string
          token: string
          tour_id: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          expires_at?: string
          guest_email?: string
          guest_name?: string | null
          id?: string
          token?: string
          tour_id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          amount_total: number | null
          booking_type: string | null
          currency: string | null
          customer_email: string | null
          error_message: string | null
          event_id: string | null
          event_type: string | null
          id: string
          metadata: Json | null
          payment_status: string | null
          received_at: string
          session_id: string | null
          status_code: number | null
          stripe_env: string | null
          verified: boolean
        }
        Insert: {
          amount_total?: number | null
          booking_type?: string | null
          currency?: string | null
          customer_email?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          payment_status?: string | null
          received_at?: string
          session_id?: string | null
          status_code?: number | null
          stripe_env?: string | null
          verified?: boolean
        }
        Update: {
          amount_total?: number | null
          booking_type?: string | null
          currency?: string | null
          customer_email?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          payment_status?: string | null
          received_at?: string
          session_id?: string | null
          status_code?: number | null
          stripe_env?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      stripe_webhook_health_checks: {
        Row: {
          alerted: boolean
          checked_at: string
          endpoint: string | null
          id: string
          invalid_status: number | null
          reason: string | null
          secret_prefix_ok: boolean
          secret_present: boolean
          status: string
          valid_status: number | null
        }
        Insert: {
          alerted?: boolean
          checked_at?: string
          endpoint?: string | null
          id?: string
          invalid_status?: number | null
          reason?: string | null
          secret_prefix_ok?: boolean
          secret_present?: boolean
          status: string
          valid_status?: number | null
        }
        Update: {
          alerted?: boolean
          checked_at?: string
          endpoint?: string | null
          id?: string
          invalid_status?: number | null
          reason?: string | null
          secret_prefix_ok?: boolean
          secret_present?: boolean
          status?: string
          valid_status?: number | null
        }
        Relationships: []
      }
      studio_ab_assignments: {
        Row: {
          anonymous_id: string
          assigned_at: string
          experiment_key: string
          id: string
          user_agent: string | null
          variant: string
        }
        Insert: {
          anonymous_id: string
          assigned_at?: string
          experiment_key: string
          id?: string
          user_agent?: string | null
          variant: string
        }
        Update: {
          anonymous_id?: string
          assigned_at?: string
          experiment_key?: string
          id?: string
          user_agent?: string | null
          variant?: string
        }
        Relationships: []
      }
      studio_ab_events: {
        Row: {
          anonymous_id: string
          event: string
          experiment_key: string
          id: string
          meta: Json | null
          occurred_at: string
          route: string | null
          scene_id: string | null
          variant: string
        }
        Insert: {
          anonymous_id: string
          event: string
          experiment_key: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          route?: string | null
          scene_id?: string | null
          variant: string
        }
        Update: {
          anonymous_id?: string
          event?: string
          experiment_key?: string
          id?: string
          meta?: Json | null
          occurred_at?: string
          route?: string | null
          scene_id?: string | null
          variant?: string
        }
        Relationships: []
      }
      studio_drafts: {
        Row: {
          created_at: string
          draft: Json
          email: string | null
          expires_at: string
          id: string
          resume_token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft: Json
          email?: string | null
          expires_at?: string
          id?: string
          resume_token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft?: Json
          email?: string | null
          expires_at?: string
          id?: string
          resume_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      studio_v2_bookings: {
        Row: {
          adults: number | null
          archetype: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          draft_token: string
          guests: number | null
          id: string
          minor_ages: number[]
          notes: string | null
          preferred_date: string | null
          profile: Json
          region: string | null
          status: string
          stops: Json
          total_drive_minutes: number
          total_km: number
          total_minutes: number
          updated_at: string
        }
        Insert: {
          adults?: number | null
          archetype?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          draft_token: string
          guests?: number | null
          id?: string
          minor_ages?: number[]
          notes?: string | null
          preferred_date?: string | null
          profile: Json
          region?: string | null
          status?: string
          stops?: Json
          total_drive_minutes?: number
          total_km?: number
          total_minutes?: number
          updated_at?: string
        }
        Update: {
          adults?: number | null
          archetype?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          draft_token?: string
          guests?: number | null
          id?: string
          minor_ages?: number[]
          notes?: string | null
          preferred_date?: string | null
          profile?: Json
          region?: string | null
          status?: string
          stops?: Json
          total_drive_minutes?: number
          total_km?: number
          total_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      studio_v2_predictions: {
        Row: {
          created_at: string
          mood_vector: Json
          pace_confidence: number
          session_id: string
          signal_count: number
          updated_at: string
          weights: Json
        }
        Insert: {
          created_at?: string
          mood_vector?: Json
          pace_confidence?: number
          session_id: string
          signal_count?: number
          updated_at?: string
          weights?: Json
        }
        Update: {
          created_at?: string
          mood_vector?: Json
          pace_confidence?: number
          session_id?: string
          signal_count?: number
          updated_at?: string
          weights?: Json
        }
        Relationships: []
      }
      studio_v2_sessions: {
        Row: {
          archetype: string | null
          created_at: string
          id: string
          profile: Json
          region: string | null
          revoked_at: string | null
          share_token: string
          updated_at: string
        }
        Insert: {
          archetype?: string | null
          created_at?: string
          id?: string
          profile: Json
          region?: string | null
          revoked_at?: string | null
          share_token: string
          updated_at?: string
        }
        Update: {
          archetype?: string | null
          created_at?: string
          id?: string
          profile?: Json
          region?: string | null
          revoked_at?: string | null
          share_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      studio_v3_funnel_events: {
        Row: {
          created_at: string
          event: string
          id: string
          session_id: string
          step_key: string
          step_number: number
          user_agent: string | null
          value: Json | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          session_id: string
          step_key: string
          step_number: number
          user_agent?: string | null
          value?: Json | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          session_id?: string
          step_key?: string
          step_number?: number
          user_agent?: string | null
          value?: Json | null
          variant?: string | null
        }
        Relationships: []
      }
      studio_v3_leads: {
        Row: {
          contact_email: string
          contact_name: string
          contact_note: string | null
          contact_phone: string | null
          created_at: string
          id: string
          intent: string
          journey_title: string | null
          saved_at: string | null
          share_token: string | null
          skeleton_tour_key: string | null
          state: Json
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_note?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intent?: string
          journey_title?: string | null
          saved_at?: string | null
          share_token?: string | null
          skeleton_tour_key?: string | null
          state?: Json
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_note?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          intent?: string
          journey_title?: string | null
          saved_at?: string | null
          share_token?: string | null
          skeleton_tour_key?: string | null
          state?: Json
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tour_available_add_ons: {
        Row: {
          active: boolean
          add_on_id: string
          created_at: string
          scope: string
          sort_order: number
          tour_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          add_on_id: string
          created_at?: string
          scope: string
          sort_order?: number
          tour_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          add_on_id?: string
          created_at?: string
          scope?: string
          sort_order?: number
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_available_add_ons_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "booking_add_ons"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_external_ratings: {
        Row: {
          created_at: string
          id: string
          last_verified_at: string
          rating: number
          review_count: number
          source: string
          source_url: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_verified_at?: string
          rating: number
          review_count: number
          source: string
          source_url?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_verified_at?: string
          rating?: number
          review_count?: number
          source?: string
          source_url?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tour_gallery_photos: {
        Row: {
          alt: string
          content_hash: string | null
          created_at: string
          height: number | null
          id: string
          is_cover: boolean
          sort_order: number
          storage_path: string
          tour_id: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt?: string
          content_hash?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path: string
          tour_id: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt?: string
          content_hash?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path?: string
          tour_id?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      tour_operating_rules: {
        Row: {
          blackout_dates: string[]
          cutoff_local_time: string | null
          min_lead_hours: number
          tour_id: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          blackout_dates?: string[]
          cutoff_local_time?: string | null
          min_lead_hours?: number
          tour_id: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          blackout_dates?: string[]
          cutoff_local_time?: string | null
          min_lead_hours?: number
          tour_id?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      tour_price_tiers: {
        Row: {
          platform_tiers: Json | null
          tiers: Json
          tour_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          platform_tiers?: Json | null
          tiers?: Json
          tour_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          platform_tiers?: Json | null
          tiers?: Json
          tour_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tour_review_scrapes: {
        Row: {
          created_at: string
          error: string | null
          fetched_count: number
          id: string
          inserted_count: number
          source: string
          source_url: string | null
          status: string
          tour_id: string
          updated_count: number
        }
        Insert: {
          created_at?: string
          error?: string | null
          fetched_count?: number
          id?: string
          inserted_count?: number
          source: string
          source_url?: string | null
          status: string
          tour_id: string
          updated_count?: number
        }
        Update: {
          created_at?: string
          error?: string | null
          fetched_count?: number
          id?: string
          inserted_count?: number
          source?: string
          source_url?: string | null
          status?: string
          tour_id?: string
          updated_count?: number
        }
        Relationships: []
      }
      tour_reviews: {
        Row: {
          body: string
          created_at: string
          external_id: string | null
          id: string
          is_featured: boolean
          is_first_party: boolean
          is_published: boolean
          language: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          moderation_status: string
          published_at: string
          rating: number
          reviewer_country: string | null
          reviewer_name: string | null
          scraped_at: string | null
          source: string
          source_url: string | null
          title: string | null
          tour_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          body: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_featured?: boolean
          is_first_party?: boolean
          is_published?: boolean
          language?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          published_at?: string
          rating: number
          reviewer_country?: string | null
          reviewer_name?: string | null
          scraped_at?: string | null
          source: string
          source_url?: string | null
          title?: string | null
          tour_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          body?: string
          created_at?: string
          external_id?: string | null
          id?: string
          is_featured?: boolean
          is_first_party?: boolean
          is_published?: boolean
          language?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string
          published_at?: string
          rating?: number
          reviewer_country?: string | null
          reviewer_name?: string | null
          scraped_at?: string | null
          source?: string
          source_url?: string | null
          title?: string | null
          tour_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viator_drift_reports: {
        Row: {
          created_at: string
          id: string
          report: Json
          run_at: string
          scrape_errors: number
          tours_checked: number
          tours_with_drift: number
        }
        Insert: {
          created_at?: string
          id?: string
          report: Json
          run_at?: string
          scrape_errors?: number
          tours_checked?: number
          tours_with_drift?: number
        }
        Update: {
          created_at?: string
          id?: string
          report?: Json
          run_at?: string
          scrape_errors?: number
          tours_checked?: number
          tours_with_drift?: number
        }
        Relationships: []
      }
    }
    Views: {
      global_review_aggregate: {
        Row: {
          average_rating: number | null
          external_count: number | null
          external_weighted_avg: number | null
          first_party_avg: number | null
          first_party_count: number | null
          total_reviews: number | null
        }
        Relationships: []
      }
      global_review_stats: {
        Row: {
          average_rating: number | null
          first_party_avg: number | null
          first_party_count: number | null
          total_reviews: number | null
          tours_with_reviews: number | null
        }
        Relationships: []
      }
      tour_review_stats: {
        Row: {
          average_rating: number | null
          first_party_avg: number | null
          first_party_count: number | null
          getyourguide_count: number | null
          google_count: number | null
          last_review_at: string | null
          total_reviews: number | null
          tour_id: string | null
          tripadvisor_count: number | null
          viator_count: number | null
        }
        Relationships: []
      }
      tour_reviews_public: {
        Row: {
          body: string | null
          id: string | null
          is_featured: boolean | null
          is_first_party: boolean | null
          language: string | null
          published_at: string | null
          rating: number | null
          reviewer_country: string | null
          reviewer_name: string | null
          source: string | null
          source_url: string | null
          title: string | null
          tour_id: string | null
          verified: boolean | null
        }
        Insert: {
          body?: string | null
          id?: string | null
          is_featured?: boolean | null
          is_first_party?: boolean | null
          language?: string | null
          published_at?: string | null
          rating?: number | null
          reviewer_country?: string | null
          reviewer_name?: string | null
          source?: string | null
          source_url?: string | null
          title?: string | null
          tour_id?: string | null
          verified?: boolean | null
        }
        Update: {
          body?: string | null
          id?: string | null
          is_featured?: boolean | null
          is_first_party?: boolean | null
          language?: string | null
          published_at?: string | null
          rating?: number | null
          reviewer_country?: string | null
          reviewer_name?: string | null
          source?: string | null
          source_url?: string | null
          title?: string | null
          tour_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_builder_references: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      submit_first_party_review: {
        Args: {
          _body: string
          _rating: number
          _reviewer_country: string
          _reviewer_name: string
          _title: string
          _token: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "email_operator"
        | "email_viewer"
      booking_status: "pending" | "paid" | "cancelled" | "refunded" | "failed"
      booking_type: "tailored" | "builder" | "multi-day" | "signature"
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
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "email_operator",
        "email_viewer",
      ],
      booking_status: ["pending", "paid", "cancelled", "refunded", "failed"],
      booking_type: ["tailored", "builder", "multi-day", "signature"],
    },
  },
} as const
