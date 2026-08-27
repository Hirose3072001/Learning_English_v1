import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://izkaccukyxqxofnkqgia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6a2FjY3VreXhxeG9mbmtxZ2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDE1NzcsImV4cCI6MjA4NDYxNzU3N30.9aOJ1P_UILt15QqrjzD0u3wTXiYixWAS7ukTeiJ6uPI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
