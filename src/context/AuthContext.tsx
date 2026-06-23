"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { syncOAuthUser, signOutUser } from "@/actions/auth";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  provider: string;
  createdAt: string;
  githubConnected: boolean;
  linkedinConnected: boolean;
  careerTwinGenerated: boolean;
  onboardingCompleted: boolean;
  role?: "STUDENT" | "RECRUITER";
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  loginWithLinkedIn: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateOnboarding: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Sync / create user profile in Firestore
  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile in Firestore
        const isGitHub = firebaseUser.providerData.some(
          (p) => p.providerId === "github.com"
        );
        
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "SkillSprint User",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          provider: isGitHub ? "github" : "google",
          createdAt: new Date().toISOString(),
          githubConnected: isGitHub,
          linkedinConnected: false,
          careerTwinGenerated: false,
          onboardingCompleted: false,
          role: "STUDENT"
        };
        await setDoc(userRef, newProfile);
        setUser(newProfile);
      } else {
        // Update profile photo if changed, and load existing profile
        const existingData = userSnap.data() as UserProfile;
        if (firebaseUser.photoURL && firebaseUser.photoURL !== existingData.photoURL) {
          await updateDoc(userRef, { photoURL: firebaseUser.photoURL });
          existingData.photoURL = firebaseUser.photoURL;
        }
        setUser(existingData);
      }

      // Sync user session to PostgreSQL server-side DB and set session cookie
      await syncOAuthUser(firebaseUser.uid, firebaseUser.email || "", "STUDENT");
    } catch (err: any) {
      console.error("Error syncing user profile:", err);
      setError(err.message || "Failed to sync user profile");
    }
  };

  // Check LinkedIn session from Next.js cookie
  const checkLinkedInSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          return true;
        }
      }
    } catch (err) {
      console.error("Error checking LinkedIn session:", err);
    }
    return false;
  };

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      if (firebaseUser) {
        await syncUserProfile(firebaseUser);
        setLoading(false);
      } else {
        // If not authenticated via Firebase, check if there is a LinkedIn session
        const hasLinkedIn = await checkLinkedInSession();
        if (!hasLinkedIn) {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google");
      setLoading(false);
      throw err;
    }
  };

  const loginWithGitHub = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("GitHub sign-in error:", err);
      setError(err.message || "Failed to sign in with GitHub");
      setLoading(false);
      throw err;
    }
  };

  const loginWithLinkedIn = () => {
    router.push("/api/auth/linkedin");
  };

  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Email sign-in error:", err);
      setError(err.message || "Failed to sign in with email");
      setLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, { name }, { merge: true });
      
      setUser((prev) => prev ? { ...prev, name } : null);
    } catch (err: any) {
      console.error("Email registration error:", err);
      setError(err.message || "Failed to register with email");
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Sign out of Firebase Auth
      await firebaseSignOut(auth);
      // Clear session cookie
      await signOutUser();
      // Clear LinkedIn server session cookie
      await fetch("/api/auth/session", { method: "POST" });
      setUser(null);
      router.push("/auth/signin");
    } catch (err: any) {
      console.error("Sign-out error:", err);
      setError(err.message || "Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  const updateOnboarding = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, data);
      setUser((prev) => prev ? { ...prev, ...data } : null);
    } catch (err: any) {
      console.error("Failed to update onboarding state in Firestore:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithGoogle,
        loginWithGitHub,
        loginWithLinkedIn,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/auth/signin");
    } else if (!user.onboardingCompleted && pathname !== "/onboarding") {
      router.push("/onboarding");
    } else if (user.onboardingCompleted && (pathname === "/onboarding" || pathname.startsWith("/auth/"))) {
      router.push("/dashboard");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <video 
          src="/loading-video.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Render children if we have a user and they are on the correct path
  const isCorrectPath = user 
    ? (user.onboardingCompleted ? pathname !== "/onboarding" && !pathname.startsWith("/auth/") : pathname === "/onboarding")
    : pathname.startsWith("/auth/") || pathname === "/";

  if (!user && !pathname.startsWith("/auth/") && pathname !== "/") {
    return null; // Prevent flash of content
  }

  return <>{children}</>;
}
