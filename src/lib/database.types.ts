export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subscriptions: {
        Row: {
          id: string
          user_id: string
          service_name: string
          price: number
          billing_cycle: 'monthly' | 'yearly' | 'quarterly'
          category: 'streaming' | 'music' | 'productivity' | 'gaming' | 'cloud' | 'software' | 'other'
          next_billing_date: string
          status: 'active' | 'cancelled' | 'paused'
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_duration?: number | null
          is_trial: boolean
          url?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service_name: string
          price: number
          billing_cycle: 'monthly' | 'yearly' | 'quarterly'
          category: 'streaming' | 'music' | 'productivity' | 'gaming' | 'cloud' | 'software' | 'other'
          next_billing_date: string
          status?: 'active' | 'cancelled' | 'paused'
          trial_start_date?: string | null
          trial_end_date?: string | null
          trial_duration?: number | null
          is_trial?: boolean
          url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service_name?: string
          price?: number
          billing_cycle?: 'monthly' | 'yearly' | 'quarterly'
          category?: 'streaming' | 'music' | 'productivity' | 'gaming' | 'cloud' | 'software' | 'other'
          next_billing_date?: string
          status?: 'active' | 'cancelled' | 'paused'
          url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
  notifications: {
    Row: {
      id: string
      user_id: string
      type: 'renewal' | 'price_change'
      data: Json
      read: boolean
      created_at: string
    }
    Insert: {
      id?: string
      user_id: string
      type: 'renewal' | 'price_change'
      data: Json
      read?: boolean
      created_at?: string
    }
    Update: {
      id?: string
      user_id?: string
      type?: 'renewal' | 'price_change'
      data?: Json
      read?: boolean
      created_at?: string
    }
  }
}