"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FLACInput from "@/components/flac/FLACInput";
import { getFieldAccess } from "@/lib/flac";
import { useSession } from "next-auth/react";
import type { TenantRole } from "@prisma/client";

interface MemberRow {
  id: string;
  userId: string;
  email: string;
  role: TenantRole;
  createdAt: string;
}

interface UsersSettingsClientProps {
  tenantId: string;
  initialMembers: MemberRow[];
  canManageUsers: boolean;
}

const ROLE_OPTIONS: TenantRole[] = ["HR", "ACCOUNTS", "CONSULTANT"];

function resolveRole(session: {
  role?: string | null;
  platformRole?: string | null;
}): string {
  if (session.role) return session.role;
  if (session.platformRole === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (session.platformRole === "SYSTEM_ADMIN") return "SYSTEM_ADMIN";
  return "CONSULTANT";
}

export default function UsersSettingsClient({
  tenantId,
  initialMembers,
  canManageUsers,
}: UsersSettingsClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("HR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState(initialMembers);

  const roleAccess = session?.user
    ? getFieldAccess(resolveRole(session.user), "TenantUserInvite", "role")
    : "NO_ACCESS";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        return;
      }
      setOpen(false);
      setName("");
      setEmail("");
      setRole("HR");
      router.refresh();
      if (data.member) {
        setMembers((prev) => [
          ...prev,
          {
            id: data.member.id,
            userId: data.member.userId,
            email: data.member.user.email,
            role: data.member.role,
            createdAt: data.member.createdAt,
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(targetUserId: string) {
    setError(null);
    const res = await fetch(
      `/api/tenant/${tenantId}/users/${targetUserId}/reset-password`,
      { method: "POST" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Reset failed");
      return;
    }
    alert(
      `Temporary password (copy now; also emailed if configured): ${data.tempPassword}`
    );
  }

  return (
    <div>
      {canManageUsers && (
        <div className="mb-4 flex justify-end">
          <Button type="button" onClick={() => setOpen(true)}>
            Add User
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">
                Role
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{m.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                    {m.role.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {canManageUsers && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => resetPassword(m.userId)}
                    >
                      Password reset
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="invite-name">Name</Label>
                <FLACInput
                  fieldName="name"
                  entity="TenantUserInvite"
                  value={name}
                  onChange={setName}
                  aria-label="Name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <FLACInput
                  fieldName="email"
                  entity="TenantUserInvite"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  aria-label="Email"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invite-role">Role</Label>
                {roleAccess === "EDIT" ? (
                  <select
                    id="invite-role"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    value={role}
                    onChange={(e) => setRole(e.target.value as TenantRole)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                ) : roleAccess === "VIEW" ? (
                  <span className="text-sm text-gray-700">
                    {role.replace(/_/g, " ")}
                  </span>
                ) : null}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
