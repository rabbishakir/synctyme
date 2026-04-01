"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useState } from "react";

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
        className="flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
      >
        <LogOut size={18} />
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
    >
      <LogOut size={15} />
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
