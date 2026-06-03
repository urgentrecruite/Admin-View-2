// Supabase Integration Layer
// Handles all database operations for profiles, requests, and shortlists

class SupabaseIntegration {
  constructor(supabaseClient) {
    this.client = supabaseClient;
  }

  // ==================== PROFILES ====================

  async fetchProfiles() {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
  }

  async createProfile(profile) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .insert([profile])
        .select();
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  }

  async updateProfile(id, updates) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error updating profile:', error);
      return null;
    }
  }

  async deleteProfile(id) {
    try {
      const { error } = await this.client
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      return false;
    }
  }

  // ==================== REQUESTS ====================

  async fetchRequests() {
    try {
      const { data, error } = await this.client
        .from('shortlist_requests')
        .select('*');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching requests:', error);
      return [];
    }
  }

  async createRequest(request) {
    try {
      const { data, error } = await this.client
        .from('shortlist_requests')
        .insert([request])
        .select();
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error creating request:', error);
      return null;
    }
  }

  async updateRequest(id, updates) {
    try {
      const { data, error } = await this.client
        .from('shortlist_requests')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error updating request:', error);
      return null;
    }
  }

  // ==================== SHORTLISTS ====================

  async fetchShortlists() {
    try {
      const { data, error } = await this.client
        .from('shortlists')
        .select('*');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching shortlists:', error);
      return [];
    }
  }

  async createShortlist(shortlist) {
    try {
      const { data, error } = await this.client
        .from('shortlists')
        .insert([shortlist])
        .select();
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error creating shortlist:', error);
      return null;
    }
  }

  async updateShortlist(id, updates) {
    try {
      const { data, error } = await this.client
        .from('shortlists')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error updating shortlist:', error);
      return null;
    }
  }

  async getShortlistByToken(token) {
    try {
      const { data, error } = await this.client
        .from('shortlists')
        .select('*')
        .eq('token', token)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data || null;
    } catch (error) {
      console.error('Error fetching shortlist:', error);
      return null;
    }
  }

  // ==================== PROFILE-SHORTLIST JUNCTION ====================

  async addProfileToShortlist(shortlistId, profileId) {
    try {
      const { data, error } = await this.client
        .from('shortlist_profiles')
        .insert([{ shortlist_id: shortlistId, profile_id: profileId }])
        .select();
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error adding profile to shortlist:', error);
      return null;
    }
  }

  async removeProfileFromShortlist(shortlistId, profileId) {
    try {
      const { error } = await this.client
        .from('shortlist_profiles')
        .delete()
        .eq('shortlist_id', shortlistId)
        .eq('profile_id', profileId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing profile from shortlist:', error);
      return false;
    }
  }

  async getShortlistProfiles(shortlistId) {
    try {
      const { data, error } = await this.client
        .from('shortlist_profiles')
        .select('profile_id, profiles(*)')
        .eq('shortlist_id', shortlistId);
      
      if (error) throw error;
      return data?.map(item => item.profiles) || [];
    } catch (error) {
      console.error('Error fetching shortlist profiles:', error);
      return [];
    }
  }

  // ==================== SYNC HELPERS ====================

  async syncAllData() {
    const [profiles, requests, shortlists] = await Promise.all([
      this.fetchProfiles(),
      this.fetchRequests(),
      this.fetchShortlists()
    ]);

    return { profiles, requests, shortlists };
  }

  async getStorageUsage() {
    try {
      const { data: { storage }, error } = await this.client.auth.admin.getUserById('any');
      if (error) throw error;
      return storage;
    } catch (error) {
      console.error('Error fetching storage usage:', error);
      return null;
    }
  }
}

// Initialize and export
const supabaseIntegration = new SupabaseIntegration(supabaseClient || window.supabaseClient);
window.supabaseIntegration = supabaseIntegration;
