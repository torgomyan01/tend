"use client";

import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

type VerificationRequestInfo = {
  status: VerificationStatus;
  submittedAt: string | Date;
  moderationNote?: string | null;
  selfieUrl: string;
  documentUrl: string;
};

type AccountVerificationFormProps = {
  currentRequest?: VerificationRequestInfo | null;
};

function statusLabel(status: VerificationStatus) {
  if (status === "APPROVED") {
    return "Հաստատված";
  }

  if (status === "REJECTED") {
    return "Մերժված";
  }

  return "Սպասման մեջ";
}

export function AccountVerificationForm({
  currentRequest,
}: AccountVerificationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<VerificationRequestInfo | null>(
    currentRequest ?? null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/account/verification", {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => null);

    setIsSubmitting(false);

    if (!response.ok) {
      if (data?.error === "PENDING_REQUEST_EXISTS") {
        setError("Դուք արդեն ունեք սպասման մեջ գտնվող վերիֆիկացիայի հայտ։");
        return;
      }

      if (data?.error === "INVALID_FILE_TYPE") {
        setError("Թույլատրվում են միայն JPG, PNG կամ WEBP նկարներ։");
        return;
      }

      if (data?.error === "FILE_TOO_LARGE") {
        setError("Յուրաքանչյուր նկարի չափը պետք է լինի մինչև 5MB։");
        return;
      }

      setError("Չհաջողվեց ուղարկել վերիֆիկացիայի հայտը։ Փորձեք կրկին։");
      return;
    }

    if (data?.request) {
      setRequestInfo({
        status: data.request.status,
        submittedAt: data.request.submittedAt,
        selfieUrl: data.request.selfieUrl,
        documentUrl: data.request.documentUrl,
      });
      formRef.current?.reset();
    }
  }

  return (
    <div className="space-y-4">
      {requestInfo ? (
        <div className="rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-amber-700" />
            <p className="text-sm font-black text-amber-900">
              Վերջին հայտի կարգավիճակ՝ {statusLabel(requestInfo.status)}
            </p>
          </div>
          <p className="mt-2 text-xs font-semibold text-amber-800">
            Ուղարկվել է{" "}
              {new Date(requestInfo.submittedAt).toLocaleString("hy-AM")}
          </p>
          {requestInfo.moderationNote ? (
            <p className="mt-2 text-xs font-semibold text-amber-900">
              Նշում՝ {requestInfo.moderationNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-black text-slate-700">
            Սելֆի (դեմքը հստակ երևացող)
          </span>
          <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <UploadCloud className="size-5 text-slate-400" />
            <input
              name="selfie"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
            />
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-black text-slate-700">
            Փաստաթղթի նկար (անձնագիր կամ ID քարտ)
          </span>
          <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <UploadCloud className="size-5 text-slate-400" />
            <input
              name="document"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className="w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
            />
          </span>
        </label>

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : null}
          Ուղարկել մոդերացիայի
        </button>
      </form>
    </div>
  );
}
