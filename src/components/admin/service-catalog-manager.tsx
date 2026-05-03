"use client";

import {
  ChevronDown,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DND_SERVICE_TYPE = "application/x-tend-service-id";

function reorderIds(
  ids: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex >= ids.length
  ) {
    return ids;
  }
  const next = [...ids];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}
import {
  CategoryFormDialog,
  type CategoryFormCategory,
} from "@/components/admin/category-form-dialog";
import {
  ServiceFormDialog,
  type ServiceFormService,
} from "@/components/admin/service-form-dialog";

export type AdminCatalogService = {
  id: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
};

export type AdminCatalogCategory = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  services: AdminCatalogService[];
};

type ServiceCatalogManagerProps = {
  categories: AdminCatalogCategory[];
};

export function ServiceCatalogManager({
  categories,
}: ServiceCatalogManagerProps) {
  const router = useRouter();

  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );

  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryFormCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const [serviceDialogState, setServiceDialogState] = useState<{
    open: boolean;
    service: ServiceFormService | null;
    categoryId: string;
  }>({ open: false, service: null, categoryId: "" });
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null,
  );
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [draggingServiceId, setDraggingServiceId] = useState<string | null>(
    null,
  );
  const [dragOverServiceId, setDragOverServiceId] = useState<string | null>(
    null,
  );
  const [reorderBusyCategoryId, setReorderBusyCategoryId] = useState<
    string | null
  >(null);

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    title: category.title,
  }));

  async function deleteCategory(id: string) {
    setIsDeletingCategory(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setDeleteError("Չհաջողվեց ջնջել ոլորտը։");
        return;
      }
      setDeletingCategoryId(null);
      router.refresh();
    } catch {
      setDeleteError("Ցանցի սխալ։ Փորձեք կրկին։");
    } finally {
      setIsDeletingCategory(false);
    }
  }

  async function persistServiceOrder(
    categoryId: string,
    orderedServiceIds: string[],
  ) {
    setReorderBusyCategoryId(categoryId);
    setDeleteError(null);
    try {
      const response = await fetch(
        `/api/admin/categories/${categoryId}/services/reorder`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedServiceIds }),
        },
      );
      if (!response.ok) {
        setDeleteError("Չհաջողվեց պահպանել հերթականությունը։");
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Ցանցի սխալ։ Փորձեք կրկին։");
    } finally {
      setReorderBusyCategoryId(null);
    }
  }

  async function deleteService(id: string) {
    setIsDeletingService(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setDeleteError("Չհաջողվեց ջնջել ծառայությունը։");
        return;
      }
      setDeletingServiceId(null);
      router.refresh();
    } catch {
      setDeleteError("Ցանցի սխալ։ Փորձեք կրկին։");
    } finally {
      setIsDeletingService(false);
    }
  }

  const deletingCategory = deletingCategoryId
    ? categories.find((category) => category.id === deletingCategoryId)
    : null;
  const deletingService = deletingServiceId
    ? categories
        .flatMap((category) => category.services)
        .find((service) => service.id === deletingServiceId)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">
          Ընդհանուր՝ {categories.length} ոլորտ ・{" "}
          {categories.reduce(
            (sum, category) => sum + category.services.length,
            0,
          )}{" "}
          ծառայություն
        </p>
        <button
          type="button"
          onClick={() => setIsCreateCategoryOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5"
        >
          <Plus className="size-4" />
          Նոր ոլորտ
        </button>
      </div>

      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-lg font-black text-slate-900">
              Դեռ ոլորտ չկա
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Սեղմեք «Նոր ոլորտ» կոճակին՝ սկսելու համար։
            </p>
          </div>
        ) : (
          categories.map((category) => {
            const isOpen = expandedCategoryId === category.id;
            return (
              <article
                key={category.id}
                className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <header className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCategoryId((current) =>
                        current === category.id ? null : category.id,
                      )
                    }
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDown className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-base font-black text-slate-950 sm:text-lg">
                          {category.title}
                        </span>
                        {!category.isActive ? (
                          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
                            ԱՆԱԿՏԻՎ
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
                        {category.description}
                      </span>
                    </span>
                  </button>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                    {category.services.length} ծառայ.
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingCategory({
                          id: category.id,
                          title: category.title,
                          description: category.description,
                          sortOrder: category.sortOrder,
                          isActive: category.isActive,
                        })
                      }
                      className="grid size-9 place-items-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                      aria-label="Խմբագրել"
                      title="Խմբագրել"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCategoryId(category.id)}
                      className="grid size-9 place-items-center rounded-2xl bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                      aria-label="Ջնջել"
                      title="Ջնջել"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </header>

                {isOpen ? (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Ծառայություններ
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          Քարշեք տողը՝ կարգը փոխելու համար։ Նոր ծառայությունը
                          ինքնաբերաբար գալիս է վերջից։
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setServiceDialogState({
                            open: true,
                            service: null,
                            categoryId: category.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
                      >
                        <Plus className="size-3.5" />
                        Ավելացնել
                      </button>
                    </div>

                    {category.services.length === 0 ? (
                      <p className="rounded-2xl bg-white p-4 text-center text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                        Այս ոլորտում դեռ ծառայություն չկա։
                      </p>
                    ) : (
                      <ul className="relative space-y-2">
                        {reorderBusyCategoryId === category.id ? (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-[1px]">
                            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-md ring-1 ring-slate-200">
                              <Loader2 className="size-4 animate-spin text-amber-700" />
                              Հերթականությունը պահպանվում է…
                            </span>
                          </div>
                        ) : null}
                        {category.services.map((service) => {
                          const isDragging = draggingServiceId === service.id;
                          const showDropHighlight =
                            dragOverServiceId === service.id &&
                            draggingServiceId !== null &&
                            draggingServiceId !== service.id;

                          return (
                            <li
                              key={service.id}
                              draggable={
                                reorderBusyCategoryId !== category.id &&
                                category.services.length > 1
                              }
                              onDragStart={(e) => {
                                if (category.services.length <= 1) return;
                                setDraggingServiceId(service.id);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData(
                                  DND_SERVICE_TYPE,
                                  service.id,
                                );
                                e.dataTransfer.setData(
                                  "text/plain",
                                  service.id,
                                );
                              }}
                              onDragEnd={() => {
                                setDraggingServiceId(null);
                                setDragOverServiceId(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragOverServiceId(service.id);
                              }}
                              onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node))
                                  setDragOverServiceId((current) =>
                                    current === service.id ? null : current,
                                  );
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const draggedId =
                                  e.dataTransfer.getData(DND_SERVICE_TYPE) ||
                                  e.dataTransfer.getData("text/plain");
                                setDragOverServiceId(null);
                                if (
                                  !draggedId ||
                                  draggedId === service.id ||
                                  reorderBusyCategoryId === category.id
                                ) {
                                  return;
                                }
                                const ids = category.services.map((s) => s.id);
                                const from = ids.indexOf(draggedId);
                                const to = ids.indexOf(service.id);
                                if (from === -1 || to === -1 || from === to) {
                                  return;
                                }
                                const orderedServiceIds = reorderIds(
                                  ids,
                                  from,
                                  to,
                                );
                                void persistServiceOrder(
                                  category.id,
                                  orderedServiceIds,
                                );
                              }}
                              className={`flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-slate-200 transition ${
                                reorderBusyCategoryId === category.id
                                  ? "pointer-events-none opacity-60"
                                  : ""
                              } ${
                                isDragging ? "cursor-grabbing opacity-50" : ""
                              } ${
                                showDropHighlight
                                  ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-50"
                                  : ""
                              } ${
                                category.services.length > 1 ? "cursor-grab" : ""
                              }`}
                            >
                              <span
                                className="grid size-8 shrink-0 place-items-center text-slate-400"
                                title="Քարշել"
                                aria-hidden
                              >
                                <GripVertical className="size-4" />
                              </span>
                              <span className="flex min-w-0 flex-1 items-center gap-2">
                                <span className="truncate text-sm font-bold text-slate-900">
                                  {service.title}
                                </span>
                                {!service.isActive ? (
                                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
                                    ԱՆԱԿՏԻՎ
                                  </span>
                                ) : null}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setServiceDialogState({
                                    open: true,
                                    service,
                                    categoryId: category.id,
                                  })
                                }
                                className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                                aria-label="Խմբագրել"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeletingServiceId(service.id)
                                }
                                className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                                aria-label="Ջնջել"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <CategoryFormDialog
        open={isCreateCategoryOpen}
        onClose={() => setIsCreateCategoryOpen(false)}
        category={null}
      />
      <CategoryFormDialog
        open={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
      />

      <ServiceFormDialog
        open={serviceDialogState.open}
        onClose={() =>
          setServiceDialogState({ open: false, service: null, categoryId: "" })
        }
        service={serviceDialogState.service}
        defaultCategoryId={serviceDialogState.categoryId}
        categories={categoryOptions}
      />

      {deletingCategory ? (
        <DeleteConfirmDialog
          title="Ջնջել ոլորտը?"
          description={`«${deletingCategory.title}» և բոլոր ${deletingCategory.services.length} ծառայությունները կջնջվեն։ Գործողությունը հնարավոր չէ հետ բերել։`}
          isPending={isDeletingCategory}
          error={deleteError}
          onCancel={() => {
            setDeletingCategoryId(null);
            setDeleteError(null);
          }}
          onConfirm={() => deleteCategory(deletingCategory.id)}
        />
      ) : null}

      {deletingService ? (
        <DeleteConfirmDialog
          title="Ջնջել ծառայությունը?"
          description={`«${deletingService.title}» ծառայությունը կջնջվի։`}
          isPending={isDeletingService}
          error={deleteError}
          onCancel={() => {
            setDeletingServiceId(null);
            setDeleteError(null);
          }}
          onConfirm={() => deleteService(deletingService.id)}
        />
      ) : null}
    </div>
  );
}

type DeleteConfirmProps = {
  title: string;
  description: string;
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteConfirmDialog({
  title,
  description,
  isPending,
  error,
  onCancel,
  onConfirm,
}: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Փակել"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={() => {
          if (!isPending) onCancel();
        }}
      />
      <div className="relative z-10 w-full max-w-md rounded-4xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">
          Հաստատել ջնջումը
        </p>
        <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {description}
        </p>

        {error ? (
          <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
          >
            Չեղարկել
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-rose-500 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Ջնջել
          </button>
        </div>
      </div>
    </div>
  );
}
