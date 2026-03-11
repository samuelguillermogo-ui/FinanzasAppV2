/* =============================================
   SUPABASE CLIENT CONFIGURATION
   ============================================= */

// ⚠️ IMPORTANT: Replace these with your actual Supabase project values
// You can find them in: Supabase Dashboard > Project Settings > API
const SUPABASE_URL = 'https://gzstnltsajyvgkqhkgjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6c3RubHRzYWp5dmdrcWhrZ2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTg0NDcsImV4cCI6MjA4ODgzNDQ0N30.QN7BKDM2HsfTbSMlsS7qNkMVeANnou-Goxz9Sny-pfU';

// Initialize the Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
