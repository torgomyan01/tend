"use client";

import { AlertTriangle, Loader2, Play, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { formatDateTime } from "@/lib/format";

type EligibleRow = {
  id: string;
  title: string;
  endsAt: string | null;
  paidBidCount: number;
  client: {
    id: string;
    name: string | null;
    email: string;
  };
};

type RepeatOffender = {
  clientId: string;
  name: string | null;
  email: string;
  phone: string | null;
  violationCount: number;
  tenderIds: string[];
};

type RunResult = {
  scanned: number;
  processed: Array<{ tenderId: string; title: string; clientId: string }>;
  skipped: Array<{ tenderId: string; reason: string }>;
  repeatOffenders: RepeatOffender[];
};

export function ExpiredUnawardedPanel() {
  const [eligible, setEligible] = useState<EligibleRow[]>([]);
  const [repeatOffenders, setRepeatOffenders] = useState<RepeatOffender[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tenders/expired-unawarded", {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Չհաջողվեց բեռնել տվյալները։");
        return;
      }
      const data = (await res.json()) as {
        eligible?: EligibleRow[];
        repeatOffenders?: RepeatOffender[];
      };
      setEligible(data.eligible ?? []);
      setRepeatOffenders(data.repeatOffenders ?? []);
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function handleRun() {
    if (
      !window.confirm(
        `Կիրառե՞լ ստուգումը ${eligible.length} մրցույթի վրա (կարգավիճակ, գնահատական, նախազգուշացում)։`,
      )
    ) {
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tenders/expired-unawarded", {
        method: "POST",
      });
      const data = (await res.json()) as RunResult & { error?: string };
      if (!res.ok) {
        setError("Չհաջողվեց կատարել ստուգումը։");
        return;
      }
      setLastResult(data);
      setRepeatOffenders(data.repeatOffenders ?? []);
      await loadPreview();
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void loadPreview()}
          disabled={loading || running}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Թարմացնել
        </button>
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={loading || running || eligible.length === 0}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Գործարկել ստուգումը
        </button>
        <span className="text-sm font-semibold text-slate-600">
          {loading
            ? "Բեռնվում է…"
            : `${eligible.length} մրցույթ սպասում է մշակման`}
        </span>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {lastResult ? (
        <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
          <p className="text-sm font-black text-emerald-900">
            Մշակված՝ {lastResult.processed.length} / սկանավորված՝{" "}
            {lastResult.scanned}
            {lastResult.skipped.length > 0
              ? ` · բաց թողնված՝ ${lastResult.skipped.length}`
              : ""}
          </p>
        </div>
      ) : null}

      <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-black text-slate-950">
          Կրկնվող խախտում (≥2 անգամ)
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Հայտարարողներ, ովքեր արդեն ունեն 2+ «Ժամկետանց · կատարող չընտրված»
          մրցույթ։ Կարգելափակումը կատարեք ձեռքով օգտատերերի էջից։
        </p>

        {repeatOffenders.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Դեռ այդպիսի օգտատերեր չկան։
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {repeatOffenders.map((row) => (
              <li
                key={row.clientId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3 ring-1 ring-orange-200"
              >
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {row.name?.trim() || row.email}
                  </p>
                  <p className="text-xs font-semibold text-slate-600">
                    {row.email}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-orange-800">
                    խախտումներ՝ {row.violationCount} · մրցույթներ՝{" "}
                    {row.tenderIds.map((id) => id.slice(-6)).join(", ")}
                  </p>
                </div>
                <Link
                  href={`${ROUTES.admin.users}?q=${encodeURIComponent(row.email)}`}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Օգտատեր
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            Սպասող ակտիվ մրցույթներ
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            ACTIVE · endsAt &gt;1 օր առաջ · ≥3 վճարովի դիմում · կատարող չընտրված
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        ) : eligible.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
            Այս պահին պայմաններին համապատասխան մրցույթ չկա։
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eligible.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950">{row.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-600">
                    {row.client.name?.trim() || row.client.email} ·{" "}
                    {row.paidBidCount} դիմում
                  </p>
                  {row.endsAt ? (
                    <p className="mt-1 text-[10px] font-semibold text-slate-400">
                      Ավարտ՝ {formatDateTime(row.endsAt)}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={ROUTES.tenderDetail(row.id)}
                  className="shrink-0 text-xs font-black text-amber-800 underline"
                >
                  Մրցույթ
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <p className="text-xs font-semibold leading-relaxed text-amber-950">
          Մեկ սեղմումով՝ մրցույթը դառնում է EXPIRED_UNAWARDED, հայտարարողին
          ավելանում է հարթակի կարծիք (1/5), ուղարկվում է նախազգուշացում (կայք,
          Telegram, Email)։
        </p>
      </div>
    </div>
  );
}
