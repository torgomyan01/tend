import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireAdmin } from "@/lib/admin";

export const metadata = {
  title: "Tend.am · Կառավարման վահանակ",
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();

  const sidebarUser = {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <div className="flex flex-col lg:flex-row">
        <AdminSidebar user={sidebarUser} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
