"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const featuredTenders = [
  {
    title: "Վերանորոգել բնակարան Կենտրոնում",
    timeLeft: "02:14:39",
    tags: ["Ներկում", "Սալիկ", "Էլ․ աշխատանք"],
    offers: 12,
    bidders: ["Ա", "Մ", "Կ", "+9"],
    notes: [
      "Գինը փակ է մինչև վերջնաժամկետը",
      "Մասնագետի դրամապանակից պահվել է 1000 ֏",
      "Պատվիրատուն բոլոր առաջարկները կտեսնի դիտարկման փուլում",
    ],
  },
  {
    title: "Կայքի պատրաստում փոքր բիզնեսի համար",
    timeLeft: "05:42:18",
    tags: ["Վեբ կայք", "Դիզայն", "SEO"],
    offers: 18,
    bidders: ["Ն", "Վ", "Ս", "+15"],
    notes: [
      "Առաջարկների գները փակ են մասնագետների համար",
      "Աշխատանքի ժամկետը նշվում է յուրաքանչյուր առաջարկում",
      "Հաղթողին ընտրելուց հետո բացվում է պայմանագրի փուլը",
    ],
  },
  {
    title: "Տեղադրել ջեռուցման համակարգ առանձնատանը",
    timeLeft: "11:08:04",
    tags: ["Ջեռուցում", "Խողովակներ", "Երաշխիք"],
    offers: 9,
    bidders: ["Հ", "Գ", "Տ", "+6"],
    notes: [
      "Ստուգված մասնագետները ստանում են վստահության նշան",
      "Պատվիրատուն տեսնում է փորձը, գինը և ժամկետը",
      "Ավարտից հետո երկու կողմերն էլ թողնում են գնահատական",
    ],
  },
];

export function FeaturedTenderSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTender = featuredTenders[activeIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        currentIndex === featuredTenders.length - 1 ? 0 : currentIndex + 1,
      );
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="rounded-4xl border border-white/70 bg-white/80 p-3 shadow-2xl shadow-slate-950/10 backdrop-blur sm:p-4">
      <div className="overflow-hidden rounded-4xl bg-slate-950 p-4 text-white sm:p-5">
        <div
          key={activeTender.title}
          className="animate-[tender-slide-in_600ms_ease-out]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Ամենաակտիվ մրցույթ
              </p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">
                {activeTender.title}
              </h2>
            </div>
            <div className="w-fit shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-left sm:text-right">
              <p className="text-xs text-slate-300">մնում է</p>
              <p className="font-black text-amber-200">
                {activeTender.timeLeft}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:grid-cols-3 sm:gap-3">
            {activeTender.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/10 px-3 py-2 text-center text-xs font-bold text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-3xl bg-white p-4 text-slate-950 sm:mt-6 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Փակ առաջարկներ
                </p>
                <p className="mt-1 text-2xl font-black sm:text-3xl">
                  {activeTender.offers} առաջարկ
                </p>
              </div>
              <div className="flex -space-x-3">
                {activeTender.bidders.map((item) => (
                  <span
                    key={item}
                    className="grid size-10 place-items-center rounded-full border-2 border-white bg-amber-100 text-sm font-black text-amber-900 sm:size-11"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {activeTender.notes.map((item) => (
                <div
                  key={item}
                className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 sm:items-center"
                >
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {featuredTenders.map((tender, index) => (
            <button
              key={tender.title}
              type="button"
              aria-label={`${index + 1}-րդ ակտիվ մրցույթը`}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === activeIndex
                  ? "w-8 bg-amber-300"
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
