import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // For GCM

// Retrieve key from environment or fallback to a stable development key
const getSecretKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // If the key is hex string of 64 chars, parse it
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // Otherwise pad or slice it to 32 bytes
    return Buffer.alloc(32, envKey, "utf8");
  }
  
  // Fallback dev key
  const fallbackString = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "skillsprint-ai-default-encryption-secret";
  return Buffer.alloc(32, fallbackString, "utf8");
};

/**
 * Encrypts cleartext using AES-256-GCM.
 * Returns a colon-separated string: "iv:encryptedText:authTag"
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const key = getSecretKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    return `${iv.toString("hex")}:${encrypted}:${authTag}`;
  } catch (error) {
    console.error("Token encryption failed:", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts a colon-separated cipher text "iv:encryptedText:authTag" using AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text structure");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], "hex");
    const key = getSecretKey();
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Token decryption failed:", error);
    throw new Error("Decryption failed");
  }
}
