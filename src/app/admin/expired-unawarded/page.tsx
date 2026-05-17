import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ExpiredUnawardedPanel } from "@/components/admin/expired-unawarded-panel";

export const dynamic = "force-dynamic";

export default function AdminExpiredUnawardedPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Ժամկետանց ստուգում"
        description="Ակտիվ մրցույթներ, որոնց ժամկետը ավարտվել է 1+ օր առաջ, կա առնվազն 3 վճարովի դիմում, բայց կատարող չի ընտրվել։"
      />
      <ExpiredUnawardedPanel />
    </>
  );
}
