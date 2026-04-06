"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Building2,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface AppShellProps {
  children: React.ReactNode;
  tenantId: string;
  companyName: string;
  userEmail: string;
  userRole: string;
}

export default function AppShell({
  children,
  tenantId,
  companyName,
  userEmail,
  userRole,
}: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: "Dashboard", href: `/tenant/${tenantId}/dashboard`, icon: LayoutDashboard },
    { label: "Timesheets", href: `/tenant/${tenantId}/timesheets`, icon: Calendar },
    { label: "Consultants", href: `/tenant/${tenantId}/consultants`, icon: Users },
    { label: "Projects", href: `/tenant/${tenantId}/projects`, icon: Briefcase },
  ];

  if (["COMPANY_ADMIN"].includes(userRole)) {
    navItems.push({ label: "Settings", href: `/tenant/${tenantId}/settings/users`, icon: Settings });
  }

  const isActive = (href: string) =>
    pathname === href || (href !== `/tenant/${tenantId}/dashboard` && pathname.startsWith(href));

  const roleLabel = userRole.replace(/_/g, " ");
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:relative lg:z-auto",
          collapsed ? "w-[68px]" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
          {!collapsed && (
            <Link href={`/tenant/${tenantId}/dashboard`} className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                S
              </div>
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">SyncTyme</span>
            </Link>
          )}
          {collapsed && (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              S
            </div>
          )}
        </div>

        {/* Company label */}
        <div className={cn("border-b border-sidebar-border px-4 py-2.5", collapsed && "px-2")}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-sidebar-accent text-[10px] font-bold text-sidebar-accent-foreground">
                {companyName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{companyName}</p>
                <p className="truncate text-[10px] text-sidebar-foreground/50">{roleLabel}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title={companyName}>
              <div className="flex h-6 w-6 items-center justify-center rounded bg-sidebar-accent text-[10px] font-bold text-sidebar-accent-foreground">
                {companyName.charAt(0)}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          <Link
            href="/tenant-selector"
            title={collapsed ? "Switch company" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <ArrowLeftRight size={16} className="flex-shrink-0" />
            {!collapsed && <span>Switch company</span>}
          </Link>

          <div className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2", collapsed && "justify-center px-0")}>
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[10px] font-bold text-sidebar-accent-foreground">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{userEmail}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                className="flex-shrink-0 rounded p-1 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="flex w-full items-center justify-center rounded-md py-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-18 hidden h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground/50 hover:text-sidebar-foreground shadow-sm transition-colors lg:flex"
        >
          <ChevronLeft size={14} className={cn("transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-bold">S</div>
            <span className="text-sm font-semibold">SyncTyme</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
