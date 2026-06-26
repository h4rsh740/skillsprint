"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  getAdditionalUserInfo
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { syncOAuthUser, signOutUser, linkGitHubAccountOnSignIn } from "@/actions/auth";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  provider: string;
  createdAt: string;
  githubConnected: boolean;
  linkedinConnected: boolean;
  resumeUploaded?: boolean;
  careerTwinGenerated: boolean;
  onboardingCompleted: boolean;
  role?: "STUDENT" | "RECRUITER";
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  videoEnded: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  loginWithLinkedIn: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateOnboarding: (data: Partial<UserProfile>) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from PostgreSQL session endpoint
  const refreshSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          return;
        }
      }
      setUser(null);
    } catch (err) {
      console.error("Error refreshing session:", err);
    }
  };

  // Sync / create user profile in Firestore and PostgreSQL
  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      // Sync user session to PostgreSQL server-side DB and set session cookie
      console.log("[AuthContext] Syncing user profile with PostgreSQL for Firebase UID:", firebaseUser.uid);
      const result = await syncOAuthUser(firebaseUser.uid, firebaseUser.email || "", "STUDENT");
      console.log("[AuthContext] syncOAuthUser result:", result);

      if (!result.success || !result.user) {
        throw new Error(result.error || "Failed to sync user payload");
      }

      const pgUser = result.user;

      // Sync Firestore profile
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      const clientProfile: UserProfile = {
        uid: firebaseUser.uid,
        name: pgUser.name || firebaseUser.displayName || "SkillSprint Candidate",
        email: firebaseUser.email || "",
        photoURL: firebaseUser.photoURL || (pgUser as any).avatarUrl || "",
        provider: firebaseUser.providerData.some((p) => p.providerId === "github.com") ? "github" : "google",
        createdAt: new Date().toISOString(),
        githubConnected: pgUser.githubConnected,
        linkedinConnected: pgUser.linkedinConnected,
        resumeUploaded: pgUser.resumeUploaded,
        careerTwinGenerated: pgUser.careerTwinGenerated,
        onboardingCompleted: pgUser.onboardingCompleted,
        role: pgUser.role as any
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: clientProfile.uid,
          name: clientProfile.name,
          email: clientProfile.email,
          photoURL: clientProfile.photoURL,
          provider: clientProfile.provider,
          createdAt: clientProfile.createdAt,
          githubConnected: clientProfile.githubConnected,
          linkedinConnected: clientProfile.linkedinConnected,
          careerTwinGenerated: clientProfile.careerTwinGenerated,
          onboardingCompleted: clientProfile.onboardingCompleted,
          role: clientProfile.role
        });
      } else {
        // Update photo URL if changed
        if (firebaseUser.photoURL && firebaseUser.photoURL !== userSnap.data().photoURL) {
          await updateDoc(userRef, { photoURL: firebaseUser.photoURL });
        }
      }

      setUser(clientProfile);
    } catch (err: any) {
      console.error("Error syncing user profile:", err);
      setError(err.message || "Failed to sync user profile");
      throw err;
    }
  };

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);

      // Safety: never stay stuck in loading more than 6 seconds
      const safetyTimeout = setTimeout(() => setLoading(false), 6000);

      try {
        if (firebaseUser) {
          await syncUserProfile(firebaseUser);
        } else {
          await refreshSession();
        }
      } catch (err: any) {
        console.error("Critical error during auth sync:", err);
        setError(err.message || "Authentication failed. Please try logging in again.");
        setUser(null);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync video ended state with loading transitions
  useEffect(() => {
    const shouldShowLoader = pathname !== "/" && !pathname.startsWith("/auth/") && pathname !== "/onboarding";
    if (loading) {
      if (shouldShowLoader) {
        setVideoEnded(false);
      } else {
        setVideoEnded(true);
      }
    } else {
      if (!shouldShowLoader) {
        setVideoEnded(true);
      }
    }
  }, [loading, pathname]);

  // Fallback timeout to ensure the user is let in after 23 seconds under any circumstance
  useEffect(() => {
    if (!videoEnded) {
      const timer = setTimeout(() => {
        setVideoEnded(true);
      }, 23000);
      return () => clearTimeout(timer);
    }
  }, [videoEnded]);

  // Attempt to play the video programmatically and catch autoplay restrictions
  useEffect(() => {
    if (!videoEnded && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Mobile video autoplay blocked. Bypassing animation to prevent black screen hang:", error);
          setVideoEnded(true);
        });
      }
    }
  }, [videoEnded]);

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged handles loading state automatically
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google");
      throw err;
    }
  };

  const loginWithGitHub = async () => {
    setError(null);
    try {
      const provider = new GithubAuthProvider();
      provider.addScope("repo");
      provider.addScope("read:user");
      provider.addScope("user:email");
      provider.addScope("read:org");
      const result = await signInWithPopup(auth, provider);
      
      const credential = GithubAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      if (accessToken && result.user) {
        const additionalInfo = getAdditionalUserInfo(result);
        const profile = additionalInfo?.profile as any;
        const username = profile?.login || "";
        const displayName = result.user.displayName || profile?.name || username;
        const avatarUrl = result.user.photoURL || profile?.avatar_url || "";
        
        await linkGitHubAccountOnSignIn(result.user.uid, accessToken, username, displayName, avatarUrl);
      }
    } catch (err: any) {
      console.error("GitHub sign-in error:", err);
      setError(err.message || "Failed to sign in with GitHub");
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
      
      await syncUserProfile(userCredential.user);
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
      await firebaseSignOut(auth);
      await signOutUser();
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

  const showGlobalLoader = (loading || !videoEnded) && pathname !== "/" && !pathname.startsWith("/auth/") && pathname !== "/onboarding";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        videoEnded,
        loginWithGoogle,
        loginWithGitHub,
        loginWithLinkedIn,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateOnboarding,
        refreshSession
      }}
    >
      {showGlobalLoader && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden">
          <video 
            ref={videoRef}
            src="/loading-video.mp4" 
            autoPlay 
            muted 
            loop={loading}
            playsInline
            preload="auto"
            onEnded={() => setVideoEnded(true)}
            className="w-full h-full object-contain"
          />
        </div>
      )}
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
  const { user, loading, videoEnded } = useAuth();
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

  if (loading || !videoEnded) {
    return null;
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
