import type { TenderContractStatus, TenderEscrowStatus } from "@/generated/prisma/client";
import { ESCROW_STATUS_LABEL } from "@/lib/escrow";

export const MY_WORK_ACTIVE_STATUSES: TenderEscrowStatus[] = [
  "AWAITING_CONTRACT",
  "PENDING_FUNDING",
  "PAYMENT_SUBMITTED",
  "FUNDED",
  "DISPUTED",
  "RELEASE_PENDING",
];

export type MyWorkStage = {
  key: string;
  title: string;
};

/** Կատարողի էտապներ՝ ընթացիկ աշխատանքի համար */
export const PROVIDER_WORK_STAGES: MyWorkStage[] = [
  { key: "contract", title: "Պայմանագիր" },
  { key: "funding", title: "Գումարի պահում" },
  { key: "work", title: "Աշխատանք" },
  { key: "payout", title: "Վճարում" },
];

export type MyWorkProgress = {
  status: TenderEscrowStatus;
  statusLabel: string;
  stageIndex: number;
  stages: MyWorkStage[];
  nextAction: string;
  waitingOn: "you" | "client" | "admin" | "none";
};

export function getProviderWorkProgress(input: {
  escrowStatus: TenderEscrowStatus;
  contractStatus: TenderContractStatus;
}): MyWorkProgress {
  const { escrowStatus, contractStatus } = input;
  const statusLabel =
    ESCROW_STATUS_LABEL[escrowStatus] ?? escrowStatus;

  if (escrowStatus === "AWAITING_CONTRACT") {
    const waitingOn =
      contractStatus === "PENDING_PROVIDER"
        ? "you"
        : contractStatus === "PENDING_CLIENT"
          ? "client"
          : "none";
    return {
      status: escrowStatus,
      statusLabel,
      stageIndex: 0,
      stages: PROVIDER_WORK_STAGES,
      waitingOn,
      nextAction:
        waitingOn === "you"
          ? "Բացեք պայմանագիրը և սեղմեք «Համաձայն եմ · Հաստատել»։"
          : waitingOn === "client"
            ? "Սպասեք պատվիրատուի հաստատմանը պայմանագրում։"
            : "Սպասեք պայմանագրի երկկողմանի հաստատմանը։",
    };
  }

  if (
    escrowStatus === "PENDING_FUNDING" ||
    escrowStatus === "PAYMENT_SUBMITTED"
  ) {
    return {
      status: escrowStatus,
      statusLabel,
      stageIndex: 1,
      stages: PROVIDER_WORK_STAGES,
      waitingOn: escrowStatus === "PAYMENT_SUBMITTED" ? "admin" : "client",
      nextAction:
        escrowStatus === "PAYMENT_SUBMITTED"
          ? "Ադմինը ստուգում է փոխանցումը։ Մինչև հաստատումը աշխատանքը մի սկսեք։"
          : "Սպասեք պատվիրատուի բանկային փոխանցմանը և ադմինի հաստատմանը։ Մինչև այդ աշխատանքը մի սկսեք։",
    };
  }

  if (escrowStatus === "FUNDED") {
    return {
      status: escrowStatus,
      statusLabel,
      stageIndex: 2,
      stages: PROVIDER_WORK_STAGES,
      waitingOn: "you",
      nextAction:
        "Կատարեք աշխատանքը համաձայն պայմանագրի։ Ավարտից հետո պատվիրատուն կհաստատի գումարի ազատումը։",
    };
  }

  if (escrowStatus === "DISPUTED") {
    return {
      status: escrowStatus,
      statusLabel,
      stageIndex: 2,
      stages: PROVIDER_WORK_STAGES,
      waitingOn: "admin",
      nextAction:
        "Վեճ է բացված։ Մասնակցեք զրույցին և սպասեք ադմինի որոշմանը գումարի ուղղորդման վերաբերյալ։",
    };
  }

  if (escrowStatus === "RELEASE_PENDING") {
    return {
      status: escrowStatus,
      statusLabel,
      stageIndex: 3,
      stages: PROVIDER_WORK_STAGES,
      waitingOn: "admin",
      nextAction:
        "Պատվիրատուն հաստատել է ազատումը։ Սպասեք ադմինի փոխանցմանը ձեր հաշվին։",
    };
  }

  return {
    status: escrowStatus,
    statusLabel,
    stageIndex: 3,
    stages: PROVIDER_WORK_STAGES,
    waitingOn: "none",
    nextAction: statusLabel,
  };
}

export function waitingOnLabel(waitingOn: MyWorkProgress["waitingOn"]): string {
  switch (waitingOn) {
    case "you":
      return "Ձեր քայլն է";
    case "client":
      return "Սպասում է պատվիրատուին";
    case "admin":
      return "Սպասում է ադմինին";
    default:
      return "Ընթացքում";
  }
}
