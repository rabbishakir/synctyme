"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  variant?: "icon" | "full";
}

export default function LogoutButton({ variant = "full" }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut({ callbackUrl: "/login" });
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleSignOut}
        disabled={loading}
        title="Sign out"
        className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
      >
        <LogOut size={18} />
      </button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={loading}>
      <LogOut size={15} className="mr-1.5" />
      {loading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
