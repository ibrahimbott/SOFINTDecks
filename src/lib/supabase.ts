import { createClient } from '@supabase/supabase-js';

// These will be replaced with your actual Supabase Project credentials once you create the free account.
// For now, they use environment variables that we will configure when you deploy to Vercel.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// SUPABASE DATABASE & STORAGE SCHEMA PLAN
// ==========================================
// 
// 1. Storage Bucket: "presentations"
//    - This is where the actual uploaded .pdf files will live securely.
//
// 2. Postgres Table: "projects"
//    - id: UUID (Primary Key)
//    - created_at: Timestamp
//    - title: String
//    - pdf_path: String (The path to the file in the "presentations" bucket)
//    - deleted_pages: Integer[] (Array of the pages you chose to remove)
//
// By using this, you can send a client a link like: 
// yoursitename.vercel.app/?project=123e4567-e89b-12d3...
// The app will read the ID, fetch the exact PDF and your edits, and instantly load the presentation!
