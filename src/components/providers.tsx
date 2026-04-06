"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "text-sm",
          duration: 4000,
        }}
        richColors
        closeButton
      />
    </SessionProvider>
  );
}
