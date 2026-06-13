import { createContext, useContext, useEffect, useState } from "react";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { AUTH_ENDPOINTS } from "../config/api";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

const TOKEN_KEY = "yrj_token";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!stored) return;

      const res = await fetch(AUTH_ENDPOINTS.me, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (res.ok) {
        const data = await res.json();
        setToken(stored);
        setUser(data.user);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      // SecureStore 미설치 시 무시
    } finally {
      setLoading(false);
    }
  }

  async function saveToken(newToken) {
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    } catch {}
    setToken(newToken);
  }

  async function handleGoogleToken(idToken) {
    try {
      const res = await fetch(AUTH_ENDPOINTS.google, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await saveToken(data.token);
      setUser(data.user);
    } catch (err) {
      console.error("Google 로그인 실패:", err.message);
    }
  }

  async function loginWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      const idToken = data?.idToken;
      if (idToken) await handleGoogleToken(idToken);
    } catch (err) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error("Google 로그인 실패:", err.message);
      }
    }
  }

  async function logout() {
    try {
      await GoogleSignin.signOut();
    } catch {}
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {}
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
