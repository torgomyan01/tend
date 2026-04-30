import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ImageOff } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VerificationDecisionButtons } from "@/components/admin/verification-decision-buttons";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Սպասում է",
  APPROVED: "Հաստատված",
  REJECTED: "Մերժված",
};

type VerificationFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const FILTER_TABS: Array<{ value: VerificationFilter; label: string }> = [
  { value: "PENDING", label: "Սպասում են" },
  { value: "APPROVED", label: "Հաստատված" },
  { value: "REJECTED", label: "Մերժված" },
  { value: "ALL", label: "Բոլորը" },
];

function VerificationImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  if (!src) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <ImageOff className="size-6" />
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-2xl ring-1 ring-slate-200"
    >
      <Image
        src={src}
        alt={alt}
        width={480}
        height={480}
        className="h-full w-full object-cover transition group-hover:scale-105"
        unoptimized
      />
    </a>
  );
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter: VerificationFilter =
    params.status === "APPROVED" ||
    params.status === "REJECTED" ||
    params.status === "ALL"
      ? params.status
      : "PENDING";

  const where =
    filter === "ALL"
      ? {}
      : {
          status: filter,
        };

  const [pendingCount, approvedCount, rejectedCount, requests] =
    await Promise.all([
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.verificationRequest.count({ where: { status: "APPROVED" } }),
      prisma.verificationRequest.count({ where: { status: "REJECTED" } }),
      prisma.verificationRequest.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        take: 60,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isVerified: true,
              telegramVerifiedAt: true,
            },
          },
        },
      }),
    ]);

  const counts: Record<VerificationFilter, number> = {
    PENDING: pendingCount,
    APPROVED: approvedCount,
    REJECTED: rejectedCount,
    ALL: pendingCount + approvedCount + rejectedCount,
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Մոդերացիա"
        title="Հաշվի վերիֆիկացիա"
        description="Ստուգեք օգտատիրոջ ինքնության փաստաթղթերը և սելֆին, և կայացրեք որոշում։"
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.value;
          return (
            <Link
              key={tab.value}
              href={
                tab.value === "PENDING"
                  ? "/admin/verifications"
                  : `/admin/verifications?status=${tab.value}`
              }
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive ? "bg-white/15" : "bg-slate-100 text-slate-600"
                }`}
              >
                {counts[tab.value]}
              </span>
            </Link>
          );
        })}
      </div>

      <section className="space-y-4">
        {requests.length === 0 ? (
          <div className="rounded-4xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <BadgeCheck className="mx-auto size-10 text-emerald-500" />
            <p className="mt-3 text-lg font-black text-slate-900">
              Հայտեր չկան
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Այս ֆիլտրի համար ցուցադրելու հայտ չկա։
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <article
              key={request.id}
              id={request.id}
              className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div className="group">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Սելֆի
                    </p>
                    <VerificationImage
                      src={request.selfieUrl}
                      alt="Selfie"
                    />
                  </div>
                  <div className="group">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Փաստաթուղթ
                    </p>
                    <VerificationImage
                      src={request.documentUrl}
                      alt="Document"
                    />
                  </div>
                </div>

                <div className="flex w-full flex-col gap-4 lg:w-80">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                        Օգտատեր
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_BADGE[request.status]}`}
                      >
                        {STATUS_LABEL[request.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-black text-slate-950">
                      {request.user.name || "Անանուն օգտատեր"}
                    </p>
                    <div className="mt-1 space-y-0.5 text-xs font-semibold text-slate-500">
                      <p>{request.user.email}</p>
                      <p>{request.user.phone ?? "Հեռախոսահամար չկա"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    <p>Ուղարկվել է՝ {formatDateTime(request.submittedAt)}</p>
                    {request.reviewedAt ? (
                      <p>
                        Քննարկվել է՝ {formatDateTime(request.reviewedAt)}
                      </p>
                    ) : null}
                    {request.moderationNote ? (
                      <p className="mt-2 rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        Մոդերատորի նշում՝ {request.moderationNote}
                      </p>
                    ) : null}
                  </div>

                  {request.status === "PENDING" ? (
                    <VerificationDecisionButtons requestId={request.id} />
                  ) : (
                    <p className="text-xs font-semibold text-slate-500">
                      Հայտն արդեն մշակվել է։
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
