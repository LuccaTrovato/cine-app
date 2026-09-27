import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  get client(): SupabaseClient {
    return this.supabase;
  }
}
