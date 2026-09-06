import type { ContractPartyInput } from "@/lib/tender-contract-text";

type UserPartyRow = {
  name: string | null;
  email: string;
  phone: string | null;
  accountType: "INDIVIDUAL" | "LEGAL_ENTITY" | string;
  companyName: string | null;
  legalForm: string | null;
  taxId: string | null;
  legalAddress: string | null;
  directorName: string | null;
};

export function toContractParty(user: UserPartyRow, fallbackName: string): ContractPartyInput {
  return {
    name: user.name?.trim() || fallbackName,
    email: user.email,
    phone: user.phone,
    accountType:
      user.accountType === "LEGAL_ENTITY" ? "LEGAL_ENTITY" : "INDIVIDUAL",
    companyName: user.companyName,
    legalForm: user.legalForm,
    taxId: user.taxId,
    legalAddress: user.legalAddress,
    directorName: user.directorName,
  };
}

export const CONTRACT_PARTY_SELECT = {
  name: true,
  email: true,
  phone: true,
  accountType: true,
  companyName: true,
  legalForm: true,
  taxId: true,
  legalAddress: true,
  directorName: true,
} as const;
