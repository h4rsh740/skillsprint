import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { X402PaymentPortal } from "@/components/x402/X402PaymentPortal";

const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "SkillSprint AI",
  description: "Predict. Prepare. Place. AI-powered Career Twin & Talent Intelligence Platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col animate-in fade-in duration-300">
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
        {/*
          X402PaymentPortal is a Client Component wrapper that lazy-loads
          X402PaymentModal with ssr:false. Placing it here at root layout ensures
          the portal (attached to document.body) is completely outside any
          dashboard layout stacking contexts (transform / backdrop-filter).
        */}
        <X402PaymentPortal />
      </body>
    </html>
  );
}
