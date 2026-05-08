"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  PenLine,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LocationPicker } from "@/components/location-picker";
import {
  selectionKey,
  ServicePicker,
  type ServiceSelection,
} from "@/components/service-picker";
import type { LocationPickerOption } from "@/lib/locations-data";
import { ROUTES } from "@/lib/routes";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import { toastError, toastSuccess } from "@/lib/toast";

const STEPS = [
  { id: 1 as const, title: "Ծառայություն", description: "Ի՞նչ ծառայության կարիք ունեք" },
  {
    id: 2 as const,
    title: "Մանրամասներ",
    description: "Նկարագրություն, նկարներ, փաստաթղթեր",
  },
  { id: 3 as const, title: "Պայմաններ", description: "Բյուջե, գտնվելու վայր, ժամկետ" },
  { id: 4 as const, title: "Ստուգում", description: "Վերանայում և հրապարակում" },
];

const DURATION_PRESETS = [
  { value: 3, label: "3 օր" },
  { value: 7, label: "7 օր" },
  { value: 14, label: "14 օր" },
  { value: 21, label: "21 օր" },
  { value: 30, label: "30 օր" },
];

const MAX_IMAGES = 6;
const MIN_IMAGES = 1;
const MAX_DOCUMENTS = 5;
const MAX_SELECTED_SERVICES = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const TITLE_MIN = 10;
const TITLE_MAX = 150;
const DESCRIPTION_MIN = 200;
const DESCRIPTION_MAX = 5000;

const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
] as const;

const ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

type ImagePreview = {
  id: string;
  file: File;
  url: string;
};

type DocumentPreview = {
  id: string;
  file: File;
};

function isAllowedDocumentFile(file: File): boolean {
  if (file.type && ALLOWED_DOCUMENT_MIME.has(file.type)) {
    return true;
  }
  const lower = file.name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot) : "";
  return (ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext);
}

type CreateTenderFormProps = {
  categories: ServiceCategoryWithServices[];
  locationOptions: LocationPickerOption[];
};

export function CreateTenderForm({
  categories,
  locationOptions,
}: CreateTenderFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [services, setServices] = useState<ServiceSelection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("");
  const [address, setAddress] = useState("");
  const [durationDays, setDurationDays] = useState<number>(7);
  const [isBlindBidding, setIsBlindBidding] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"publish" | "draft" | null>(null);

  const [suggestions, setSuggestions] = useState<{
    titles: string[];
    title: string;
    description: string;
    checklist: string[];
    source: "static";
    loading: boolean;
    key: string | null;
  }>({
    titles: [],
    title: "",
    description: "",
    checklist: [],
    source: "static",
    loading: false,
    key: null,
  });

  // AI suggestions removed.

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [images]);

  // Title is always user-entered (no auto-fill from selected service).

  useEffect(() => {
    if (services.length === 0) {
      setSuggestions({
        titles: [],
        title: "",
        description: "",
        checklist: [],
        source: "static",
        loading: false,
        key: null,
      });
    }
  }, [services.length]);

  const titleLength = title.trim().length;
  const descriptionLength = description.trim().length;

  const stepValidations = useMemo(() => {
    const stepOneValid =
      services.length >= 1 &&
      services.length <= MAX_SELECTED_SERVICES &&
      titleLength >= TITLE_MIN &&
      titleLength <= TITLE_MAX;
    const stepTwoValid =
      descriptionLength >= DESCRIPTION_MIN &&
      descriptionLength <= DESCRIPTION_MAX &&
      images.length >= MIN_IMAGES &&
      images.length <= MAX_IMAGES &&
      documents.length <= MAX_DOCUMENTS;
    const min = budgetMin ? Number(budgetMin.replace(/\s/g, "")) : null;
    const max = budgetMax ? Number(budgetMax.replace(/\s/g, "")) : null;
    const budgetValid =
      (min === null || (Number.isFinite(min) && min >= 0)) &&
      (max === null || (Number.isFinite(max) && max >= 0)) &&
      (min === null || max === null || min <= max);
    const stepThreeValid =
      budgetValid &&
      durationDays >= 1 &&
      durationDays <= 90 &&
      selectedLocationId !== null;

    return { stepOneValid, stepTwoValid, stepThreeValid };
  }, [
    services,
    titleLength,
    descriptionLength,
    images.length,
    documents.length,
    budgetMin,
    budgetMax,
    durationDays,
    selectedLocationId,
  ]);

  function goNext() {
    setError(null);
    if (step === 1 && !stepValidations.stepOneValid) {
      setError(
        `Ընտրեք 1–${MAX_SELECTED_SERVICES} ծառայություն և լրացրեք վերնագիրը։`,
      );
      return;
    }
    if (step === 2 && !stepValidations.stepTwoValid) {
      if (descriptionLength < DESCRIPTION_MIN || descriptionLength > DESCRIPTION_MAX) {
        setError(`Նկարագրությունը պետք է լինի առնվազն ${DESCRIPTION_MIN} և ամենաշատը ${DESCRIPTION_MAX} նիշ։`);
      } else if (images.length < MIN_IMAGES) {
        setError(`Ավելացրեք առնվազն ${MIN_IMAGES} լուսանկար։`);
      } else if (documents.length > MAX_DOCUMENTS) {
        setError(`Փաստաթղթեր՝ ամենաշատը ${MAX_DOCUMENTS} ֆայլ։`);
      } else {
        setError("Ստուգեք քայլի տվյալները։");
      }
      return;
    }
    if (step === 3 && !stepValidations.stepThreeValid) {
      if (selectedLocationId === null) {
        setError("Ընտրեք բնակավայրը (մարզ և քաղաք/գյուղ)։");
      } else {
        setError("Ստուգեք բյուջեն և ժամկետը։");
      }
      return;
    }
    if (step < 4) {
      setStep((current) => (current + 1) as typeof step);
    }
  }

  function goBack() {
    setError(null);
    if (step > 1) {
      setStep((current) => (current - 1) as typeof step);
    }
  }

  function handleAddFiles(files: FileList | null) {
    if (!files) {
      return;
    }
    const next: ImagePreview[] = [];
    let rejected = 0;
    for (const file of Array.from(files)) {
      if (images.length + next.length >= MAX_IMAGES) {
        break;
      }
      if (!file.type.startsWith("image/")) {
        rejected += 1;
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejected += 1;
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      });
    }
    if (rejected > 0) {
      setError(`${rejected} ֆայլ չընդունվեց (թույլատրված է միայն նկար մինչև 5 ՄԲ)։`);
    }
    if (next.length > 0) {
      setImages((current) => [...current, ...next]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return current.filter((image) => image.id !== id);
    });
  }

  function handleAddDocuments(files: FileList | null) {
    if (!files) {
      return;
    }
    const next: DocumentPreview[] = [];
    let rejected = 0;
    for (const file of Array.from(files)) {
      if (documents.length + next.length >= MAX_DOCUMENTS) {
        break;
      }
      if (!isAllowedDocumentFile(file)) {
        rejected += 1;
        continue;
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        rejected += 1;
        continue;
      }
      next.push({ id: crypto.randomUUID(), file });
    }
    if (rejected > 0) {
      setError(
        `${rejected} ֆայլ չընդունվեց․ թույլատրված են PDF, Word, Excel, TXT՝ մինչև 10 ՄԲ։`,
      );
    }
    if (next.length > 0) {
      setDocuments((current) => [...current, ...next]);
    }
    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  }

  function handleRemoveDocument(id: string) {
    setDocuments((current) => current.filter((doc) => doc.id !== id));
  }

  async function handleSubmit(mode: "publish" | "draft") {
    if (services.length === 0) {
      const msg = "Ընտրեք առնվազն մեկ ծառայություն։";
      setError(msg);
      toastError("Չի կարող ուղարկել", msg);
      setStep(1);
      return;
    }
    if (!stepValidations.stepOneValid) {
      const msg = "Ստուգեք ծառայությունները և վերնագիրը։";
      setError(msg);
      toastError("Ստուգեք քայլ 1", msg);
      setStep(1);
      return;
    }
    if (!stepValidations.stepTwoValid) {
      const msg = "Ստուգեք նկարագրությունը, լուսանկարները և փաստաթղթերը։";
      setError(msg);
      toastError("Ստուգեք քայլ 2", msg);
      setStep(2);
      return;
    }
    if (!stepValidations.stepThreeValid) {
      const msg = "Ստուգեք բյուջեն, ժամկետը և բնակավայրը։";
      setError(msg);
      toastError("Ստուգեք քայլ 3", msg);
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    setSubmitMode(mode);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("services", JSON.stringify(services));
      formData.append("locationId", String(selectedLocationId));
      if (address.trim()) formData.append("address", address.trim());
      if (budgetMin.trim()) formData.append("budgetMin", budgetMin.replace(/\s/g, ""));
      if (budgetMax.trim()) formData.append("budgetMax", budgetMax.replace(/\s/g, ""));
      formData.append("durationDays", String(durationDays));
      formData.append("isBlindBidding", String(isBlindBidding));
      formData.append("publish", String(mode === "publish"));
      images.forEach((image) => {
        formData.append("images", image.file);
      });
      documents.forEach((doc) => {
        formData.append("documents", doc.file);
      });

      const response = await fetch("/api/tenders", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { tender?: { id: string }; error?: string }
        | null;

      if (!response.ok || !payload?.tender) {
        if (payload?.error === "COMPANY_PROFILE_REQUIRED") {
          const msg =
            "Շարունակելու համար լրացրեք ընկերության տվյալները (տիպ ու ընկերության տվյալներ)։";
          setError(msg);
          toastError("Պահանջվում է ընկերության պրոֆիլ", msg);
          router.push(`${ROUTES.accountSettings}#company`);
          return;
        }
        const message = payload?.error
          ? mapErrorMessage(payload.error)
          : "Չհաջողվեց հրապարակել մրցույթը։";
        throw new Error(message);
      }

      toastSuccess(
        mode === "publish" ? "Մրցույթը հրապարակվեց" : "Սևագիրը պահպանվեց",
        mode === "publish"
          ? "Մրցույթը հասանելի է հարթակում։"
          : "Կարող եք շարունակել խմբագրումը «Իմ մրցույթներ» բաժնում։",
      );
      router.push(ROUTES.account);
      router.refresh();
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Չհաջողվեց հրապարակել մրցույթը։";
      setError(message);
      toastError("Չհաջողվեց", message);
      setIsSubmitting(false);
      setSubmitMode(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        <Stepper currentStep={step} />

        {error ? (
          <div className="rounded-3xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        ) : null}

        <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
          {step === 1 ? (
            <StepOne
              categories={categories}
              services={services}
              onServicesChange={setServices}
              title={title}
              onTitleChange={setTitle}
              suggestions={suggestions}
            />
          ) : null}

          {step === 2 ? (
            <StepTwo
              services={services}
              tenderTitle={title}
              description={description}
              onDescriptionChange={setDescription}
              images={images}
              onAddFiles={handleAddFiles}
              onRemoveImage={handleRemoveImage}
              fileInputRef={fileInputRef}
              documents={documents}
              onAddDocuments={handleAddDocuments}
              onRemoveDocument={handleRemoveDocument}
              documentInputRef={documentInputRef}
              suggestions={suggestions}
            />
          ) : null}

          {step === 3 ? (
            <StepThree
              budgetMin={budgetMin}
              budgetMax={budgetMax}
              onBudgetMinChange={setBudgetMin}
              onBudgetMaxChange={setBudgetMax}
              locationOptions={locationOptions}
              selectedLocationId={selectedLocationId}
              selectedLocationLabel={selectedLocationLabel}
              onLocationChange={(id, label) => {
                setSelectedLocationId(id);
                setSelectedLocationLabel(label);
              }}
              address={address}
              onAddressChange={setAddress}
              durationDays={durationDays}
              onDurationChange={setDurationDays}
              isBlindBidding={isBlindBidding}
              onBlindBiddingChange={setIsBlindBidding}
            />
          ) : null}

          {step === 4 ? (
            <StepFour
              services={services}
              title={title}
              description={description}
              images={images}
              documents={documents}
              budgetMin={budgetMin}
              budgetMax={budgetMax}
              selectedLocationLabel={selectedLocationLabel}
              address={address}
              durationDays={durationDays}
              isBlindBidding={isBlindBidding}
              onJumpToStep={(target) => setStep(target)}
            />
          ) : null}

          <div className="mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="size-4" />
              Հետ
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Շարունակել
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleSubmit("draft")}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && submitMode === "draft" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PenLine className="size-4" />
                  )}
                  Պահպանել որպես սևագիր
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit("publish")}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && submitMode === "publish" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Հրապարակել մրցույթը
                </button>
              </div>
            )}
          </div>
        </article>
      </div>

      <SidebarTips step={step} />
    </div>
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Անհրաժեշտ է մուտք գործել։";
    case "TELEGRAM_REQUIRED":
      return "Մրցույթ տեղադրելու համար նախ ավարտեք Telegram վերիֆիկացիան։";
    case "BLOCKED":
      return "Հաշիվը արգելափակված է։";
    case "COMPANY_PROFILE_REQUIRED":
      return "Շարունակելու համար լրացրեք ընկերության տվյալները հաշվի կարգավորումներում։";
    case "VALIDATION_FAILED":
      return "Տվյալները թերի կամ սխալ են։";
    case "INVALID_SERVICES":
      return `Ստուգեք ընտրված ծառայությունները (1–${MAX_SELECTED_SERVICES}, առանց կրկնության)։`;
    case "DUPLICATE_SERVICE":
      return "Նույն ծառայությունը երկու անգամ ընտրված է։";
    case "TOO_MANY_IMAGES":
      return "Թույլատրված է առավելագույնը 6 լուսանկար։";
    case "INVALID_IMAGE":
      return "Անվավեր նկար (թույլատրված ՝ JPG, PNG, WEBP՝ մինչև 5 ՄԲ)։";
    case "TOO_FEW_IMAGES":
      return `Անհրաժեշտ է առնվազն ${MIN_IMAGES} լուսանկար։`;
    case "INVALID_DOCUMENT":
      return "Անվավեր փաստաթուղթ․ թույլատրված են PDF, Word, Excel, TXT՝ մինչև 10 ՄԲ։";
    case "TOO_MANY_DOCUMENTS":
      return `Փաստաթղթերի առավելագույն թիվը՝ ${MAX_DOCUMENTS}։`;
    case "LOCATION_REQUIRED":
      return "Ընտրեք բնակավայրը։";
    case "INVALID_LOCATION":
      return "Ընտրված բնակավայրը այլևս անվավեր է։ Թարմացրեք էջը և ընտրեք նորից։";
    default:
      return "Չհաջողվեց հրապարակել մրցույթը։";
  }
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-stretch gap-2 overflow-x-auto rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
      {STEPS.map((stepItem) => {
        const isActive = stepItem.id === currentStep;
        const isComplete = stepItem.id < currentStep;
        return (
          <li key={stepItem.id} className="flex-1 min-w-[120px]">
            <div
              className={`flex h-full items-center gap-3 rounded-2xl px-3 py-2 transition ${
                isActive
                  ? "bg-slate-950 text-white"
                  : isComplete
                    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                    : "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
              }`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                  isActive
                    ? "bg-amber-400 text-slate-950"
                    : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {isComplete ? <Check className="size-4" /> : stepItem.id}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-[0.16em]">
                  Քայլ {stepItem.id}
                </p>
                <p className="truncate text-sm font-black">{stepItem.title}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type SuggestionsState = {
  titles: string[];
  title: string;
  description: string;
  checklist: string[];
  source: "static";
  loading: boolean;
};

function StepOne({
  categories,
  services,
  onServicesChange,
  title,
  onTitleChange,
  suggestions: _suggestions,
}: {
  categories: ServiceCategoryWithServices[];
  services: ServiceSelection[];
  onServicesChange: (values: ServiceSelection[]) => void;
  title: string;
  onTitleChange: (value: string) => void;
  suggestions: SuggestionsState;
}) {
  const [titleAiLoading, setTitleAiLoading] = useState(false);
  const titleLength = title.trim().length;
  const isTitleValid = titleLength >= TITLE_MIN && titleLength <= TITLE_MAX;
  void _suggestions;

  async function handleAiTitle() {
    if (services.length === 0) {
      toastError("Ծառայություն չկա", "Նախ ընտրեք առնվազն մեկ ծառայություն։");
      return;
    }
    const hadTitle = title.trim().length > 0;
    setTitleAiLoading(true);
    try {
      const res = await fetch("/api/tender-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services,
          ...(hadTitle ? { title: title.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { title?: string; error?: string };
      if (!res.ok) {
        const code = data.error ?? "";
        if (code === "UNAUTHENTICATED") {
          toastError("Չեղավ", "Անհրաժեշտ է մուտք գործել։");
        } else if (code === "AI_NOT_CONFIGURED") {
          toastError("AI-ը անջատված է", "Կարգավորված չէ գեներացիան (GEMINI_API_KEY)։");
        } else if (code === "MALFORMED_AI_RESPONSE") {
          toastError("Չհաջողվեց", "Մոդելը տվեց անսպասելի պատասխար։ Փորձեք կրկին։");
        } else {
          toastError("Չհաջողվեց", "Վերնագիրը չստացվեց։ Փորձեք կրկին։");
        }
        return;
      }
      if (typeof data.title === "string" && data.title.trim()) {
        onTitleChange(data.title.trim().slice(0, TITLE_MAX));
        toastSuccess(hadTitle ? "Վերնագիրը բարելավվեց" : "Վերնագիրը ստեղծվեց");
      } else {
        toastError("Չհաջողվեց", "Պատասխանը անսպասելի էր։");
      }
    } catch {
      toastError("Ցանցի սխալ", "Ստուգեք կապը և փորձեք կրկին։");
    } finally {
      setTitleAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Ի՞նչ ծառայությունների կարիք ունեք</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Կարող եք ընտրել մինչև {MAX_SELECTED_SERVICES} ծառայություն՝ նույն պատվերի համար կապված
          աշխատանքները մեկ մրցույթում համախմբելու համար։
        </p>
      </div>

      <div>
        <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Ծառայություններ ({services.length}/{MAX_SELECTED_SERVICES})
        </label>
        <div className="mt-2">
          <ServicePicker
            mode="multi"
            categories={categories}
            values={services}
            onValuesChange={onServicesChange}
            maxSelections={MAX_SELECTED_SERVICES}
          />
        </div>
        {services.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {services.map((item) => (
              <li key={selectionKey(item)}>
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-950 py-1 pl-3 pr-1 text-xs font-black text-white">
                  <span className="min-w-0 truncate">{item.service}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onServicesChange(
                        services.filter((entry) => selectionKey(entry) !== selectionKey(item)),
                      )
                    }
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                    aria-label="Հեռացնել"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label
            htmlFor="tender-title"
            className="text-xs font-black uppercase tracking-[0.18em] text-slate-500"
          >
            Վերնագիր
          </label>
          <button
            type="button"
            onClick={handleAiTitle}
            disabled={titleAiLoading || services.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {titleAiLoading ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5 shrink-0 text-amber-500" aria-hidden />
            )}
            {title.trim() ? "Բարելավել վերնագիր" : "Գեներացնել վերնագիր"}
          </button>
        </div>
        <input
          id="tender-title"
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={TITLE_MAX + 20}
          placeholder="Օր.՝ Բնակարանի վերանորոգում Կենտրոնում"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-slate-900"
        />
        <div className="mt-2 flex items-center justify-between text-xs font-semibold">
          <span className={isTitleValid ? "text-emerald-700" : "text-slate-500"}>
            {isTitleValid
              ? "Վերնագիրը կարգավորված է։"
              : `Նվազագույն ${TITLE_MIN} նիշ`}
          </span>
          <span className="text-slate-400">
            {titleLength}/{TITLE_MAX}
          </span>
        </div>

      </div>

    </div>
  );
}

function StepTwo({
  services,
  tenderTitle,
  description,
  onDescriptionChange,
  images,
  onAddFiles,
  onRemoveImage,
  fileInputRef,
  documents,
  onAddDocuments,
  onRemoveDocument,
  documentInputRef,
  suggestions,
}: {
  services: ServiceSelection[];
  tenderTitle: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  images: ImagePreview[];
  onAddFiles: (files: FileList | null) => void;
  onRemoveImage: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  documents: DocumentPreview[];
  onAddDocuments: (files: FileList | null) => void;
  onRemoveDocument: (id: string) => void;
  documentInputRef: React.RefObject<HTMLInputElement | null>;
  suggestions: SuggestionsState;
}) {
  const [descriptionAiLoading, setDescriptionAiLoading] = useState(false);
  const length = description.trim().length;
  const descOk = length >= DESCRIPTION_MIN && length <= DESCRIPTION_MAX;
  const photosOk = images.length >= MIN_IMAGES && images.length <= MAX_IMAGES;
  void suggestions;

  async function handleAiDescription() {
    if (services.length === 0) {
      toastError("Ծառայություն չկա", "Նախ ընտրեք ծառայություններ (քայլ 1)։");
      return;
    }
    const hadDraft = description.trim().length > 0;
    setDescriptionAiLoading(true);
    try {
      const res = await fetch("/api/tender-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "description",
          services,
          ...(tenderTitle.trim() ? { tenderTitle: tenderTitle.trim() } : {}),
          ...(hadDraft ? { currentDescription: description.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { description?: string; error?: string };
      if (!res.ok) {
        const code = data.error ?? "";
        if (code === "UNAUTHENTICATED") {
          toastError("Չեղավ", "Անհրաժեշտ է մուտք գործել։");
        } else if (code === "AI_NOT_CONFIGURED") {
          toastError("AI-ը անջատված է", "Կարգավորված չէ գեներացիան (GEMINI_API_KEY)։");
        } else if (code === "MALFORMED_AI_RESPONSE") {
          toastError("Չհաջողվեց", "Մոդելը տվեց անսպասելի պատասխար։ Փորձեք կրկին։");
        } else {
          toastError("Չհաջողվեց", "Նկարագրությունը չստացվեց։ Փորձեք կրկին։");
        }
        return;
      }
      if (typeof data.description === "string" && data.description.trim()) {
        onDescriptionChange(data.description.trim().slice(0, DESCRIPTION_MAX));
        toastSuccess(hadDraft ? "Նկարագրությունը բարելավվեց" : "Ֆորմայի նմուշը պատրաստ է");
      } else {
        toastError("Չհաջողվեց", "Պատասխանը անսպասելի էր։");
      }
    } catch {
      toastError("Ցանցի սխալ", "Ստուգեք կապը և փորձեք կրկին։");
    } finally {
      setDescriptionAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Մանրամասներ</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Նկարագրությունը պետք է լինի առնվազն {DESCRIPTION_MIN} նիշ։ Պարտադիր է առնվազն{" "}
          {MIN_IMAGES} լուսանկար։ Փաստաթղթերը ընտրանքային են։
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label
            htmlFor="tender-description"
            className="text-xs font-black uppercase tracking-[0.18em] text-slate-500"
          >
            Նկարագրություն
          </label>
          <button
            type="button"
            onClick={handleAiDescription}
            disabled={descriptionAiLoading || services.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {descriptionAiLoading ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5 shrink-0 text-amber-500" aria-hidden />
            )}
            {description.trim() ? "Բարելավել նկարագրություն" : "Գեներացնել ֆորմայի նմուշ"}
          </button>
        </div>
        <textarea
          id="tender-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          minLength={DESCRIPTION_MIN}
          maxLength={DESCRIPTION_MAX}
          rows={10}
          placeholder="Նկարագրեք առաջադրանքը մանրամասն՝ ինչ պետք է անել, որտեղ, նյութերը, սպասելի արդյունքը, հատուկ պահանջները։"
          className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
        />
        <div className="mt-2 flex items-center justify-between text-xs font-semibold">
          <span className={descOk ? "text-emerald-700" : "text-slate-500"}>
            {descOk
              ? "Նկարագրությունը կարգավորված է։"
              : length < DESCRIPTION_MIN
                ? `Մնացել է առնվազն ${DESCRIPTION_MIN - length} նիշ`
                : `Առավելագույնը ${DESCRIPTION_MAX} նիշ`}
          </span>
          <span className="text-slate-400">
            {length}/{DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Լուսանկարներ <span className="text-red-600">*</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Առնվազն {MIN_IMAGES}, մինչև {MAX_IMAGES} նկար · JPG, PNG, WEBP · մինչև 5 ՄԲ
            </p>
          </div>
          <p
            className={`text-xs font-black ${photosOk ? "text-emerald-700" : "text-amber-700"}`}
          >
            {images.length}/{MAX_IMAGES}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-slate-200"
            >
              <Image
                src={image.url}
                alt="Tender attachment"
                fill
                className="object-cover"
                sizes="(min-width: 640px) 200px, 50vw"
                unoptimized
              />
              <button
                type="button"
                onClick={() => onRemoveImage(image.id)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                aria-label="Հեռացնել"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          {images.length < MAX_IMAGES ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:-translate-y-0.5 hover:border-slate-950 hover:text-slate-950"
            >
              <Plus className="size-6" />
              <span className="text-xs font-black uppercase tracking-[0.18em]">
                Ավելացնել նկար
              </span>
            </button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => onAddFiles(event.target.files)}
          className="hidden"
        />
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Փաստաթղթեր <span className="font-semibold text-slate-400">(ընտրանքային)</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              PDF, Word, Excel, TXT · մինչև {MAX_DOCUMENTS} ֆայլ · մինչև 10 ՄԲ
            </p>
          </div>
          <p className="text-xs font-black text-slate-500">
            {documents.length}/{MAX_DOCUMENTS}
          </p>
        </div>

        <ul className="mt-3 space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-slate-500" />
                <span className="truncate text-xs font-bold text-slate-800">
                  {doc.file.name}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemoveDocument(doc.id)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-red-100 hover:text-red-700"
                aria-label="Հեռացնել"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        {documents.length < MAX_DOCUMENTS ? (
          <>
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-black text-slate-600 transition hover:border-slate-950 hover:text-slate-950 sm:w-auto sm:px-8"
            >
              <Plus className="size-4" />
              Կցել փաստաթուղթ
            </button>
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
              multiple
              onChange={(event) => onAddDocuments(event.target.files)}
              className="hidden"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function StepThree({
  budgetMin,
  budgetMax,
  onBudgetMinChange,
  onBudgetMaxChange,
  locationOptions,
  selectedLocationId,
  selectedLocationLabel,
  onLocationChange,
  address,
  onAddressChange,
  durationDays,
  onDurationChange,
  isBlindBidding,
  onBlindBiddingChange,
}: {
  budgetMin: string;
  budgetMax: string;
  onBudgetMinChange: (value: string) => void;
  onBudgetMaxChange: (value: string) => void;
  locationOptions: LocationPickerOption[];
  selectedLocationId: number | null;
  selectedLocationLabel: string;
  onLocationChange: (id: number | null, label: string) => void;
  address: string;
  onAddressChange: (value: string) => void;
  durationDays: number;
  onDurationChange: (value: number) => void;
  isBlindBidding: boolean;
  onBlindBiddingChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Պայմաններ</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Որոշեք բյուջեն, գտնվելու վայրը և մրցույթի ժամկետը։
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="size-4 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            Բյուջե (ոչ պարտադիր)
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <BudgetInput
            label="Նվազագույն"
            value={budgetMin}
            onChange={onBudgetMinChange}
            placeholder="50 000"
          />
          <BudgetInput
            label="Առավելագույն"
            value={budgetMax}
            onChange={onBudgetMaxChange}
            placeholder="200 000"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="size-4 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            Գտնվելու վայրը
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Մարզ և բնակավայր <span className="text-red-600">*</span>
            </label>
            <div className="mt-2">
              <LocationPicker
                options={locationOptions}
                valueId={selectedLocationId}
                label={selectedLocationLabel}
                onChange={onLocationChange}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Ամբողջ Հայաստանի մարզերը, քաղաքները և գյուղերը՝ համապատասխան տվյալների բազայից։
            </p>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="tender-address"
              className="text-xs font-black uppercase tracking-[0.16em] text-slate-500"
            >
              Հասցե (ոչ պարտադիր)
            </label>
            <input
              id="tender-address"
              type="text"
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="Փողոց, շենք, բնակարան"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="size-4 text-slate-500" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            Մրցույթի ժամկետ
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => {
            const isActive = preset.value === durationDays;
            return (
              <button
                type="button"
                key={preset.value}
                onClick={() => onDurationChange(preset.value)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label
            htmlFor="custom-days"
            className="text-xs font-black uppercase tracking-[0.16em] text-slate-500"
          >
            Կամ նշեք օրերի քանակը
          </label>
          <input
            id="custom-days"
            type="number"
            min={1}
            max={90}
            value={durationDays}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) {
                onDurationChange(Math.min(Math.max(next, 1), 90));
              }
            }}
            className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none transition focus:border-slate-900"
          />
          <span className="text-xs font-bold text-slate-500">օր (1–90)</span>
        </div>
      </section>

      <section className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
              <EyeOff className="size-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-950">Կույր մրցույթ</h3>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Մասնագետները չեն տեսնում միմյանց առաջարկները։ Արդարացի մրցակցություն և
                ավելի լավ գներ ձեզ համար։
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isBlindBidding}
            onClick={() => onBlindBiddingChange(!isBlindBidding)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
              isBlindBidding ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block size-5 transform rounded-full bg-white transition ${
                isBlindBidding ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}

function StepFour({
  services,
  title,
  description,
  images,
  documents,
  budgetMin,
  budgetMax,
  selectedLocationLabel,
  address,
  durationDays,
  isBlindBidding,
  onJumpToStep,
}: {
  services: ServiceSelection[];
  title: string;
  description: string;
  images: ImagePreview[];
  documents: DocumentPreview[];
  budgetMin: string;
  budgetMax: string;
  selectedLocationLabel: string;
  address: string;
  durationDays: number;
  isBlindBidding: boolean;
  onJumpToStep: (step: 1 | 2 | 3) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Վերանայել և հրապարակել</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Ստուգեք ամեն ինչ հրապարակումից առաջ։ Ցանկացած պահի կարող եք վերադառնալ ու խմբագրել։
        </p>
      </div>

      <ReviewSection
        title="Ծառայություններ"
        onEdit={() => onJumpToStep(1)}
      >
        <p className="text-base font-black text-slate-950">{title}</p>
        {services.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {services.map((item, index) => (
              <li
                key={selectionKey(item)}
                className="flex flex-wrap items-baseline gap-x-2 text-xs font-bold text-slate-600"
              >
                <span className="font-black text-slate-400">{index + 1}.</span>
                <span>{item.category}</span>
                <span className="text-slate-400">→</span>
                <span className="font-black text-slate-800">{item.service}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </ReviewSection>

      <ReviewSection
        title="Նկարագրություն"
        onEdit={() => onJumpToStep(2)}
      >
        <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-700">
          {description || "—"}
        </p>
        {images.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200"
              >
                <Image
                  src={image.url}
                  alt="Tender attachment"
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : null}
        {documents.length > 0 ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Փաստաթղթեր
            </p>
            <ul className="mt-2 space-y-1">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700"
                >
                  <FileText className="size-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{doc.file.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ReviewSection>

      <ReviewSection title="Պայմաններ" onEdit={() => onJumpToStep(3)}>
        <ul className="space-y-1.5 text-sm font-bold text-slate-700">
          <li>
            <span className="text-slate-500">Բյուջե: </span>
            {budgetMin || budgetMax
              ? `${budgetMin ? formatBudget(budgetMin) : "չնշված"} – ${
                  budgetMax ? formatBudget(budgetMax) : "չնշված"
                }`
              : "Համաձայնեցվում է"}
          </li>
          <li>
            <span className="text-slate-500">Բնակավայր: </span>
            {selectedLocationLabel || "չնշված"}
          </li>
          {address ? (
            <li>
              <span className="text-slate-500">Հասցե: </span>
              {address}
            </li>
          ) : null}
          <li>
            <span className="text-slate-500">Մրցույթի ժամկետ: </span>
            {durationDays} օր
          </li>
          <li>
            <span className="text-slate-500">Կույր մրցույթ: </span>
            {isBlindBidding ? "Միացված" : "Անջատված"}
          </li>
        </ul>
      </ReviewSection>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          <PenLine className="size-3" />
          Խմբագրել
        </button>
      </div>
      {children}
    </section>
  );
}

function BudgetInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d]/g, "");
            if (digits === "") {
              onChange("");
              return;
            }
            const formatted = Number(digits).toLocaleString("hy-AM");
            onChange(formatted);
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm font-black text-slate-900 outline-none transition focus:border-slate-900"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
          ֏
        </span>
      </div>
    </div>
  );
}

function formatBudget(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "—";
  return `${Number(digits).toLocaleString("hy-AM")} ֏`;
}

function SidebarTips({ step }: { step: number }) {
  const tipsByStep: Record<number, { title: string; body: string }[]> = {
    1: [
      {
        title: "Մի քանի կապված ծառայություն",
        body: `Օր.՝ ներկում + տաքահատակ — ընտրեք մինչև ${MAX_SELECTED_SERVICES} կապված մասնագիտություն, որպեսզի պատվերը լիարժեք ընդգրկված լինի։`,
      },
      {
        title: "Կարճ և կոնկրետ վերնագիր",
        body: "Օր.՝ «Բնակարանի վերանորոգում 50 մ²» — ավելի շատ առաջարկներ կբերի, քան «Վերանորոգում»։",
      },
    ],
    2: [
      {
        title: "Առնվազն 200 նիշ նկարագրություն",
        body: "Մանրամասն տեքստը փոխարինում է երկար զրույցներին ու օգնում է ստանալ հենց այն առաջարկը, որը ձեզ պետք է։",
      },
      {
        title: "Լուսանկարները պարտադիր են",
        body: "Առնվազն մեկ նկար՝ օբյեկտից կամ առաջադրանքից, որպեսզի մասնագետները ճիշտ գնահատեն ծավալը։ Կցեք նաև PDF կամ Word փաստաթղթեր՝ տեխնիկական առաջադրանք, աղյուսակներ և այլն։",
      },
    ],
    3: [
      {
        title: "Բնակավայր ընտրեք ցանկից",
        body: "Որոնման դաշտով արագ գտեք մարզը և քաղաքը կամ գյուղը՝ ամբողջ Հայաստանի պաշտոնական հասցեների բազայից։",
      },
      {
        title: "Չնշված բյուջեն խնդիր չէ",
        body: "Կարող եք բաց թողնել՝ մասնագետները կառաջարկեն իրենց գները։",
      },
      {
        title: "Կույր մրցույթ = ավելի լավ գներ",
        body: "Միացված վիճակում մասնագետները չեն տեսնում միմյանց առաջարկները ու չեն հարմարվում։",
      },
    ],
    4: [
      {
        title: "Հրապարակումից հետո",
        body: "Մրցույթը կհայտնվի ակտիվ ցանկում և կստանաք ծանուցումներ նոր առաջարկների մասին։",
      },
      {
        title: "Սևագիրը ապահով է",
        body: "Կարող եք պահպանել որպես սևագիր և վերադառնալ ավելի ուշ։",
      },
    ],
  };

  const tips = tipsByStep[step] ?? [];

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <div className="rounded-4xl bg-slate-950 p-5 text-white shadow-xl">
        <div className="flex items-center gap-2">
          <span className="size-4" />
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            Խորհուրդներ
          </p>
        </div>
        <ul className="mt-4 space-y-3">
          {tips.map((tip) => (
            <li key={tip.title} className="rounded-2xl bg-white/5 p-3">
              <p className="text-sm font-black">{tip.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-300">{tip.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-slate-500" />
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Մնացած քայլեր
          </p>
        </div>
        <ul className="mt-3 space-y-2 text-sm font-bold text-slate-700">
          {STEPS.map((stepItem) => {
            const status =
              stepItem.id < step ? "complete" : stepItem.id === step ? "active" : "pending";
            return (
              <li key={stepItem.id} className="flex items-center gap-3">
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-black ${
                    status === "complete"
                      ? "bg-emerald-500 text-white"
                      : status === "active"
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {status === "complete" ? <Check className="size-3" /> : stepItem.id}
                </span>
                <span
                  className={status === "active" ? "text-slate-950" : "text-slate-600"}
                >
                  {stepItem.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-2 rounded-3xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-900 ring-1 ring-amber-200">
        <X className="size-4 shrink-0 rotate-45 text-amber-700" />
        <span>Մրցույթ տեղադրելը անվճար է։ Վճարում են միայն մասնագետները՝ առաջարկ ուղարկելու համար։</span>
      </div>
    </aside>
  );
}
