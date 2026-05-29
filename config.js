// ─── 3C Boardroom HQ — Client Configuration ───────────────────────────────
// ANON key is safe for client-side use
// SERVICE_ROLE_KEY lives server-side in Cloudflare Worker ONLY — never here

const SUPABASE_URL = 'https://uqyqpwhkzlhqxcqajhkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeXFwd2hremxocXhjcWFqaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NzY3MDMsImV4cCI6MjA2NjI1MjcwM30.AE-bdpBIATQCtNWvWo468ZWPwQ-9LWghRO6-BeAzA2U';

// Cloudflare Worker URL — update after first wrangler deploy
const WORKER_URL = 'YOUR_WORKER_URL';
