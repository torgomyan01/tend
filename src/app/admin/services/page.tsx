import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  ServiceCatalogManager,
  type AdminCatalogCategory,
} from "@/components/admin/service-catalog-manager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          sortOrder: true,
          isActive: true,
          categoryId: true,
        },
      },
    },
  });

  const data: AdminCatalogCategory[] = categories.map((category) => ({
    id: category.id,
    title: category.title,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    services: category.services,
  }));

  return (
    <>
      <AdminPageHeader
        eyebrow="Կատալոգ"
        title="Ոլորտներ ու ծառայություններ"
        description="Կառավարեք կայքի ծառայությունների ցանկը։ Ստեղծեք, խմբագրեք, դեակտիվացրեք կամ ջնջեք ոլորտներ ու ծառայություններ։"
      />

      <ServiceCatalogManager categories={data} />
    </>
  );
}
