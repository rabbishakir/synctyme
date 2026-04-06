import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlatformShell from "@/components/layout/PlatformShell";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function PlatformLayout({ children }: LayoutProps) {
  const session = await auth();
  if (!session?.user?.platformRole) redirect("/login");

  return (
    <PlatformShell
      userEmail={session.user.email ?? ""}
      platformRole={session.user.platformRole}
    >
      {children}
    </PlatformShell>
  );
}
