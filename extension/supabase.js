// Initialize Supabase client
const SUPABASE_URL = 'https://psssrpuoifnppswzcdoi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3NycHVvaWZucHBzd3pjZG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NjkyNDYsImV4cCI6MjA1MjE0NTI0Nn0.uzTHNU6gPYXJERRzLQf64cN4LiohG6GIKzT1TYChfOU';

const supabase = {
  auth: {
    async getSession() {
      try {
        const tokens = await chrome.storage.local.get(['sb-access-token', 'sb-refresh-token', 'userId']);
        if (tokens['sb-access-token']) {
          return {
            data: {
              session: {
                access_token: tokens['sb-access-token'],
                refresh_token: tokens['sb-refresh-token'],
                user: { id: tokens.userId }
              }
            }
          };
        }
        return { data: { session: null } };
      } catch (error) {
        console.error('Error getting session:', error);
        return { data: { session: null } };
      }
    },

    async signInWithPassword({ email, password }) {
      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error_description || error.msg);
        }

        const data = await response.json();
        return {
          data: {
            session: {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              user: data.user
            }
          },
          error: null
        };
      } catch (error) {
        return {
          data: null,
          error: error.message
        };
      }
    }
  },

  from(table) {
    return {
      async insert(data) {
        try {
          const tokens = await chrome.storage.local.get(['sb-access-token']);
          const accessToken = tokens['sb-access-token'];

          if (!accessToken) {
            throw new Error('No access token found');
          }

          const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to insert data');
          }

          return { error: null };
        } catch (error) {
          return { error: error.message };
        }
      }
    };
  }
};