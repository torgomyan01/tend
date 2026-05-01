import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { serviceCategories } from "../src/lib/service-categories";

async function main() {
  console.log("Seeding service categories...");

  for (let categoryIndex = 0; categoryIndex < serviceCategories.length; categoryIndex++) {
    const categoryData = serviceCategories[categoryIndex];
    const category = await prisma.serviceCategory.upsert({
      where: { title: categoryData.title },
      create: {
        title: categoryData.title,
        description: categoryData.description,
        sortOrder: categoryIndex,
        isActive: true,
      },
      update: {
        description: categoryData.description,
        sortOrder: categoryIndex,
      },
    });

    for (
      let serviceIndex = 0;
      serviceIndex < categoryData.services.length;
      serviceIndex++
    ) {
      const serviceTitle = categoryData.services[serviceIndex];
      await prisma.service.upsert({
        where: {
          categoryId_title: {
            categoryId: category.id,
            title: serviceTitle,
          },
        },
        create: {
          categoryId: category.id,
          title: serviceTitle,
          sortOrder: serviceIndex,
          isActive: true,
        },
        update: {
          sortOrder: serviceIndex,
        },
      });
    }

    console.log(
      `  ✓ ${categoryData.title} (${categoryData.services.length} ծառայություն)`,
    );
  }

  const totalCategories = await prisma.serviceCategory.count();
  const totalServices = await prisma.service.count();

  console.log(
    `\nDone. ${totalCategories} ոլորտ ・ ${totalServices} ծառայություն DB-ում։`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
