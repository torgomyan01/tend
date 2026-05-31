"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Activity, Award, BarChart3, Heart, Star } from "lucide-react";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

ChartJS.defaults.font.family =
  "var(--font-roboto), Arial, Helvetica, sans-serif";
ChartJS.defaults.font.weight = 700;
ChartJS.defaults.color = "#64748b";

export type AnalyticsSlice = {
  label: string;
  value: number;
  color: string;
};

export type MonthlyActivity = {
  label: string;
  tenders: number;
  bids: number;
};

type Props = {
  monthly: MonthlyActivity[];
  tenderStatus: AnalyticsSlice[];
  bidStatus: AnalyticsSlice[];
  successRate: number;
  bidCount: number;
  wonBidCount: number;
  avgRating: number | null;
  ratingCount: number;
  likesCount: number;
  pendingReviews: number;
};

export function AccountAnalytics({
  monthly,
  tenderStatus,
  bidStatus,
  successRate,
  bidCount,
  wonBidCount,
  avgRating,
  ratingCount,
  likesCount,
  pendingReviews,
}: Props) {
  const ratePercent = Math.round(successRate * 100);

  const tendersTotal = tenderStatus.reduce((sum, s) => sum + s.value, 0);
  const bidsTotal = bidStatus.reduce((sum, s) => sum + s.value, 0);

  return (
    <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/80">
            <BarChart3 className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight">Անալիտիկա</h2>
            <p className="text-xs font-semibold text-slate-500">
              Ձեր ակտիվության ամբողջական պատկերը
            </p>
          </div>
        </div>
      </div>

      {/* TOP SUMMARY TILES */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          icon={Award}
          tone="emerald"
          value={`${ratePercent}%`}
          label="Հաղթանակների տոկոս"
          hint={`${wonBidCount}/${bidCount} առաջարկ`}
        />
        <SummaryTile
          icon={Star}
          tone="amber"
          value={avgRating !== null ? avgRating.toFixed(1) : "—"}
          label="Միջին գնահատական"
          hint={`${ratingCount} կարծիք`}
        />
        <SummaryTile
          icon={Heart}
          tone="rose"
          value={String(likesCount)}
          label="Հավանած մրցույթ"
          hint="Ձեր հետաքրքրությունները"
        />
        <SummaryTile
          icon={Activity}
          tone="sky"
          value={String(pendingReviews)}
          label="Մոդերացիայում"
          hint="Սպասվող կարծիքներ"
        />
      </div>

      {/* CHARTS GRID */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Monthly activity */}
        <div className="rounded-3xl bg-slate-50/80 p-5 ring-1 ring-slate-200/80 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Ակտիվությունը՝ ըստ ամիսների
            </p>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <LegendDot color="#0f172a" label="Մրցույթներ" />
              <LegendDot color="#f59e0b" label="Առաջարկներ" />
            </div>
          </div>
          <div className="mt-4 h-56 sm:h-64">
            <Line
              data={{
                labels: monthly.map((m) => m.label),
                datasets: [
                  {
                    label: "Մրցույթներ",
                    data: monthly.map((m) => m.tenders),
                    borderColor: "#0f172a",
                    backgroundColor: "rgba(15,23,42,0.08)",
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "#0f172a",
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2.5,
                  },
                  {
                    label: "Առաջարկներ",
                    data: monthly.map((m) => m.bids),
                    borderColor: "#f59e0b",
                    backgroundColor: "rgba(245,158,11,0.12)",
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "#f59e0b",
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2.5,
                  },
                ],
              }}
              options={lineOptions}
            />
          </div>
        </div>

        {/* Win rate gauge */}
        <div className="rounded-3xl bg-slate-50/80 p-5 ring-1 ring-slate-200/80">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Հաջողության ցուցանիշ
          </p>
          <div className="relative mx-auto mt-4 h-48 w-48">
            <Doughnut
              data={{
                labels: ["Հաղթած", "Մնացած"],
                datasets: [
                  {
                    data: [ratePercent, 100 - ratePercent],
                    backgroundColor: ["#10b981", "#e2e8f0"],
                    borderWidth: 0,
                    circumference: 360,
                  },
                ],
              }}
              options={gaugeOptions}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black tabular-nums text-slate-900">
                {ratePercent}%
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {wonBidCount} հաղթանակ
              </span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-slate-500">
            Ընդունված առաջարկներ ընդհանուրի համեմատ
          </p>
        </div>

        {/* Bids by status */}
        <div className="rounded-3xl bg-slate-50/80 p-5 ring-1 ring-slate-200/80">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Առաջարկներ՝ ըստ կարգավիճակի
          </p>
          {bidsTotal === 0 ? (
            <EmptyChart label="Դեռ առաջարկ չկա" />
          ) : (
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-40 w-40 shrink-0">
                <Doughnut
                  data={buildDoughnut(bidStatus)}
                  options={doughnutOptions}
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black tabular-nums text-slate-900">
                    {bidsTotal}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    ընդամենը
                  </span>
                </div>
              </div>
              <SliceLegend items={bidStatus} total={bidsTotal} />
            </div>
          )}
        </div>
      </div>

      {/* Tenders by status - full width bar */}
      <div className="mt-4 rounded-3xl bg-slate-50/80 p-5 ring-1 ring-slate-200/80">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          Մրցույթներ՝ ըստ կարգավիճակի
        </p>
        {tendersTotal === 0 ? (
          <EmptyChart label="Դեռ մրցույթ չկա" />
        ) : (
          <div className="mt-4 h-52">
            <Bar
              data={{
                labels: tenderStatus.map((s) => s.label),
                datasets: [
                  {
                    label: "Մրցույթներ",
                    data: tenderStatus.map((s) => s.value),
                    backgroundColor: tenderStatus.map((s) => s.color),
                    borderRadius: 10,
                    maxBarThickness: 56,
                  },
                ],
              }}
              options={barOptions}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function buildDoughnut(slices: AnalyticsSlice[]) {
  return {
    labels: slices.map((s) => s.label),
    datasets: [
      {
        data: slices.map((s) => s.value),
        backgroundColor: slices.map((s) => s.color),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };
}

function SliceLegend({
  items,
  total,
}: {
  items: AnalyticsSlice[];
  total: number;
}) {
  return (
    <ul className="min-w-0 flex-1 space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="min-w-0 flex-1 truncate font-semibold text-slate-600">
            {item.label}
          </span>
          <span className="shrink-0 font-black tabular-nums text-slate-900">
            {item.value}
          </span>
          <span className="w-9 shrink-0 text-right text-[10px] font-bold text-slate-400">
            {total > 0 ? Math.round((item.value / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function SummaryTile({
  icon: Icon,
  tone,
  value,
  label,
  hint,
}: {
  icon: typeof Award;
  tone: "emerald" | "amber" | "rose" | "sky";
  value: string;
  label: string;
  hint: string;
}) {
  const toneClass = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-600",
    sky: "bg-sky-100 text-sky-700",
  }[tone];

  return (
    <div className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-200/80">
      <span className={`grid size-9 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-black text-slate-600">{label}</p>
      <p className="text-[11px] font-semibold text-slate-400">{hint}</p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60">
      <p className="text-xs font-bold text-slate-400">{label}</p>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#0f172a",
  padding: 12,
  cornerRadius: 12,
  titleFont: { weight: 700 as const, size: 12 },
  bodyFont: { weight: 600 as const, size: 12 },
  displayColors: true,
  boxPadding: 4,
};

const lineOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: tooltipStyle,
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: 700 } },
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0, font: { size: 11, weight: 700 } },
      grid: { color: "rgba(148,163,184,0.18)" },
      border: { display: false },
    },
  },
};

const barOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: tooltipStyle,
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: 700 } },
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0, font: { size: 11, weight: 700 } },
      grid: { color: "rgba(148,163,184,0.18)" },
      border: { display: false },
    },
  },
};

const doughnutOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: { display: false },
    tooltip: tooltipStyle,
  },
};

const gaugeOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "78%",
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
};
