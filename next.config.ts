import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || "",
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || "skillsprint-ai-d8c4e.firebaseapp.com",
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "skillsprint-ai-d8c4e",
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "",
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || "",
  }
};

export default nextConfig;
