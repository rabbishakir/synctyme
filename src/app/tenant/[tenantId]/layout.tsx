import TenantSessionSync from "@/components/tenant/TenantSessionSync";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TenantSessionSync />
      {children}
    </>
  );
}
