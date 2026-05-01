import { prisma } from "@/lib/prisma";

export type ServiceCategoryWithServices = {
  id: string;
  title: string;
  description: string;
  services: Array<{ id: string; title: string }>;
};

export async function getServiceCategories(): Promise<
  ServiceCategoryWithServices[]
> {
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true },
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    title: category.title,
    description: category.description,
    services: category.services,
  }));
}
