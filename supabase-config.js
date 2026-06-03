<<<<<<< HEAD
window.URGENT_RECRUITE_SUPABASE = {
  url: "https://xcekqsucgvhwtmvwjqhl.supabase.co",
  publishableKey: "sb_publishable_6Dm8Rvc1SjR1CUmpGT6yew_VPuXPxHL"
};

if (window.supabase && window.URGENT_RECRUITE_SUPABASE.publishableKey) {
  window.urgentRecruiteSupabase = window.supabase.createClient(
    window.URGENT_RECRUITE_SUPABASE.url,
    window.URGENT_RECRUITE_SUPABASE.publishableKey
  );
}
=======
// Supabase Configuration
// Initialize the Supabase client with your project credentials

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabaseClient;
>>>>>>> cdbb01780dfb28aedc77e238f5f1df57f9d1b804
