export type TenderComplaintReasonId =
  | "unrealistic_budget"
  | "misleading_description"
  | "unfair_terms"
  | "duplicate_or_spam"
  | "illegal_or_platform_rules"
  | "other";

export type TenderComplaintReason = {
  id: TenderComplaintReasonId;
  label: string;
  hint?: string;
};

/** Predefined reasons — moderation / API can key off `id` */
export const TENDER_COMPLAINT_REASONS: readonly TenderComplaintReason[] = [
  {
    id: "unrealistic_budget",
    label: "Գնային միջակայքը / բյուջեն չափազանց ցածր է",
    hint: "Նման պայմաններով հնարավոր չէ մրցունակ առաջարկ ներկայացնել կամ պահպանել որակը։",
  },
  {
    id: "misleading_description",
    label: "Նկարագրությունը մոլորեցնող է կամ չի համապատասխանում իրական պահանջին",
    hint: "Թաքնված աշխատանքներ, ծավալի խեղում կամ կարևոր մանրամասների բացակայություն։",
  },
  {
    id: "unfair_terms",
    label: "Վճարման, ժամկետի կամ երաշխիքի պայմանները խտրական են",
    hint: "Մրցույթին դիմողի ռիսկը անհամաչափ է կամ պայմանները միակողմանի են։",
  },
  {
    id: "duplicate_or_spam",
    label: "Կասկածելի կրկնվող հրապարակում կամ spam",
    hint: "Նույն պատվերը կրկին է հայտնվել կամ հայտարարությունը չի նմանվում իրական պատվերին։",
  },
  {
    id: "illegal_or_platform_rules",
    label: "Հայտարարությունը հակասում է օրենքին կամ հարթակի կանոններին",
    hint: "Արգելված գործունեություն, խտրականություն, անվտանգության խախտում և այլն։",
  },
  {
    id: "other",
    label: "Այլ պատճառ",
    hint: "Նշեք մանրամասնորեն՝ մոդերացիան արագ կկարողանա գնահատել։",
  },
] as const;

export function isValidTenderComplaintReasonId(
  id: string,
): id is TenderComplaintReasonId {
  return TENDER_COMPLAINT_REASONS.some((r) => r.id === id);
}

export function tenderComplaintReasonLabel(
  id: string,
): string | undefined {
  return TENDER_COMPLAINT_REASONS.find((r) => r.id === id)?.label;
}
