import {
  BadgeCheck,
  Ban,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserCreateButton } from "@/components/admin/user-create-button";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { formatAmd, formatDateTime, formatNumber } from "@/lib/format";
import type { Prisma, UserRole } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-slate-950 text-white",
  MODERATOR: "bg-indigo-100 text-indigo-800",
  USER: "bg-slate-100 text-slate-700",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Գերադմին",
  MODERATOR: "Մոդերատոր",
  USER: "Օգտատեր",
};

type SearchParams = {
  q?: string;
  role?: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ?? "";
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const roleFilter: UserRole | null =
    params.role === "ADMIN" ||
    params.role === "MODERATOR" ||
    params.role === "USER"
      ? (params.role as UserRole)
      : null;

  const conditions: Prisma.UserWhereInput[] = [];
  if (query) {
    conditions.push({
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
        { phone: { contains: query } },
      ],
    });
  }
  if (roleFilter) {
    conditions.push({ role: roleFilter });
  }

  const where: Prisma.UserWhereInput =
    conditions.length === 0 ? {} : { AND: conditions };

  const [users, totalUsers, verifiedUsers, blockedUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        _count: {
          select: { tenders: true, bids: true },
        },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.user.count({ where: { isBlocked: true } }),
  ]);

  const summary = [
    {
      label: "Ընդհանուր",
      value: formatNumber(totalUsers),
      icon: Users,
      tone: "bg-amber-100 text-amber-800",
    },
    {
      label: "Վերիֆիկացված",
      value: formatNumber(verifiedUsers),
      icon: BadgeCheck,
      tone: "bg-emerald-100 text-emerald-800",
    },
    {
      label: "Արգելափակված",
      value: formatNumber(blockedUsers),
      icon: ShieldAlert,
      tone: "bg-rose-100 text-rose-800",
    },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Մարդիկ"
        title="Օգտատերեր"
        description="Որոնեք, զտեք, ստեղծեք, խմբագրեք կամ ջնջեք օգտատերերին։"
        actions={<UserCreateButton />}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className={`grid size-11 place-items-center rounded-2xl ${item.tone}`}>
                <Icon className="size-5" />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-3xl font-black">{item.value}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <form
          action={ROUTES.admin.users}
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Որոնել անունով, email-ով կամ հեռախոսահամարով"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>
          <select
            name="role"
            defaultValue={roleFilter ?? ""}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
          >
            <option value="">Բոլոր դերերը</option>
            <option value="USER">Օգտատեր</option>
            <option value="MODERATOR">Մոդերատոր</option>
            <option value="ADMIN">Գերադմին</option>
          </select>
          <button
            type="submit"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Կիրառել
          </button>
        </form>

        <div className="mt-5 overflow-hidden rounded-3xl ring-1 ring-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Օգտատեր</th>
                <th className="hidden px-4 py-3 sm:table-cell">Դեր</th>
                <th className="hidden px-4 py-3 md:table-cell">Մրցույթ / Առաջարկ</th>
                <th className="hidden px-4 py-3 md:table-cell">Դրամապանակ</th>
                <th className="hidden px-4 py-3 lg:table-cell">Կարգավիճակ</th>
                <th className="hidden px-4 py-3 lg:table-cell">Միացել է</th>
                <th className="px-4 py-3 text-right">Գործողություն</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    Չի գտնվել։
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">
                            {user.name || "Անանուն"}
                          </p>
                          <p className="truncate text-xs font-semibold text-slate-500">
                            {user.email}
                          </p>
                          <p className="truncate text-xs font-semibold text-slate-400">
                            {user.phone ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${ROLE_BADGE[user.role]}`}
                      >
                        {ROLE_LABEL[user.role]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-xs font-semibold text-slate-500 md:table-cell">
                      <p>{formatNumber(user._count.tenders)} մրցույթ</p>
                      <p>{formatNumber(user._count.bids)} առաջարկ</p>
                    </td>
                    <td className="hidden px-4 py-3 text-sm font-black text-slate-900 md:table-cell">
                      {formatAmd(Number(user.walletBalance))}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {user.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">
                            <ShieldCheck className="size-3" /> Վերիֆ
                          </span>
                        ) : null}
                        {user.telegramVerifiedAt ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-700">
                            TG
                          </span>
                        ) : null}
                        {user.isBlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-700">
                            <Ban className="size-3" /> Արգելափ
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-xs font-semibold text-slate-500 lg:table-cell">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <UserRowActions
                        isSelf={user.id === currentUserId}
                        user={{
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          phone: user.phone,
                          role: user.role,
                          walletBalance: Number(user.walletBalance),
                          isVerified: user.isVerified,
                          isBlocked: user.isBlocked,
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {users.length >= 80 ? (
          <p className="mt-3 text-center text-xs font-semibold text-slate-500">
            Ցուցադրվում են վերջին 80 գրառումները։ Որոնեք ավելի կոնկրետ
            արդյունքների համար։
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Link
            href={ROUTES.admin.dashboard}
            className="text-sm font-black text-amber-700 hover:text-amber-600"
          >
            ← Վերադառնալ վահանակ
          </Link>
        </div>
      </section>
    </>
  );
}
