"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

export type TenderGalleryImage = {
  id: string;
  url: string;
  alt: string | null;
};

type Props = {
  images: TenderGalleryImage[];
};

export function TenderDetailImageGallery({ images }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);

  useEffect(() => {
    if (openIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (images.length <= 1) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setOpenIndex((i) =>
          i === null ? null : (i - 1 + images.length) % images.length,
        );
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openIndex, close, images.length]);

  if (images.length === 0) return null;

  const current = openIndex !== null ? images[openIndex] : null;
  const showNav = images.length > 1;

  function goPrev(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setOpenIndex((i) =>
      i === null ? null : (i - 1 + images.length) % images.length,
    );
  }

  function goNext(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
  }

  return (
    <>
      <div className="grid gap-2 border-b border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
        {images.map((img, index) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group overflow-hidden rounded-2xl text-left ring-1 ring-slate-200 transition hover:ring-amber-300/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? ""}
              className="aspect-4/3 w-full object-cover transition group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>

      {current ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-black/88 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Մեծ նկար"
          onClick={close}
        >
          <div
            className="flex shrink-0 justify-end p-3 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              aria-label="Փակել"
            >
              <X className="size-6" />
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-10 sm:pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.alt ?? ""}
              className="max-h-[min(85vh,calc(100dvh-7rem))] max-w-[min(96vw,1200px)] object-contain shadow-2xl"
            />

            {showNav ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:left-4 sm:size-12"
                  aria-label="Նախորդ նկար"
                >
                  <ChevronLeft className="size-7 sm:size-8" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:right-4 sm:size-12"
                  aria-label="Հաջորդ նկար"
                >
                  <ChevronRight className="size-7 sm:size-8" />
                </button>
                <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">
                  {(openIndex ?? 0) + 1} / {images.length}
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
