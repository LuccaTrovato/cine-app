import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private loadingService: LoadingService) {
    const fetchConLoading: typeof fetch = async (input, init) => {
      const finalizar = this.loadingService.iniciar();
      try {
        return await fetch(input, init);
      } finally {
        finalizar();
      }
    };

    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        fetch: fetchConLoading,
      },
    });
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}
