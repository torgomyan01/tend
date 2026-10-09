import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MessagesInbox } from "@/components/messages-inbox";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Զրույց | Tend.am",
};

export default async function MessageThreadPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(
      `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.messageThread(id))}`,
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f4f0e8] text-slate-950">
      <div className={`shrink-0 ${id ? "max-md:hidden" : ""}`}>
        <SiteHeader />
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0 pt-0 md:px-6 md:pb-8 md:pt-2 lg:px-8">
        <MessagesInbox />
      </main>
    </div>
  );
}
