import { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'user';

export type AuthenticatedUser = User & { role: AppRole };
