/**
 * Tipe TypeScript skema database Supabase untuk AntriYuk (0001_init_antriyuk.sql).
 * Dapat diperbarui ulang kapan saja menggunakan perintah Supabase CLI:
 * npx supabase gen types typescript --linked > src/types/database.ts
 * [VERIFIKASI: format output generator tipe dapat diverifikasi di dokumentasi resmi Supabase CLI]
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = 'customer' | 'owner';

export type BusinessCategory =
  | 'klinik'
  | 'barbershop'
  | 'bengkel'
  | 'warung_makan'
  | 'lainnya';

export type QueueSessionStatus = 'open' | 'closed';

export type TicketStatus =
  | 'waiting'
  | 'called'
  | 'done'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          role: ProfileRole;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          role: ProfileRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          role?: ProfileRole;
          created_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: BusinessCategory;
          address: string | null;
          avg_service_minutes: number;
          grace_minutes: number;
          is_queue_open: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          category: BusinessCategory;
          address?: string | null;
          avg_service_minutes?: number;
          grace_minutes?: number;
          is_queue_open?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          category?: BusinessCategory;
          address?: string | null;
          avg_service_minutes?: number;
          grace_minutes?: number;
          is_queue_open?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'businesses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      queue_sessions: {
        Row: {
          id: string;
          business_id: string;
          queue_date: string;
          last_number: number;
          current_number: number;
          waiting_count: number;
          status: QueueSessionStatus;
          opened_at: string;
          closed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          queue_date: string;
          last_number?: number;
          current_number?: number;
          waiting_count?: number;
          status?: QueueSessionStatus;
          opened_at?: string;
          closed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          queue_date?: string;
          last_number?: number;
          current_number?: number;
          waiting_count?: number;
          status?: QueueSessionStatus;
          opened_at?: string;
          closed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_sessions_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
        ];
      };
      tickets: {
        Row: {
          id: string;
          session_id: string;
          business_id: string;
          customer_id: string;
          number: number;
          sort_key: number;
          defer_count: number;
          status: TicketStatus;
          created_at: string;
          called_at: string | null;
          done_at: string | null;
          cancelled_at: string | null;
          near_notified_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          business_id: string;
          customer_id: string;
          number: number;
          sort_key: number;
          defer_count?: number;
          status?: TicketStatus;
          created_at?: string;
          called_at?: string | null;
          done_at?: string | null;
          cancelled_at?: string | null;
          near_notified_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          business_id?: string;
          customer_id?: string;
          number?: number;
          sort_key?: number;
          defer_count?: number;
          status?: TicketStatus;
          created_at?: string;
          called_at?: string | null;
          done_at?: string | null;
          cancelled_at?: string | null;
          near_notified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_business_id_fkey';
            columns: ['business_id'];
            isOneToOne: false;
            referencedRelation: 'businesses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'queue_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      open_queue: {
        Args: {
          p_business_id: string;
        };
        Returns: Database['public']['Tables']['queue_sessions']['Row'];
      };
      close_queue: {
        Args: {
          p_business_id: string;
        };
        Returns: undefined;
      };
      take_ticket: {
        Args: {
          p_business_id: string;
        };
        Returns: Database['public']['Tables']['tickets']['Row'];
      };
      cancel_ticket: {
        Args: {
          p_ticket_id: string;
        };
        Returns: undefined;
      };
      defer_ticket: {
        Args: {
          p_ticket_id: string;
        };
        Returns: Database['public']['Tables']['tickets']['Row'];
      };
      call_next: {
        Args: {
          p_business_id: string;
          p_previous?: string;
        };
        Returns: Database['public']['Tables']['tickets']['Row'] | null;
      };
      mark_no_show: {
        Args: {
          p_ticket_id: string;
        };
        Returns: undefined;
      };
      finish_ticket: {
        Args: {
          p_ticket_id: string;
        };
        Returns: undefined;
      };
      my_position: {
        Args: {
          p_ticket_id: string;
        };
        Returns: {
          ticket_number: number;
          ticket_status: TicketStatus;
          current_number: number;
          ahead: number;
          est_minutes: number;
          queue_status: QueueSessionStatus;
          updated_at: string;
        }[];
      };
      owner_queue: {
        Args: {
          p_business_id: string;
        };
        Returns: {
          ticket_id: string;
          number: number;
          display_name: string;
          status: TicketStatus;
          created_at: string;
          called_at: string | null;
        }[];
      };
      owner_summary: {
        Args: {
          p_business_id: string;
          p_date?: string;
        };
        Returns: {
          total: number;
          done: number;
          cancelled: number;
          no_show: number;
          expired: number;
          avg_service_minutes: number | null;
        }[];
      };
      register_push_token: {
        Args: {
          p_token: string;
        };
        Returns: undefined;
      };
      unregister_push_token: {
        Args: {
          p_token: string;
        };
        Returns: undefined;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
