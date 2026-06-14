window.URGENT_RECRUITE_SUPABASE = {
  url: "https://xcekqsucgvhwtmvwjqhl.supabase.co",
  publishableKey: "sb_publishable_6Dm8Rvc1SjR1CUmpGT6yew_VPuXPxHL",
  clientViewUrl: "https://admin.urgentrecruite.com/"
};

if (window.supabase && window.URGENT_RECRUITE_SUPABASE.publishableKey) {
  window.urgentRecruiteSupabase = window.supabase.createClient(
    window.URGENT_RECRUITE_SUPABASE.url,
    window.URGENT_RECRUITE_SUPABASE.publishableKey
  );
}
