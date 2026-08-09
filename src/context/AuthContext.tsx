import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type Role = 'citizen' | 'resident' | 'worker' | 'admin';

export type User = {
  id?: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  zone?: string;
  employeeId?: string;
  ward?: string;
  house_id?: string;
  created_at?: string;
};

type LoginCredentials = {
  houseNumber?: string;
  password?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (role: Role, credentials?: LoginCredentials) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (session) {
        // Fetch user profile from public.users
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile && active) {
          const mapped: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role as Role,
            avatar: profile.avatar || 'RA',
            zone: profile.zone || undefined,
            employeeId: profile.employee_id || undefined,
            ward: profile.ward || undefined,
            house_id: profile.house_id || undefined,
            created_at: profile.created_at || undefined,
          };
          setUser(mapped);
          localStorage.setItem('cleanos-user', JSON.stringify(mapped));
        } else if (active) {
          setUser(null);
          localStorage.removeItem('cleanos-user');
        }
      } else {
        const saved = localStorage.getItem('cleanos-user');
        if (saved && active) {
          const parsed = JSON.parse(saved) as User;
          if (parsed.role === 'resident') {
            setUser(null);
            localStorage.removeItem('cleanos-user');
          } else {
            setUser(parsed);
          }
        } else if (active) {
          setUser(null);
        }
      }
      setLoading(false);
    })();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      
      if (session) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile && active) {
          const mapped: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role as Role,
            avatar: profile.avatar || 'RA',
            zone: profile.zone || undefined,
            employeeId: profile.employee_id || undefined,
            ward: profile.ward || undefined,
            house_id: profile.house_id || undefined,
            created_at: profile.created_at || undefined,
          };
          setUser(mapped);
          localStorage.setItem('cleanos-user', JSON.stringify(mapped));
        }
      } else {
        if (active) {
          setUser(null);
          localStorage.removeItem('cleanos-user');
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (role: Role, credentials?: LoginCredentials) => {
    setLoading(true);
    try {
      if (role === 'worker' || role === 'admin') {
        const email = role === 'worker' ? 'worker@cleanos.city' : 'admin@cleanos.city';
        const password = 'password123';
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setLoading(false);
          return { error: error.message };
        }
        return {};
      }

      if (role === 'resident') {
        const houseNumber = credentials?.houseNumber;
        const password = credentials?.password;
        
        if (!houseNumber || !password) {
          setLoading(false);
          return { error: 'Please enter both Flat Number and Password.' };
        }

        // 1. Resolve flat number to house ID
        const { data: house, error: houseErr } = await supabase
          .from('houses')
          .select('id, house_number')
          .eq('house_number', houseNumber.toUpperCase())
          .maybeSingle();

        if (houseErr) {
          setLoading(false);
          return { error: houseErr.message };
        }
        if (!house) {
          setLoading(false);
          return { error: `House/Flat ${houseNumber} is not registered in CleanOS.` };
        }

        // 2. Authenticate via Supabase Auth
        const email = `${houseNumber.toLowerCase()}@cleanos.city`;
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authErr) {
          setLoading(false);
          return { error: authErr.message };
        }

        // 3. Retrieve user profile and verify house_id
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileErr || !profile) {
          await supabase.auth.signOut();
          setLoading(false);
          return { error: 'Profile not found. Please contact municipal admin.' };
        }

        if (profile.house_id !== house.id) {
          await supabase.auth.signOut();
          setLoading(false);
          return { error: 'Security alert: Profile is not authorized for this house.' };
        }

        return {};
      }
      
      setLoading(false);
      return { error: 'Invalid login role requested.' };
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || 'An unexpected error occurred during login.' };
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('cleanos-user');
    setLoading(false);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {loading ? (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wider">Syncing CleanOS Session...</p>
        </div>
      ) : (
        children
      )}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
