"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  ListOrdered,
  Loader2,
  MapPin,
  PenLine,
  Plus,
  Send,
  Trash2,
  Wallet,
  Wand2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocationPicker } from "@/components/location-picker";
import {
  selectionKey,
  ServicePicker,
  type ServiceSelection,
} from "@/components/service-picker";
import type { LocationPickerOption } from "@/lib/locations-data";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import { toastError, toastSuccess } from "@/lib/toast";

export type CreateTenderInitialDraft = {
  id: string;
  title: string;
  description: string;
  services: ServiceSelection[];
  budgetMin: string;
  budgetMax: string;
  locationId: number | null;
  locationLabel: string;
  address: string;
  durationDays: number;
  wizardStep: number;
  isBlindBidding: boolean;
  images: { id: string; url: string }[];
  documents: { id: string; url: string; originalFileName: string }[];
  /** Խմբարկման էջ՝ սերվերից */
  tenderStatus?: "DRAFT" | "REVIEW" | "ACTIVE";
  endsAtIso?: string | null;
};

type WizardStep =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10;

const STEPS = [
  { id: 1 as const, title: "Ծառայություն", description: "Ի՞նչ ծառայությա՞ն կարիք ունեք" },
  {
    id: 2 as const,
    title: "Վերնագիր",
    description: "Գրեք ձեր մրցույթի հայտարարման կարիքները",
  },
  { id: 3 as const, title: "Նկարագրություն", description: "Առաջադրանքի մանրամասները" },
  { id: 4 as const, title: "Նկարներ և ֆայլեր", description: "Լուսանկարներ, փաստաթղթեր" },
  { id: 5 as const, title: "Բյուջե", description: "Գների միջակայք կամ ընտրանքային" },
  {
    id: 6 as const,
    title: "Գտնվելու վայրը",
    description: "Մարզ ու բնակավայր",
  },
  { id: 7 as const, title: "Հասցե", description: "Մանրամասն հասցե (ընտրանքային)" },
  { id: 8 as const, title: "Մրցույթի ժամկետ", description: "Օրերի քանակ ու կույր մրցույթ" },
  { id: 9 as const, title: "Նախադիտում", description: "Վերջին ստուգում ու հաստատում" },
  { id: 10 as const, title: "Պատասխանատվություն", description: "Հաստատեք պայմանները" },
] as const;

const TOTAL_STEPS = STEPS.length as 10;

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

type RemoteImage = { id: string; url: string };
type RemoteDocument = { id: string; url: string; name: string };

type CreateTenderFormProps = {
  categories: ServiceCategoryWithServices[];
  locationOptions: LocationPickerOption[];
  initialDraft?: CreateTenderInitialDraft | null;
  /** `edit`՝ /tenders/[id]/edit, `create`՝ /tenders/new */
  variant?: "create" | "edit";
};

export function CreateTenderForm({
  categories,
  locationOptions,
  initialDraft = null,
  variant = "create",
}: CreateTenderFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [services, setServices] = useState<ServiceSelection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [remoteImages, setRemoteImages] = useState<RemoteImage[]>([]);
  const [pendingImages, setPendingImages] = useState<ImagePreview[]>([]);
  const [remoteDocuments, setRemoteDocuments] = useState<RemoteDocument[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<DocumentPreview[]>([]);
  const [draftTenderId, setDraftTenderId] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const persistLockRef = useRef(false);
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
  const [liveTenderStatus, setLiveTenderStatus] = useState<
    "DRAFT" | "REVIEW" | "ACTIVE"
  >("DRAFT");

  useEffect(() => {
    if (!initialDraft || hydratedRef.current) {
      return;
    }
    hydratedRef.current = true;
    setDraftTenderId(initialDraft.id);
    setLiveTenderStatus(initialDraft.tenderStatus ?? "DRAFT");
    setServices(initialDraft.services);
    setTitle(initialDraft.title);
    setDescription(initialDraft.description);
    setRemoteImages(initialDraft.images.map((im) => ({ id: im.id, url: im.url })));
    setRemoteDocuments(
      initialDraft.documents.map((d) => ({
        id: d.id,
        url: d.url,
        name: d.originalFileName,
      })),
    );
    setBudgetMin(initialDraft.budgetMin);
    setBudgetMax(initialDraft.budgetMax);
    setSelectedLocationId(initialDraft.locationId);
    setSelectedLocationLabel(initialDraft.locationLabel);
    setAddress(initialDraft.address);
    setDurationDays(initialDraft.durationDays);
    setIsBlindBidding(initialDraft.isBlindBidding);
    const s = Math.min(Math.max(initialDraft.wizardStep, 1), TOTAL_STEPS) as WizardStep;
    setStep(s);
  }, [initialDraft]);

  useEffect(() => {
    return () => {
      pendingImages.forEach((image) => URL.revokeObjectURL(image.url));
    };
  }, [pendingImages]);

  const titleLength = title.trim().length;
  const descriptionLength = description.trim().length;
  const totalImageCount = remoteImages.length + pendingImages.length;
  const totalDocumentCount = remoteDocuments.length + pendingDocuments.length;

  const stepValidations = useMemo(() => {
    const stepOneValid =
      services.length >= 1 && services.length <= MAX_SELECTED_SERVICES;
    const stepTwoValid =
      titleLength >= TITLE_MIN && titleLength <= TITLE_MAX;
    const stepThreeValid =
      descriptionLength >= DESCRIPTION_MIN &&
      descriptionLength <= DESCRIPTION_MAX;
    const stepFourValid =
      totalImageCount >= MIN_IMAGES &&
      totalImageCount <= MAX_IMAGES &&
      totalDocumentCount <= MAX_DOCUMENTS;
    const min = budgetMin ? Number(budgetMin.replace(/\s/g, "")) : null;
    const max = budgetMax ? Number(budgetMax.replace(/\s/g, "")) : null;
    const budgetValid =
      (min === null || (Number.isFinite(min) && min >= 0)) &&
      (max === null || (Number.isFinite(max) && max >= 0)) &&
      (min === null || max === null || min <= max);
    const stepFiveValid = budgetValid;
    const stepSixValid = selectedLocationId !== null;
    const stepSevenValid = true;
    const stepEightValid = durationDays >= 1 && durationDays <= 90;

    return {
      stepOneValid,
      stepTwoValid,
      stepThreeValid,
      stepFourValid,
      stepFiveValid,
      stepSixValid,
      stepSevenValid,
      stepEightValid,
    };
  }, [
    services,
    titleLength,
    descriptionLength,
    totalImageCount,
    totalDocumentCount,
    budgetMin,
    budgetMax,
    durationDays,
    selectedLocationId,
  ]);

  function goNext() {
    setError(null);
    if (step === 1 && !stepValidations.stepOneValid) {
      setError(`Ընտրեք 1–${MAX_SELECTED_SERVICES} ծառայություն։`);
      return;
    }
    if (step === 2 && !stepValidations.stepTwoValid) {
      setError(
        `Վերնագիրը պետք է լինի առնվազն ${TITLE_MIN} և ամենաշատը ${TITLE_MAX} նիշ։`,
      );
      return;
    }
    if (step === 3 && !stepValidations.stepThreeValid) {
      setError(
        `Նկարագրությունը պետք է լինի առնվազն ${DESCRIPTION_MIN} և ամենաշատը ${DESCRIPTION_MAX} նիշ։`,
      );
      return;
    }
    if (step === 4 && !stepValidations.stepFourValid) {
      if (totalImageCount < MIN_IMAGES) {
        setError(`Ավելացրեք առնվազն ${MIN_IMAGES} լուսանկար։`);
      } else if (totalDocumentCount > MAX_DOCUMENTS) {
        setError(`Փաստաթղթեր՝ ամենաշատը ${MAX_DOCUMENTS} ֆայլ։`);
      } else {
        setError("Ստուգեք նկարներն ու ֆայլերը։");
      }
      return;
    }
    if (step === 5 && !stepValidations.stepFiveValid) {
      setError("Ստուգեք բյուջեի դաշտերը (դրական թվեր, նվազագույնը ≤ առավելագույնը)։");
      return;
    }
    if (step === 6 && !stepValidations.stepSixValid) {
      setError("Ընտրեք բնակավայրը (մարզ և քաղաք/գյուղ)։");
      return;
    }
    if (step === 8 && !stepValidations.stepEightValid) {
      setError("Ստուգեք մրցույթի ժամկետը (1–90 օր)։");
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep((current) => (current + 1) as WizardStep);
    }
  }

  function goBack() {
    setError(null);
    if (step > 1) {
      setStep((current) => (current - 1) as WizardStep);
    }
  }

  function revokePendingUrls(list: ImagePreview[]) {
    list.forEach((image) => URL.revokeObjectURL(image.url));
  }

  function handleAddFiles(files: FileList | null) {
    if (!files) {
      return;
    }
    const next: ImagePreview[] = [];
    let rejected = 0;
    for (const file of Array.from(files)) {
      if (totalImageCount + next.length >= MAX_IMAGES) {
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
      setPendingImages((current) => [...current, ...next]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemovePendingImage(id: string) {
    setPendingImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return current.filter((image) => image.id !== id);
    });
  }

  function handleRemoveRemoteImage(id: string) {
    setRemoteImages((current) => current.filter((img) => img.id !== id));
  }

  function handleAddDocuments(files: FileList | null) {
    if (!files) {
      return;
    }
    const next: DocumentPreview[] = [];
    let rejected = 0;
    for (const file of Array.from(files)) {
      if (totalDocumentCount + next.length >= MAX_DOCUMENTS) {
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
      setPendingDocuments((current) => [...current, ...next]);
    }
    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  }

  function handleRemovePendingDocument(id: string) {
    setPendingDocuments((current) => current.filter((doc) => doc.id !== id));
  }

  function handleRemoveRemoteDocument(id: string) {
    setRemoteDocuments((current) => current.filter((doc) => doc.id !== id));
  }

  type TenderPersistResponse = {
    id: string;
    status?: string;
    images?: { id: string; url: string }[];
    documents?: { id: string; url: string; originalFileName: string }[];
  };

  const mergePersistedAttachments = useCallback((tender: TenderPersistResponse) => {
    if (tender.status === "DRAFT" || tender.status === "REVIEW" || tender.status === "ACTIVE") {
      setLiveTenderStatus(tender.status);
    }
    const nextRemoteImgs =
      tender.images?.map((im) => ({ id: im.id, url: im.url })) ?? [];
    setRemoteImages(nextRemoteImgs);
    setPendingImages((prev) => {
      revokePendingUrls(prev);
      return [];
    });

    const nextRemoteDocs =
      tender.documents?.map((doc) => ({
        id: doc.id,
        url: doc.url,
        name: doc.originalFileName,
      })) ?? [];
    setRemoteDocuments(nextRemoteDocs);
    setPendingDocuments([]);
    setDraftTenderId(tender.id);
  }, []);

  const persistTenderRequest = useCallback(
    async (
      formData: FormData,
      requestInit?: Pick<RequestInit, "signal" | "keepalive">,
    ): Promise<Response> => {
      const id = draftTenderId;
      if (!id) {
        return fetch("/api/tenders", {
          method: "POST",
          body: formData,
          credentials: "include",
          ...requestInit,
        });
      }

      formData.append(
        "keepImageIds",
        JSON.stringify(remoteImages.map((r) => r.id)),
      );
      formData.append(
        "keepDocumentIds",
        JSON.stringify(remoteDocuments.map((r) => r.id)),
      );
      return fetch(`/api/tenders/${id}`, {
        method: "PATCH",
        body: formData,
        credentials: "include",
        ...requestInit,
      });
    },
    [draftTenderId, remoteImages, remoteDocuments],
  );

  const persistTenderCreateRequest = useCallback(
    (formData: FormData, requestInit?: Pick<RequestInit, "signal" | "keepalive">) => {
      return fetch("/api/tenders", {
        method: "POST",
        body: formData,
        credentials: "include",
        ...requestInit,
      });
    },
    [],
  );

  const buildPersistFormData = useCallback(
    (mode: "publish" | "draft") => {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("services", JSON.stringify(services));
      if (selectedLocationId !== null && selectedLocationId !== undefined) {
        formData.append("locationId", String(selectedLocationId));
      }
      if (address.trim()) {
        formData.append("address", address.trim());
      }
      if (budgetMin.trim()) {
        formData.append("budgetMin", budgetMin.replace(/\s/g, ""));
      }
      if (budgetMax.trim()) {
        formData.append("budgetMax", budgetMax.replace(/\s/g, ""));
      }
      formData.append("durationDays", String(durationDays));
      formData.append("isBlindBidding", String(isBlindBidding));
      formData.append("publish", String(mode === "publish"));
      formData.append("draftWizardStep", String(step));
      pendingImages.forEach((image) => {
        formData.append("images", image.file);
      });
      pendingDocuments.forEach((doc) => {
        formData.append("documents", doc.file);
      });
      return formData;
    },
    [
      title,
      description,
      services,
      selectedLocationId,
      address,
      budgetMin,
      budgetMax,
      durationDays,
      isBlindBidding,
      step,
      pendingImages,
      pendingDocuments,
    ],
  );

  const silentPersistDraft = useCallback(async () => {
    if (
      variant === "edit" &&
      (liveTenderStatus === "REVIEW" || liveTenderStatus === "ACTIVE")
    ) {
      return;
    }
    if (services.length < 1 || isSubmitting || persistLockRef.current) {
      return;
    }
    persistLockRef.current = true;
    try {
      const formData = buildPersistFormData("draft");
      let response = await persistTenderRequest(formData, undefined);
      let payload = (await response.json().catch(() => null)) as {
        tender?: TenderPersistResponse;
        error?: string;
      } | null;

      if (!response.ok && payload?.error === "NOT_FOUND_OR_NOT_EDITABLE") {
        setDraftTenderId(null);
        const retryFormData = buildPersistFormData("draft");
        response = await persistTenderCreateRequest(retryFormData, undefined);
        payload = (await response.json().catch(() => null)) as {
          tender?: TenderPersistResponse;
          error?: string;
        } | null;
      }

      if (!response.ok || !payload?.tender?.id) {
        return;
      }
      mergePersistedAttachments(payload.tender);
      const nextUrl =
        variant === "edit"
          ? ROUTES.editTender(payload.tender.id)
          : `${ROUTES.createTender}?draft=${encodeURIComponent(payload.tender.id)}`;
      window.history.replaceState(null, "", nextUrl);
    } finally {
      persistLockRef.current = false;
    }
  }, [
    services.length,
    isSubmitting,
    buildPersistFormData,
    persistTenderRequest,
    persistTenderCreateRequest,
    mergePersistedAttachments,
    variant,
    liveTenderStatus,
  ]);

  const silentPersistDraftRef = useRef(silentPersistDraft);
  silentPersistDraftRef.current = silentPersistDraft;

  useEffect(() => {
    if (services.length < 1 || isSubmitting) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void silentPersistDraftRef.current();
      }
    }, 2400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    services.length,
    title,
    description,
    remoteImages,
    pendingImages,
    remoteDocuments,
    pendingDocuments,
    budgetMin,
    budgetMax,
    selectedLocationId,
    address,
    durationDays,
    isBlindBidding,
    step,
    draftTenderId,
    initialDraft?.id,
    isSubmitting,
    buildPersistFormData,
    persistTenderRequest,
    variant,
    liveTenderStatus,
  ]);

  function firstIncompletePublishStep(): WizardStep {
    if (!stepValidations.stepOneValid) {
      return 1;
    }
    if (!stepValidations.stepTwoValid) {
      return 2;
    }
    if (!stepValidations.stepThreeValid) {
      return 3;
    }
    if (!stepValidations.stepFourValid) {
      return 4;
    }
    if (!stepValidations.stepFiveValid) {
      return 5;
    }
    if (!stepValidations.stepSixValid) {
      return 6;
    }
    if (!stepValidations.stepEightValid) {
      return 8;
    }
    return 1;
  }

  async function handleSubmit(mode: "publish" | "draft") {
    const allOk =
      stepValidations.stepOneValid &&
      stepValidations.stepTwoValid &&
      stepValidations.stepThreeValid &&
      stepValidations.stepFourValid &&
      stepValidations.stepFiveValid &&
      stepValidations.stepSixValid &&
      stepValidations.stepEightValid;

    if (!allOk) {
      const jump = firstIncompletePublishStep();
      const msg =
        jump === 1
          ? "Լրացրեք ծառայությունները։"
          : jump === 2
            ? "Լրացրեք վերնագիրը։"
            : jump === 3
              ? "Լրացրեք նկարագրությունը։"
              : jump === 4
                ? "Ավելացրեք նկարները և փաստաթղթերը։"
                : jump === 5
                  ? "Ստուգեք բյուջեն։"
                  : jump === 6
                    ? "Ընտրեք բնակավայրը։"
                    : "Ստուգեք մրցույթի ժամկետը։";
      setError(msg);
      toastError("Թերի տվյալներ", msg);
      setStep(jump);
      return;
    }

    setIsSubmitting(true);
    setSubmitMode(mode);
    setError(null);

    try {
      const formData = buildPersistFormData(mode);
      let response = await persistTenderRequest(formData, undefined);

      let payload = (await response.json().catch(() => null)) as
        | { tender?: TenderPersistResponse; error?: string }
        | null;

      if (!response.ok && payload?.error === "NOT_FOUND_OR_NOT_EDITABLE") {
        // If the draft became non-editable, we can safely recreate the DRAFT on autosave,
        // but we MUST NOT recreate on publish because remote images/documents can't be
        // transferred to a new tender via POST without re-uploading.
        if (mode === "draft") {
          setDraftTenderId(null);
          const retryFormData = buildPersistFormData(mode);
          response = await persistTenderCreateRequest(retryFormData, undefined);
          payload = (await response.json().catch(() => null)) as
            | { tender?: TenderPersistResponse; error?: string }
            | null;
        }
      }

      if (!response.ok || !payload?.tender?.id) {
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

      if (mode === "draft") {
        mergePersistedAttachments(payload.tender);
      } else if (variant === "edit" && liveTenderStatus === "ACTIVE") {
        mergePersistedAttachments(payload.tender);
      }

      if (variant === "edit") {
        if (mode === "draft") {
          toastSuccess(
            "Սևագիրը պահպանվեց",
            "Փոփոխությունները պահպանված են որպես սևագիր։",
          );
          router.refresh();
          return;
        }
        if (liveTenderStatus === "ACTIVE") {
          toastSuccess("Պահպանվեց", "Գործող մրցույթի տվյալները թարմացվել են։");
          router.push(ROUTES.tenderDetail(payload.tender.id));
          router.refresh();
          return;
        }
        toastSuccess(
          "Մրցույթը թարմացվեց",
          "Փոփոխությունները ուղարկվել են մոդերացիայի (կամ մնում են հերթում)։",
        );
        router.push(ROUTES.account);
        router.refresh();
        return;
      }

      toastSuccess(
        mode === "publish" ? "Մրցույթը հրապարակվեց" : "Սևագիրը պահպանվեց",
        mode === "publish"
          ? "Մրցույթը ուղարկվեց մոդերացիայի։ Հաստատումից հետո կհայտնվի հարթակում։"
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
    } finally {
      setIsSubmitting(false);
      setSubmitMode(null);
    }
  }

  return (
    <div className="relative space-y-6 sm:space-y-8">
      <WizardPhaseHeader step={step} />

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <div className="space-y-6 sm:space-y-8">
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-900 shadow-sm"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-red-500 text-sm font-black text-white">
                !
              </span>
              <p className="text-sm font-medium leading-relaxed sm:text-base">{error}</p>
            </div>
          ) : null}

          <article className="relative rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)] sm:rounded-4xl sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-linear-to-r from-transparent via-amber-400 to-transparent" />

            <div className="relative space-y-1">
              {step === 1 ? (
                <StepServicesOnly
                  categories={categories}
                  services={services}
                  onServicesChange={setServices}
                />
              ) : null}

              {step === 2 ? (
                <StepTitleOnly services={services} title={title} onTitleChange={setTitle} />
              ) : null}

              {step === 3 ? (
                <StepDescriptionOnly
                  services={services}
                  tenderTitle={title}
                  description={description}
                  onDescriptionChange={setDescription}
                />
              ) : null}

              {step === 4 ? (
                <StepMediaOnly
                  remoteImages={remoteImages}
                  pendingImages={pendingImages}
                  remoteDocuments={remoteDocuments}
                  pendingDocuments={pendingDocuments}
                  totalImageCount={totalImageCount}
                  totalDocumentCount={totalDocumentCount}
                  onAddFiles={handleAddFiles}
                  onRemovePendingImage={handleRemovePendingImage}
                  onRemoveRemoteImage={handleRemoveRemoteImage}
                  onAddDocuments={handleAddDocuments}
                  onRemovePendingDocument={handleRemovePendingDocument}
                  onRemoveRemoteDocument={handleRemoveRemoteDocument}
                  fileInputRef={fileInputRef}
                  documentInputRef={documentInputRef}
                />
              ) : null}

              {step === 5 ? (
                <StepThree
                  slice={5}
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

              {step === 6 ? (
                <StepThree
                  slice={6}
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

              {step === 7 ? (
                <StepThree
                  slice={7}
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

              {step === 8 ? (
                <StepThree
                  slice={8}
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
                  deadlineReadOnly={liveTenderStatus === "ACTIVE"}
                  deadlineReadOnlyHint={
                    liveTenderStatus === "ACTIVE"
                      ? initialDraft?.endsAtIso
                        ? `Գործող վերջնաժամկետ՝ ${formatDateTime(initialDraft.endsAtIso)}։ Ակտիվ մրցույթում ժամկետը չի փոխվում խմբագրմամբ։`
                        : "Ակտիվ մրցույթում մրցույթի տևողությունը չի փոխվում խմբագրմամբ։"
                      : null
                  }
                />
              ) : null}

              {step === 9 ? (
                <StepFour
                  services={services}
                  title={title}
                  description={description}
                  remoteImages={remoteImages}
                  pendingImages={pendingImages}
                  remoteDocuments={remoteDocuments}
                  pendingDocuments={pendingDocuments}
                  budgetMin={budgetMin}
                  budgetMax={budgetMax}
                  selectedLocationLabel={selectedLocationLabel}
                  address={address}
                  durationDays={durationDays}
                  isBlindBidding={isBlindBidding}
                  onJumpToStep={(target) => setStep(target as WizardStep)}
                />
              ) : null}

              {step === 10 ? (
                <StepTen agreed={agreedToTerms} onAgreedChange={setAgreedToTerms} />
              ) : null}
            </div>

            <div className="relative mt-8 border-t border-slate-200 pt-6 sm:mt-10 sm:pt-8">
              <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50/60 disabled:text-slate-400 sm:text-base"
            >
              <ArrowLeft className="size-5 shrink-0" />
              Հետ գնալ
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-8 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/25 transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-xl active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 sm:text-base"
              >
                Հաջորդ քայլ
                <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-0.5" />
              </button>
            ) : liveTenderStatus === "ACTIVE" ? (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleSubmit("publish")}
                  disabled={isSubmitting || !agreedToTerms}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-8 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:text-base"
                >
                  {isSubmitting && submitMode === "publish" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Check className="size-5 shrink-0" />
                  )}
                  Պահպանել փոփոխությունները
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-end">
                {liveTenderStatus === "REVIEW" ? (
                  <button
                    type="button"
                    onClick={() => handleSubmit("draft")}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:text-base"
                  >
                    {isSubmitting && submitMode === "draft" ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <PenLine className="size-5 shrink-0" />
                    )}
                    Հանել մոդերացիայից (սևագիր)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit("draft")}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:text-base"
                  >
                    {isSubmitting && submitMode === "draft" ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <PenLine className="size-5 shrink-0" />
                    )}
                    Պահպանել որպես սևագիր
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSubmit("publish")}
                  disabled={isSubmitting || !agreedToTerms}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-8 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:text-base"
                >
                  {isSubmitting && submitMode === "publish" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-5 shrink-0" />
                  )}
                  {liveTenderStatus === "REVIEW"
                    ? "Վերաիմաստավորել մոդերացիային"
                    : "Հրապարակել մրցույթը"}
                </button>
              </div>
            )}
              </div>
            </div>
          </article>
        </div>

        <SidebarTips step={step} />
      </div>
    </div>
  );
}

function WizardPhaseHeader({ step }: { step: WizardStep }) {
  const meta = STEPS[step - 1];
  const pct = Math.min(100, Math.round((step / TOTAL_STEPS) * 100));

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm sm:rounded-4xl sm:p-8">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
              քայլ {step}
              <span className="mx-1 text-slate-300">/</span>
              {TOTAL_STEPS}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900 sm:inline-flex">
              <ListOrdered className="size-3.5 text-amber-600" aria-hidden />
              Քայլ առ քայլ
            </span>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
              {meta.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              {meta.description}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-xs font-black uppercase tracking-[0.18em] text-slate-400 sm:pt-2">
          պատրաստվիր հրապարակման
        </p>
      </div>

      <div className="mt-6 sm:mt-8">
        <div className="mb-2 flex justify-between gap-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <span>Առաջընթաց</span>
          <span className="tabular-nums text-slate-700">{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
          <div
            className="h-full rounded-full bg-linear-to-r from-amber-400 to-amber-600 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${pct}% ավարտված`}
          />
        </div>
      </div>
    </section>
  );
}

function mapErrorMessage(code: string): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Անհրաժեշտ է մուտք գործել։";
    case "VERIFICATION_REQUIRED":
      return "Մրցույթ տեղադրելու համար նախ հաստատեք հաշիվը (Telegram կամ էլ․ փոստ)։";
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
    case "NOT_FOUND_OR_NOT_EDITABLE":
      return "Մրցույթը չի գտնվել կամ խմբարկման ենթակա չէ (օր.՝ արդեն կան առաջարկներ)։ Թարմացրեք էջը։";
    case "ACTIVE_TENDER_REQUIRES_PUBLISH_SAVE":
      return "Ակտիվ մրցույթը պետք է պահպանվի «Պահպանել փոփոխությունները» կոճակով։";
    case "INVALID_IMAGE_REFERENCE":
      return "Նկարի հղումները չեն համընկնում՝ թարմացրեք էջը։";
    case "INVALID_DOCUMENT_REFERENCE":
      return "Փաստաթղթերի հղումները չեն համընկնում՝ թարմացրեք էջը։";
    case "TENDER_UPDATE_FAILED":
      return "Չհաջողվեց թարմացնել մրցույթը։";
    default:
      return "Չհաջողվեց հրապարակել մրցույթը։";
  }
}

function StepServicesOnly({
  categories,
  services,
  onServicesChange,
}: {
  categories: ServiceCategoryWithServices[];
  services: ServiceSelection[];
  onServicesChange: (values: ServiceSelection[]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
          Ձեր մրցույթի ծառայությունները
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          {STEPS[0].description} · Կարող եք ընտրել մինչև {MAX_SELECTED_SERVICES}{" "}
          ծառայություն՝ կապված աշխատանքները մեկ մրցույթում համախմբելու համար։
        </p>
      </div>

      <div>
        <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
          Ընտրվող ծառայություններ ({services.length}/{MAX_SELECTED_SERVICES})
        </label>
        <div className="mt-3">
          <ServicePicker
            mode="multi"
            categories={categories}
            values={services}
            onValuesChange={onServicesChange}
            maxSelections={MAX_SELECTED_SERVICES}
          />
        </div>
        {services.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {services.map((item) => (
              <li key={selectionKey(item)}>
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-950 py-1.5 pl-3.5 pr-1 text-xs font-black text-white shadow-sm sm:py-2 sm:pl-4 sm:text-sm">
                  <span className="min-w-0 truncate">{item.service}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onServicesChange(
                        services.filter((entry) => selectionKey(entry) !== selectionKey(item)),
                      )
                    }
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
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
    </div>
  );
}

function StepTitleOnly({
  services,
  title,
  onTitleChange,
}: {
  services: ServiceSelection[];
  title: string;
  onTitleChange: (value: string) => void;
}) {
  const [titleAiLoading, setTitleAiLoading] = useState(false);
  const titleLength = title.trim().length;
  const isTitleValid = titleLength >= TITLE_MIN && titleLength <= TITLE_MAX;

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
          kind: "title",
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
        } else if (code === "AI_QUOTA_EXCEEDED") {
          toastError(
            "AI լիմիտը սպառված է",
            "Gemini prepaid credits-ը վերջացել է։ Լիցքավորեք AI Studio-ում։",
          );
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
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
          Վերնագիր մրցույթի համար
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          {STEPS[1].description}
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label
            htmlFor="tender-title"
            className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]"
          >
            Վերնագիր
          </label>
          <button
            type="button"
            onClick={handleAiTitle}
            disabled={titleAiLoading || services.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:py-2.5 sm:text-[0.78rem]"
          >
            {titleAiLoading ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="size-4 shrink-0 text-amber-500" aria-hidden />
            )}
            {title.trim() ? "Բարելավել վերնագիր" : "AI գեներացիա վերնագրի համար"}
          </button>
        </div>
        <input
          id="tender-title"
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={TITLE_MAX + 20}
          placeholder="Գրեք ձեր մրցույթի ու հայտարարման կարիքները․ օրինակ՝ «Բնակարանի լիարժեք վերանորոգում Կենտրոնում»"
          className="mt-4 w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus-visible:border-slate-900 focus-visible:shadow-[0_0_0_4px_rgba(251,191,36,0.18)] sm:text-base"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
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

function StepDescriptionOnly({
  services,
  tenderTitle,
  description,
  onDescriptionChange,
}: {
  services: ServiceSelection[];
  tenderTitle: string;
  description: string;
  onDescriptionChange: (value: string) => void;
}) {
  const [descriptionAiLoading, setDescriptionAiLoading] = useState(false);
  const length = description.trim().length;
  const descOk = length >= DESCRIPTION_MIN && length <= DESCRIPTION_MAX;

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
        } else if (code === "AI_QUOTA_EXCEEDED") {
          toastError(
            "AI լիմիտը սպառված է",
            "Gemini prepaid credits-ը վերջացել է։ Լիցքավորեք AI Studio-ում։",
          );
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
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">Նկարագրություն</h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          Նկարագրությունը պետք է լինի առնվազն {DESCRIPTION_MIN} նիշ։
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label
            htmlFor="tender-description"
            className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]"
          >
            Հայտի նկարագրություն
          </label>
          <button
            type="button"
            onClick={handleAiDescription}
            disabled={descriptionAiLoading || services.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm transition hover:border-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:py-2.5 sm:text-[0.78rem]"
          >
            {descriptionAiLoading ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="size-4 shrink-0 text-amber-500" aria-hidden />
            )}
            {description.trim() ? "Բարելավել նկարագրություն" : "AI գեներացիա նկարագրության համար"}
          </button>
        </div>
        <textarea
          id="tender-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          minLength={DESCRIPTION_MIN}
          maxLength={DESCRIPTION_MAX}
          rows={12}
          placeholder="Նկարագրեք առաջադրանքը մանրամասն՝ ինչ պետք է անել, որտեղ, նյութերը, սպասելի արդյունքը, հատուկ պահանջները։"
          className="mt-4 w-full resize-y rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-base font-medium leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus-visible:border-slate-900 focus-visible:shadow-[0_0_0_4px_rgba(251,191,36,0.18)]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
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
    </div>
  );
}

function StepMediaOnly({
  remoteImages,
  pendingImages,
  remoteDocuments,
  pendingDocuments,
  totalImageCount,
  totalDocumentCount,
  onAddFiles,
  onRemovePendingImage,
  onRemoveRemoteImage,
  onAddDocuments,
  onRemovePendingDocument,
  onRemoveRemoteDocument,
  fileInputRef,
  documentInputRef,
}: {
  remoteImages: RemoteImage[];
  pendingImages: ImagePreview[];
  remoteDocuments: RemoteDocument[];
  pendingDocuments: DocumentPreview[];
  totalImageCount: number;
  totalDocumentCount: number;
  onAddFiles: (files: FileList | null) => void;
  onRemovePendingImage: (id: string) => void;
  onRemoveRemoteImage: (id: string) => void;
  onAddDocuments: (files: FileList | null) => void;
  onRemovePendingDocument: (id: string) => void;
  onRemoveRemoteDocument: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  documentInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const photosOk = totalImageCount >= MIN_IMAGES && totalImageCount <= MAX_IMAGES;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
          Նկարներ և ֆայլեր
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          Պարտադիր է առնվազն {MIN_IMAGES} լուսանկար։ Փաստաթղթերը ընտրանքային են։
        </p>
      </div>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
              Լուսանկարներ <span className="text-red-600">*</span>
            </p>
            <p className="mt-1.5 text-sm font-medium text-slate-500">
              Առնվազն {MIN_IMAGES}, մինչև {MAX_IMAGES} նկար · JPG, PNG, WEBP · մինչև 5 ՄԲ
            </p>
          </div>
          <p
            className={`text-sm font-black sm:text-base ${photosOk ? "text-emerald-700" : "text-amber-700"}`}
          >
            {totalImageCount}/{MAX_IMAGES}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {remoteImages.map((image) => (
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
                onClick={() => onRemoveRemoteImage(image.id)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                aria-label="Հեռացնել"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {pendingImages.map((image) => (
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
                onClick={() => onRemovePendingImage(image.id)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                aria-label="Հեռացնել"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          {totalImageCount < MAX_IMAGES ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/40 text-slate-500 transition hover:border-slate-950 hover:bg-slate-50 hover:text-slate-950"
            >
              <Plus className="size-7" />
              <span className="text-xs font-black uppercase tracking-[0.14em] sm:text-[0.78rem]">
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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
              Փաստաթղթեր <span className="font-semibold text-slate-400">(ընտրանքային)</span>
            </p>
            <p className="mt-1.5 text-sm font-medium text-slate-500">
              PDF, Word, Excel, TXT · մինչև {MAX_DOCUMENTS} ֆայլ · մինչև 10 ՄԲ
            </p>
          </div>
          <p className="text-sm font-black text-slate-500 sm:text-base">
            {totalDocumentCount}/{MAX_DOCUMENTS}
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {remoteDocuments.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
            >
              <span className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-slate-500" />
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-bold text-slate-800 underline-offset-2 hover:underline sm:text-base"
                >
                  {doc.name}
                </a>
              </span>
              <button
                type="button"
                onClick={() => onRemoveRemoteDocument(doc.id)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-red-100 hover:text-red-700"
                aria-label="Հեռացնել"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
          {pendingDocuments.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
            >
              <span className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-slate-500" />
                <span className="truncate text-sm font-bold text-slate-800 sm:text-base">
                  {doc.file.name}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRemovePendingDocument(doc.id)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-red-100 hover:text-red-700"
                aria-label="Հեռացնել"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        {totalDocumentCount < MAX_DOCUMENTS ? (
          <>
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3.5 text-sm font-black text-slate-600 transition hover:border-slate-950 hover:text-slate-950 sm:w-auto sm:px-8 sm:text-base"
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
  slice,
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
  deadlineReadOnly = false,
  deadlineReadOnlyHint = null,
}: {
  slice: 5 | 6 | 7 | 8;
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
  deadlineReadOnly?: boolean;
  deadlineReadOnlyHint?: string | null;
}) {
  const meta = STEPS[slice - 1];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
          {meta.title}
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          {meta.description}
        </p>
      </div>

      {slice === 5 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 shrink-0 text-slate-500" />
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
              Բյուջե (ոչ պարտադիր)
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BudgetInputLarge
              label="Նվազագույն"
              value={budgetMin}
              onChange={onBudgetMinChange}
              placeholder="50 000"
            />
            <BudgetInputLarge
              label="Առավելագույն"
              value={budgetMax}
              onChange={onBudgetMaxChange}
              placeholder="200 000"
            />
          </div>
        </section>
      ) : null}

      {slice === 6 ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 shrink-0 text-slate-500" />
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
              Բնակավայրի ընտրություն
            </h3>
          </div>
          <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
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
          <p className="text-sm font-medium text-slate-500 sm:text-base">
            Ամբողջ Հայաստանի մարզերը, քաղաքները և գյուղերը՝ տվյալների բազայից։
          </p>
        </section>
      ) : null}

      {slice === 7 ? (
        <section className="space-y-4">
          <label
            htmlFor="tender-address"
            className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]"
          >
            Հասցե (ոչ պարտադիր)
          </label>
          <input
            id="tender-address"
            type="text"
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="Փողոց, շենք, մուտք, բնակարան՝ եթե կա"
            className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus-visible:border-slate-900 focus-visible:shadow-[0_0_0_4px_rgba(251,191,36,0.18)]"
          />
        </section>
      ) : null}

      {slice === 8 ? (
        <>
          {deadlineReadOnly && deadlineReadOnlyHint != null && deadlineReadOnlyHint !== "" ? (
            <section className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-5 sm:rounded-3xl sm:p-6">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-amber-700" />
                <p className="text-sm font-semibold leading-relaxed text-amber-950 sm:text-base">
                  {deadlineReadOnlyHint}
                </p>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 shrink-0 text-slate-500" />
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
                  Ստանդարտ ժամկետներ
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
                      className={`rounded-full px-4 py-2 text-sm font-black transition sm:px-5 sm:py-2.5 sm:text-base ${
                        isActive
                          ? "bg-slate-950 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="custom-days"
                  className="text-xs font-black uppercase tracking-[0.12em] text-slate-500"
                >
                  Կամ օրերի քանակ
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
                  className="w-24 rounded-2xl border-2 border-slate-200 bg-white px-3 py-2.5 text-base font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus-visible:border-slate-900 focus-visible:shadow-[0_0_0_4px_rgba(251,191,36,0.18)] sm:w-28 sm:px-4 sm:py-3"
                />
                <span className="text-sm font-bold text-slate-500 sm:text-base">օր (1–90)</span>
              </div>
            </section>
          )}

          <section className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
                  <EyeOff className="size-6" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-950 sm:text-lg">Կույր մրցույթ</h3>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                    Մասնագետները չեն տեսնում միմյանց առաջարկները։ Արդար մրցակցություն ու
                    ավելի լավ գներ ձեզ համար։
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isBlindBidding}
                onClick={() => onBlindBiddingChange(!isBlindBidding)}
                className={`relative inline-flex h-9 w-[3.35rem] shrink-0 items-center self-start rounded-full transition sm:self-center ${
                  isBlindBidding ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block size-[1.55rem] transform rounded-full bg-white shadow transition ${
                    isBlindBidding ? "translate-x-[1.46rem]" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

type JumpableWizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

function StepFour({
  services,
  title,
  description,
  remoteImages,
  pendingImages,
  remoteDocuments,
  pendingDocuments,
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
  remoteImages: RemoteImage[];
  pendingImages: ImagePreview[];
  remoteDocuments: RemoteDocument[];
  pendingDocuments: DocumentPreview[];
  budgetMin: string;
  budgetMax: string;
  selectedLocationLabel: string;
  address: string;
  durationDays: number;
  isBlindBidding: boolean;
  onJumpToStep: (step: JumpableWizardStep) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 sm:text-[0.78rem]">
              Քայլ 9՝ նախադիտում
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              Նախադիտում և հաստատում
            </h2>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
              Ստուգեք բոլոր քայլերը։ Կարող եք «Հետ» կամ «Խմբագրել» կոճակներով վերադառնալ ամեն փուլ։
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void onJumpToStep(1);
            }}
            className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
          >
            <ArrowLeft className="size-4" />
            Առաջին քայլ
          </button>
        </div>
      </div>

      <ReviewSection title="Ծառայություններ" onEdit={() => onJumpToStep(1)}>
        {services.length > 0 ? (
          <ul className="space-y-2">
            {services.map((item, index) => (
              <li
                key={selectionKey(item)}
                className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-slate-700 sm:text-base"
              >
                <span className="font-black text-slate-400">{index + 1}.</span>
                <span>{item.category}</span>
                <span className="text-slate-400">→</span>
                <span className="font-black text-slate-950">{item.service}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-semibold text-slate-500">—</p>
        )}
      </ReviewSection>

      <ReviewSection title="Վերնագիր" onEdit={() => onJumpToStep(2)}>
        <p className="text-base font-black leading-snug text-slate-950 sm:text-lg">{title || "—"}</p>
      </ReviewSection>

      <ReviewSection title="Նկարագրություն" onEdit={() => onJumpToStep(3)}>
        <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
          {description || "—"}
        </p>
      </ReviewSection>

      <ReviewSection title="Նկարներ և փաստաթղթեր" onEdit={() => onJumpToStep(4)}>
        {remoteImages.length + pendingImages.length > 0 ? (
          <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {remoteImages.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200"
              >
                <Image
                  src={image.url}
                  alt="Նկար"
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized
                />
              </div>
            ))}
            {pendingImages.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-slate-200"
              >
                <Image
                  src={image.url}
                  alt="Նկար"
                  fill
                  className="object-cover"
                  sizes="120px"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">—</p>
        )}

        {remoteDocuments.length + pendingDocuments.length > 0 ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Փաստաթղթեր
            </p>
            <ul className="mt-2 space-y-1.5">
              {remoteDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:text-base"
                >
                  <FileText className="size-4 shrink-0 text-slate-400" />
                  <span className="truncate">{doc.name}</span>
                </li>
              ))}
              {pendingDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:text-base"
                >
                  <FileText className="size-4 shrink-0 text-slate-400" />
                  <span className="truncate">{doc.file.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </ReviewSection>

      <ReviewSection title="Բյուջե" onEdit={() => onJumpToStep(5)}>
        <p className="text-base font-black text-slate-900 sm:text-lg">
          {budgetMin || budgetMax
            ? `${budgetMin ? formatBudget(budgetMin) : "չնշված"} – ${
                budgetMax ? formatBudget(budgetMax) : "չնշված"
              }`
            : "Համաձայնեցվելու է առաջարկներով"}
        </p>
      </ReviewSection>

      <ReviewSection title="Գտնվելու վայրը" onEdit={() => onJumpToStep(6)}>
        <p className="text-base font-black text-slate-900 sm:text-lg">{selectedLocationLabel || "—"}</p>
      </ReviewSection>

      <ReviewSection title="Հասցե" onEdit={() => onJumpToStep(7)}>
        <p className="text-base font-medium text-slate-800">{address || "չնշված"}</p>
      </ReviewSection>

      <ReviewSection title="Մրցույթի ժամկետ ու կույր մրցույթ" onEdit={() => onJumpToStep(8)}>
        <ul className="space-y-2 text-sm font-medium text-slate-800 sm:text-base">
          <li>
            <span className="text-slate-500">Ժամանակահատված․ </span>
            {durationDays} օր
          </li>
          <li>
            <span className="text-slate-500">Կույր մրցույթ․ </span>
            {isBlindBidding ? "Միացված" : "Անջատված"}
          </li>
        </ul>
      </ReviewSection>
    </div>
  );
}

function StepTen({
  agreed,
  onAgreedChange,
}: {
  agreed: boolean;
  onAgreedChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
          Պատասխանատվություն և բարեխղճություն
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
          Խնդրում ենք մրցույթ ավելացնել միայն այն դեպքում, երբ իրականում ունեք տվյալ ծառայության
          կարիքը և պատրաստ եք քննարկել առաջարկները։
        </p>
      </div>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:rounded-4xl sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800 sm:text-[0.78rem]">
          Ինչու՞ սա կարևոր է
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-medium leading-relaxed text-amber-950 sm:text-base">
          <li>
            Մրցույթին մասնակցելու համար մասնակիցները վճարում են գումար՝ առաջարկ ուղարկելու նպատակով։
          </li>
          <li>
            Եթե մրցույթը «ուղղակի փորձելու համար» է, մարդիկ կորցնում են ժամանակ և միջոցներ։
          </li>
          <li>
            Բարեխղճությունը պահում է հարթակի որակը՝ բոլորը ստանում են արդար մրցակցություն։
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-4xl sm:p-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className="mt-1 size-5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
          <span className="text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
            Համաձայն եմ պայմաններին և հասկանում եմ, որ խախտման դեպքում կարող են կիրառվել
            պատժամիջոցներ (սահմանափակումներ/արգելափակում)։
          </span>
        </label>

        {!agreed ? (
          <p className="mt-3 text-sm font-medium text-slate-500 sm:text-base">
            Հրապարակելու համար անհրաժեշտ է հաստատել պայմանների համաձայնությունը։
          </p>
        ) : null}
      </section>
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
    <section className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-5 sm:rounded-3xl sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 sm:px-4 sm:py-2 sm:text-sm"
        >
          <PenLine className="size-3.5" />
          Խմբագրել
        </button>
      </div>
      {children}
    </section>
  );
}

function BudgetInputLarge({
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
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[0.78rem]">
        {label}
      </label>
      <div className="relative mt-3">
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
          className="w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 pr-14 text-lg font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus-visible:border-slate-900 focus-visible:shadow-[0_0_0_4px_rgba(251,191,36,0.18)]"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-black text-slate-400">
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
        body: `Օր.՝ ներկում ներսում ու տաքահատակ — ընտրեք մինչև ${MAX_SELECTED_SERVICES} կապված մասնագիտություն՝ մեկ պատվիրում փաթեթավորելու համար։`,
      },
    ],
    2: [
      {
        title: "Տեքստը՝ պատվիրատուի կարիք",
        body: 'Գրեք պատվիրատուի օրինակի նման — ինչ աշխատանք պետք է, ոչ թե «եմ անում»: AI կառաջարկի լրացման տարբերակ։',
      },
    ],
    3: [
      {
        title: `Առնվազն ${DESCRIPTION_MIN} նիշ նկարագրություն`,
        body: "Ինչը, որտեղ, նյութ, ժամկետ, ընդունելի երկիր — մանրամասները նվազեցնում են շփոթությունն ու սխալ առաջարկները։ Նկարագիրը կարող եք այստեղ գեներացնել AI ուղումով։",
      },
    ],
    4: [
      {
        title: "Լուսանկարները պարտադիր",
        body: `Ավելացրեք առնվազն ${MIN_IMAGES} իրական օբյեկտից կամ աշխատանքի նշված կետից նկար։ Փաստաթղթերը կցեք ընտրանքաբար։`,
      },
    ],
    5: [
      {
        title: "Բյուջեն կարող եք անընդհատ թողնել դատարկ",
        body: "Բյուջեն կարող եք թողնել դատարկ. Նվազագույնը և առավելագույնը նշելը՝ առաջարկները զտելու հարմար միջոց է:",
      },
    ],
    6: [
      {
        title: "Բնակավայրն ընտրեք ցանկից",
        body: "Որոնեք գյուղ/քաղաք/մարզ՝ նույն հասցեների բազայի հիման վրա։ Դա օգնում է մասնագետներին իրական ժամանակներ և տրանսպորտ հաշվել։",
      },
    ],
    7: [
      {
        title: "Յուրաքանչյուր մանրամասն հասցե",
        body: 'Օրինակ՝ «Աբովյան 12/2 մուտք Բ, 4‑րդ հարկ»: Եթե գաղտնի է կամ փոխվելու է՝ նշեք իրավիճակը ընդհանուր ձևով:',
      },
    ],
    8: [
      {
        title: "Քանի՞ օր հավաքել առաջարկներ",
        body: "Ընտրեք 3–30 օրվա նախասահմանների միջև կամ այլ թիվ՝ 1‑ից մինչև 90։ Կարճ կամ փոքր իրավիճում հաճախ 7 օրն է պատասխանման դերում։ ",
      },
      {
        title: "Կույր մրցույթ",
        body: "Միացված վիճակում մասնագետները չեն տեսնում իրար գները՝ ավելի արդար մրցակցություն ընդհանուր։",
      },
    ],
    9: [
      {
        title: "Ամփոփումից առաջ",
        body: "Օգտվեք «Խմբագրել» կոճակներով ամփոփման բացթողումները շտկելու, կամ «Հետ գնալ»՝ նախորդ քայլեր վերադառնալու համար։",
      },
      {
        title: "Ավտոմատ սևագրի պահպանում",
        body:
          "Առնվազն մեկ ծառայություն ընտրելուց հետո տվյալները որոշակի դադարից հետո պահպանվում են սերվերի սևագրում։ Զննարկչի հասցեի տողում հայտնվում է /tenders/new?draft=id հատված՝ նույն սևագրին հետ շարունակելու համար։ ",
      },
    ],
  };

  const tips =
    tipsByStep[step] ??
    ([] as {
      title: string;
      body: string;
    }[]);

  return (
    <aside className="space-y-5 lg:sticky lg:top-6">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:rounded-4xl sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-12 size-48 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative flex items-start gap-3 border-b border-white/10 pb-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-slate-950">
            <Lightbulb className="size-5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Խորհուրդ
            </p>
            <p className="mt-1 text-base font-black leading-snug sm:text-lg">
              Այս քայլի համար
            </p>
          </div>
        </div>
        <ul className="relative mt-5 space-y-3">
          {tips.map((tip) => (
            <li key={tip.title} className="rounded-2xl bg-white/5 px-4 py-3.5">
              <p className="text-sm font-black leading-snug text-white sm:text-[0.95rem]">{tip.title}</p>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-300">
                {tip.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:rounded-4xl sm:p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <ImageIcon className="size-5 text-slate-500" />
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 sm:text-[0.78rem]">
            Քայլերի ցանկ
          </p>
        </div>
        <ul className="mt-4 space-y-2.5 text-sm font-medium text-slate-700">
          {STEPS.map((stepItem) => {
            const status =
              stepItem.id < step ? "complete" : stepItem.id === step ? "active" : "pending";
            return (
              <li key={stepItem.id} className="flex items-center gap-3">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                    status === "complete"
                      ? "bg-emerald-500 text-white"
                      : status === "active"
                        ? "bg-amber-400 text-slate-950 ring-2 ring-amber-100"
                        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                  }`}
                >
                  {status === "complete" ? <Check className="size-3.5" strokeWidth={3} /> : stepItem.id}
                </span>
                <span className={`min-w-0 leading-snug ${status === "active" ? "font-black text-slate-950" : "text-slate-600"}`}>
                  {stepItem.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3.5 text-sm font-medium leading-snug text-amber-900 ring-1 ring-amber-200 sm:rounded-3xl">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-black text-slate-950">
          ✓
        </span>
        <span>
          Մրցույթ տեղադրելն{" "}
          <span className="font-black text-amber-950">անվճար է</span>։ Վճարում են միայն
          մասնագետները՝ առաջարկ ուղարկելու համար։
        </span>
      </div>
    </aside>
  );
}
