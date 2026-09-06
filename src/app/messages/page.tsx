import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MessagesInbox } from "@/components/messages-inbox";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Հաղորդագրություններ | Tend.am",
};

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(
      `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.messages)}`,
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />
      <main className="px-4 pb-12 pt-2 sm:px-6 lg:px-8">
        <MessagesInbox />
      </main>
    </div>
  );
}
