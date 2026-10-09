export const ESCROW_UI = {
  badge: "Պաշտպանված գործարք",
  amountLine: (contract: string, receives: string, pct: number, fee: string) =>
    `Գումար՝ ${contract} · կատարողը կստանա ${receives} (միջնորդավճար ${pct}% = ${fee})`,
  bankTitle: "Բանկային փոխանցում",
  receiver: "Ստացող",
  bank: "Բանկ",
  account: "Հաշիվ",
  amount: "Գումար",
  paymentCode: "Պարտադիր նշում",
  noteOptional: "Նշում (ոչ պարտադիր)",
  notePlaceholder: "Օր. փոխանցման ամսաթիվ",
  submitPayment: "Փոխանցել եմ",
  paymentReview:
    "Ստուգում ենք մուտքը։ Կատարողը կսկսի աշխատանքը միայն ադմինի հաստատումից հետո։",
  waitTransfer:
    "Սպասեք· գումարը դեռ չի հաստատվել։ Մի սկսեք աշխատանքը։",
  funded:
    "Գումարը Tend.am-ում է պահված · կարող եք սկսել աշխատանքը։",
  fundedProvider:
    "Գումարը Tend.am-ում է պահված։ Կարող եք սկսել աշխատանքը։",
  fundedClient:
    "Փոխանցումը հաստատված է։ Կատարողը կարող է սկսել աշխատանքը։",
  releaseCta: "Աշխատանքն ավարտված է · ազատել գումարը",
  releasePending: "Հաստատված է · սպասում ենք ադմինի փոխանցմանը կատարողին։",
  disputed: "Վեճի ընթացքում է։",
  openDispute: "Բացել վեճ",
  disputePlaceholder: "Նկարագրեք խնդիրը (առնվազն 10 նիշ)",
  submit: "Ուղարկել",
  cancel: "Չեղարկել",
  awaitingContract: "Պաշտպանված գործարքը կակտիվանա պայմանագրի երկկողմանի հաստատումից հետո։",
  toastFail: "Չհաջողվեց",
  toastRetry: "Փորձեք նորից։",
  toastNetwork: "Ցանցի խնդիր",
  toastPaymentOk: "Ուղարկված է",
  toastPaymentOkBody: "Ադմինը կստուգի մուտքը։",
  toastReleaseOk: "Հաստատված է",
  toastReleaseOkBody: "Ադմինը կփոխանցի գումարը կատարողին։",
  toastDisputeShort: "Պատճառ",
  toastDisputeShortBody: "Գրեք առնվազն 10 նիշ։",
  toastDisputeOk: "Վեճը բացված է",
  toastDisputeOkBody: "Ադմինը կուսումնասիրի։",
} as const;
