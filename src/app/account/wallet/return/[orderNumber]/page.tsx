import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { WalletReturnClient } from "@/components/wallet-return-client";
import { authOptions } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{
    orderId?: string;
    responseCode?: string;
    description?: string;
  }>;
};

export default async function WalletReturnPage({
  params,
  searchParams,
}: Props) {
  const session = await getServerSession(authOptions);
  const { orderNumber: orderNumberRaw } = await params;
  const query = await searchParams;
  const orderNumber = orderNumberRaw.trim();

  if (!session?.user?.id) {
    const qs = new URLSearchParams();
    if (query.responseCode) qs.set("responseCode", query.responseCode);
    if (query.orderId) qs.set("orderId", query.orderId);
    const path = ROUTES.accountWalletReturn(orderNumber);
    const cb = qs.size > 0 ? `${path}?${qs.toString()}` : path;
    redirect(`${ROUTES.login}?callbackUrl=${encodeURIComponent(cb)}`);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <WalletReturnClient orderNumber={orderNumber} />
    </div>
  );
}
