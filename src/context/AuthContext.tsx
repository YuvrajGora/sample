import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'citizen' | 'worker' | 'admin';

export type User = {
  name: string;
  email: string;
  role: Role;
  avatar: string;
  zone?: string;
  employeeId?: string;
  ward?: string;
};

type AuthCtx = {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({ user: null, login: () => {}, logout: () => {} });

const USERS: Record<Role, User> = {
  citizen: {
    name: 'Aarav Sharma',
    email: 'aarav.sharma@cleanos.city',
    role: 'citizen',
    avatar: 'AS',
    zone: 'Zone 4 — Riverside',
  },
  worker: {
    name: 'Ravi Kumar',
    email: 'ravi.kumar@cleanos.city',
    role: 'worker',
    avatar: 'RK',
    employeeId: 'SW-2041',
    ward: 'Ward 12',
  },
  admin: {
    name: 'Priya Nair',
    email: 'priya.nair@cleanos.city',
    role: 'admin',
    avatar: 'PN',
    ward: 'Central Municipal Zone',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cleanos-user');
    return saved ? (JSON.parse(saved) as User) : null;
  });

  const login = (role: Role) => {
    const u = USERS[role];
    setUser(u);
    localStorage.setItem('cleanos-user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cleanos-user');
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
