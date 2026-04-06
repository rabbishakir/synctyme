"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Search,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Trash2,
} from "lucide-react";

interface CompanyRow {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  memberCount: number;
}

interface CompanyListClientProps {
  companies: CompanyRow[];
  platformRole: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
  PENDING_DELETION: "bg-orange-50 text-orange-700 border-orange-200",
  ARCHIVED: "bg-gray-100 text-gray-600 border-gray-200",
  DELETED: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  SUSPENDED: "bg-amber-500",
  PENDING_DELETION: "bg-orange-500",
  ARCHIVED: "bg-gray-400",
  DELETED: "bg-red-500",
};

const ALL_STATUSES = ["ACTIVE", "SUSPENDED", "PENDING_DELETION", "ARCHIVED"];

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc";

export default function CompanyListClient({ companies, platformRole }: CompanyListClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<SortOption>("newest");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = companies
    .filter((c) => {
      const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 appearance-none rounded-lg border border-input bg-transparent pl-3 pr-8 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="ALL">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-8 appearance-none rounded-lg border border-input bg-transparent pl-3 pr-8 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Building2 size={24} />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search || statusFilter !== "ALL" ? "No companies match your filters" : "No companies yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search or filters"
                : "Create your first company to get started"}
            </p>
            {!search && statusFilter === "ALL" && (
              <Link
                href="/platform/companies/new"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create Company
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Members
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((company) => (
                <tr key={company.id} className="group hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                        {company.name.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[company.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[company.status] ?? "bg-gray-400"}`} />
                      {company.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {company.memberCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDate(company.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenu(openMenu === company.id ? null : company.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenu === company.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-card py-1 shadow-lg">
                            <Link
                              href={`/tenant/${company.id}/dashboard`}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              onClick={() => setOpenMenu(null)}
                            >
                              <Eye size={14} />
                              View
                            </Link>
                            {(platformRole === "SUPER_ADMIN" ||
                              (platformRole === "SYSTEM_ADMIN" && company.status === "PENDING_DELETION")) && (
                              <Link
                                href={`/platform/companies/${company.id}/delete`}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-muted transition-colors"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Trash2 size={14} />
                                {platformRole === "SYSTEM_ADMIN" ? "Review" : "Delete"}
                              </Link>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {companies.length} companies
      </p>
    </div>
  );
}
