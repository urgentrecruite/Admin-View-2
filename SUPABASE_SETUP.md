# Supabase Integration Setup Guide

This guide will help you connect the Admin View application to Supabase for persistent data storage.

## Prerequisites

- Supabase account (https://supabase.com)
- Your GitHub account already linked to Supabase

## Step 1: Create Supabase Tables

In your Supabase project dashboard, run these SQL commands in the SQL Editor:

### Create Profiles Table
```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  location TEXT,
  experience TEXT,
  skills TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'cv',
  submitted_at TIMESTAMP DEFAULT NOW(),
  summary TEXT,
  contact TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_source ON profiles(source);
CREATE INDEX idx_profiles_name ON profiles(name);
```

### Create Shortlist Requests Table
```sql
CREATE TABLE shortlist_requests (
  id TEXT PRIMARY KEY,
  organization TEXT NOT NULL,
  contact TEXT,
  role TEXT,
  requested TIMESTAMP DEFAULT NOW(),
  annual_gross_pay NUMERIC,
  viewed BOOLEAN DEFAULT FALSE,
  intake_complete BOOLEAN DEFAULT FALSE,
  link_shared_count INTEGER DEFAULT 0,
  client_response TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  workflow_state TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_requests_organization ON shortlist_requests(organization);
CREATE INDEX idx_requests_payment_status ON shortlist_requests(payment_status);
```

### Create Shortlists Table
```sql
CREATE TABLE shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  request_id TEXT REFERENCES shortlist_requests(id),
  organization TEXT NOT NULL,
  title TEXT,
  annual_gross_pay NUMERIC,
  fee_rate NUMERIC DEFAULT 0.005,
  payment_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shortlists_token ON shortlists(token);
CREATE INDEX idx_shortlists_organization ON shortlists(organization);
```

### Create Junction Table (Profiles in Shortlists)
```sql
CREATE TABLE shortlist_profiles (
  shortlist_id UUID REFERENCES shortlists(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (shortlist_id, profile_id)
);

CREATE INDEX idx_shortlist_profiles_shortlist ON shortlist_profiles(shortlist_id);
CREATE INDEX idx_shortlist_profiles_profile ON shortlist_profiles(profile_id);
```

## Step 2: Set RLS Policies (Row Level Security)

For development, you can disable RLS. For production, enable it with proper policies:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies (allow authenticated users all operations)
CREATE POLICY "Allow authenticated users full access on profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access on requests"
  ON shortlist_requests FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access on shortlists"
  ON shortlists FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access on shortlist_profiles"
  ON shortlist_profiles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## Step 3: Get Your Credentials

1. Go to **Settings** → **API** in your Supabase project
2. Copy your **Project URL** and **Anon Public Key**

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## Step 5: Install Supabase JS Client

Add the Supabase client to your `index.html` before loading app.js:

```html
<!-- Add this to <head> or before closing </body> -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Or if you're using a build tool, install via npm:
```bash
npm install @supabase/supabase-js
```

## Step 6: Update Your HTML

Update `index.html` to include the integration scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="supabase-integration.js"></script>
<script src="app.js"></script>
```

## Step 7: Integrate with Your App

Your `app.js` can now use the `supabaseIntegration` object:

```javascript
// Load profiles from Supabase
const supabaseProfiles = await supabaseIntegration.fetchProfiles();

// Merge with local data
profiles = [...supabaseProfiles, ...profiles];

// Save new profile
await supabaseIntegration.createProfile({
  id: `profile-${Date.now()}`,
  name: profile.name,
  role: profile.role,
  // ... other fields
});

// Update profile
await supabaseIntegration.updateProfile(profileId, { viewed: true });
```

## Data Migration

To migrate your existing localStorage data to Supabase:

```javascript
async function migrateLocalStorageToSupabase() {
  // Get local data
  const localProfiles = JSON.parse(localStorage.getItem('urgentRecruiteProfiles') || '[]');
  const localRequests = JSON.parse(localStorage.getItem('urgentRecruiteShortlistRequests') || '[]');

  // Upload profiles
  for (const profile of localProfiles) {
    await supabaseIntegration.createProfile({
      id: profile.id || `migrated-${Date.now()}`,
      name: profile.name,
      role: profile.role,
      location: profile.location,
      experience: profile.experience,
      skills: profile.skills,
      source: profile.source,
      summary: profile.summary,
      contact: profile.contact,
      notes: profile.notes
    });
  }

  // Upload requests
  for (const request of localRequests) {
    await supabaseIntegration.createRequest({
      id: request.id || `req-${Date.now()}`,
      organization: request.organization,
      contact: request.contact,
      role: request.role,
      annual_gross_pay: request.annualGrossPay,
      viewed: request.viewed,
      intake_complete: request.intakeComplete,
      link_shared_count: request.linkSharedCount,
      client_response: request.clientResponse,
      payment_status: request.paymentStatus
    });
  }

  console.log('Migration complete!');
}

// Run migration
// migrateLocalStorageToSupabase();
```

## Hybrid Approach (Recommended)

Start with localStorage and sync with Supabase periodically:

```javascript
async function syncToSupabase() {
  // Save profiles
  for (const profile of profiles) {
    const existingSupabaseProfile = await supabaseIntegration.updateProfile(profile.id, profile);
    if (!existingSupabaseProfile) {
      await supabaseIntegration.createProfile(profile);
    }
  }

  // Save requests
  for (const request of requests) {
    const existingSupabaseRequest = await supabaseIntegration.updateRequest(request.id, request);
    if (!existingSupabaseRequest) {
      await supabaseIntegration.createRequest(request);
    }
  }
}

// Call periodically or on important events
setInterval(syncToSupabase, 30000); // Sync every 30 seconds
```

## Testing the Connection

In your browser console:

```javascript
// Test connection
const profiles = await supabaseIntegration.fetchProfiles();
console.log('Profiles from Supabase:', profiles);

// Create a test profile
const newProfile = await supabaseIntegration.createProfile({
  id: 'test-' + Date.now(),
  name: 'Test Profile',
  role: 'Test Role',
  location: 'Test Location'
});
console.log('Created profile:', newProfile);
```

## Troubleshooting

### Connection Errors
- Check that your Supabase URL and key are correct
- Verify RLS policies allow your anon key access
- Check browser console for CORS errors

### CORS Issues
- Supabase should handle CORS by default
- If issues persist, check Supabase project settings → API → CORS

### Missing Data
- Ensure tables are created with correct schema
- Verify field names match between app and database
- Check that data types are compatible

## Next Steps

1. **Authentication**: Add Supabase Auth for user login
2. **Real-time**: Use Supabase Realtime to sync data across multiple users
3. **Backups**: Set up automated Supabase backups
4. **File Storage**: Use Supabase Storage for CV uploads

For more info: https://supabase.com/docs
