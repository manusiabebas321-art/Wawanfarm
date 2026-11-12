"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSuperAdminEmail } from "@/lib/admin";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { PackageItem, UserProfile } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isSuperAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  selectedPackage: PackageItem | null;
  selectPackage: (pkg: PackageItem | null) => void;
  addons: Record<string, number>;
  updateAddonQty: (addonId: string, delta: number) => void;
  setAddonQty: (addonId: string, qty: number) => void;
  clearOrderCart: () => void;
  cartItemCount: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CART_STORAGE_KEY = "wawanfarm_cart_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [hydratedCart, setHydratedCart] = useState(false);

  // Hydrate selected package & addons from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          selectedPackage?: PackageItem | null;
          addons?: Record<string, number>;
        };
        if (parsed.selectedPackage) setSelectedPackage(parsed.selectedPackage);
        if (parsed.addons) setAddons(parsed.addons);
      }
    } catch {
      // ignore storage errors
    } finally {
      setHydratedCart(true);
    }
  }, []);

  // Persist cart changes
  useEffect(() => {
    if (!hydratedCart) return;
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ selectedPackage, addons })
      );
    } catch {
      // ignore storage errors
    }
  }, [selectedPackage, addons, hydratedCart]);

  const loadProfileForUser = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, address, active_package, updated_at")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
        return;
      }

      const meta = (currentUser.user_metadata ?? {}) as Record<string, unknown>;
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        full_name:
          (typeof meta.full_name === "string" && meta.full_name) ||
          currentUser.email?.split("@")[0] ||
          "Pelanggan WawanFarm",
        phone: typeof meta.phone === "string" ? meta.phone : "",
        address: typeof meta.address === "string" ? meta.address : "",
        active_package: null,
        updated_at: null,
      };
      setProfile(fallbackProfile);
    } catch {
      // graceful fallback
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfileForUser(user);
  }, [loadProfileForUser, user]);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const activeSession = data.session ?? null;
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      await loadProfileForUser(activeSession?.user ?? null);
      if (mounted) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession ?? null);
        setUser(newSession?.user ?? null);
        await loadProfileForUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfileForUser]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const selectPackage = useCallback((pkg: PackageItem | null) => {
    setSelectedPackage(pkg);
  }, []);

  const updateAddonQty = useCallback((addonId: string, delta: number) => {
    setAddons((prev) => {
      const nextQty = Math.max(0, Math.min(20, (prev[addonId] ?? 0) + delta));
      const copy = { ...prev };
      if (nextQty === 0) {
        delete copy[addonId];
      } else {
        copy[addonId] = nextQty;
      }
      return copy;
    });
  }, []);

  const setAddonQty = useCallback((addonId: string, qty: number) => {
    setAddons((prev) => {
      const nextQty = Math.max(0, Math.min(20, qty));
      const copy = { ...prev };
      if (nextQty === 0) {
        delete copy[addonId];
      } else {
        copy[addonId] = nextQty;
      }
      return copy;
    });
  }, []);

  const clearOrderCart = useCallback(() => {
    setSelectedPackage(null);
    setAddons({});
  }, []);

  const cartItemCount = useMemo(() => {
    const addonTotal = Object.values(addons).reduce((sum, n) => sum + n, 0);
    return (selectedPackage ? 1 : 0) + addonTotal;
  }, [selectedPackage, addons]);

  const isSuperAdmin = useMemo(
    () => isSuperAdminEmail(user?.email),
    [user?.email]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isSuperAdmin,
      loading,
      refreshProfile,
      signOut,
      selectedPackage,
      selectPackage,
      addons,
      updateAddonQty,
      setAddonQty,
      clearOrderCart,
      cartItemCount,
    }),
    [
      user,
      session,
      profile,
      isSuperAdmin,
      loading,
      refreshProfile,
      signOut,
      selectedPackage,
      selectPackage,
      addons,
      updateAddonQty,
      setAddonQty,
      clearOrderCart,
      cartItemCount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider.");
  }
  return ctx;
}
