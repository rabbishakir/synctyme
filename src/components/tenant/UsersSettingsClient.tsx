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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TenantRole } from "@prisma/client";
import { Plus, Users, Loader2 } from "lucide-react";

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

export default function UsersSettingsClient({
  tenantId,
  initialMembers,
  canManageUsers,
}: UsersSettingsClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("HR");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState(initialMembers);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
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
      toast.success("User invited successfully");
      setOpen(false);
      setName("");
      setEmail("");
      setRole("HR");
      setError(null);
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
    const res = await fetch(
      `/api/tenant/${tenantId}/users/${targetUserId}/reset-password`,
      { method: "POST" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Reset failed");
      return;
    }
    toast.success(`Temporary password: ${data.tempPassword}`, { duration: 15000 });
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div>
      {canManageUsers && (
        <div className="mb-4 flex justify-end">
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Add User
          </Button>
        </div>
      )}

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Users size={24} />
          </div>
          <p className="text-sm font-medium text-foreground">No users yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Invite team members to get started.</p>
          {canManageUsers && (
            <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus size={15} className="mr-1" />
              Add User
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{m.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{m.role.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageUsers && (
                      <Button type="button" variant="outline" size="sm" onClick={() => resetPassword(m.userId)}>
                        Reset Password
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="invite-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="invite-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={role}
                  onChange={(e) => setRole(e.target.value as TenantRole)}
                  disabled={loading}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  A temporary password will be generated for the new user.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 size={14} className="animate-spin mr-1.5" />}
                {loading ? "Inviting..." : "Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
