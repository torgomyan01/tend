export const ACCOUNT_TYPE_VALUES = ["INDIVIDUAL", "LEGAL_ENTITY"] as const;
export type AccountTypeValue = (typeof ACCOUNT_TYPE_VALUES)[number];

export const LEGAL_FORM_VALUES = [
  "SP",
  "LLC",
  "CJSC",
  "JSC",
  "NGO",
  "OTHER",
] as const;
export type LegalFormValue = (typeof LEGAL_FORM_VALUES)[number];

export const LEGAL_FORM_LABEL: Record<LegalFormValue, string> = {
  SP: "ԱՁ (Անհատ ձեռնարկատեր)",
  LLC: "ՍՊԸ (Սահմ. պատասխ. ընկ.)",
  CJSC: "ՓԲԸ (Փակ բաժնետ. ընկ.)",
  JSC: "ԲԲԸ (Բաց բաժնետ. ընկ.)",
  NGO: "ՀԿ (Հասարակական կազմ.)",
  OTHER: "Այլ",
};

export const LEGAL_FORM_SHORT: Record<LegalFormValue, string> = {
  SP: "ԱՁ",
  LLC: "ՍՊԸ",
  CJSC: "ՓԲԸ",
  JSC: "ԲԲԸ",
  NGO: "ՀԿ",
  OTHER: "Այլ",
};

export const ACCOUNT_TYPE_LABEL: Record<AccountTypeValue, string> = {
  INDIVIDUAL: "Ֆիզ. անձ",
  LEGAL_ENTITY: "Ընկերություն",
};

export function isLegalEntity(
  accountType: AccountTypeValue | null | undefined,
): boolean {
  return accountType === "LEGAL_ENTITY";
}

/**
 * Հանրային ցուցադրման անվանումը՝ ընկերության դեպքում առաջնահերթությունը companyName-ին։
 */
export function publicDisplayName(input: {
  accountType: AccountTypeValue | null | undefined;
  name: string | null | undefined;
  companyName: string | null | undefined;
}): string {
  if (isLegalEntity(input.accountType) && input.companyName?.trim()) {
    return input.companyName.trim();
  }
  return input.name?.trim() || "—";
}
