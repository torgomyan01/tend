import { DEFAULT_ESCROW_FEE_PERCENT } from "@/lib/escrow";

export type EscrowStep = {
  title: string;
  detail: string;
};

/** Client (employer) journey for protected deals */
export const ESCROW_CLIENT_STEPS: EscrowStep[] = [
  {
    title: "Մրցույթ հրապարակեք",
    detail:
      "Ստեղծեք մրցույթը։ Կատարողները կուղարկեն առաջարկներ։",
  },
  {
    title: "Ընտրեք կատարող",
    detail:
      "Առաջարկեք կատարողին և հաստատեք էլեկտրոնային պայմանագիրը։ Ապա կատարողը պետք է հաստատի։",
  },
  {
    title: "Բանկային փոխանցում",
    detail:
      "Վճարեք պայմանավորված գումարը Tend.am-ի հաշվին։ Նշման դաշտում պարտադիր գրեք վճարման կոդը (TEND-ESC-…)։",
  },
  {
    title: "Հաստատեք փոխանցումը",
    detail:
      "Հարթակում նշեք «Փոխանցել եմ»։ Ադմինը կստուգի մուտքը։ Հաստատումից հետո գումարը պահվում է։",
  },
  {
    title: "Աշխատանքը և ազատում",
    detail:
      "Կատարողը կատարում է աշխատանքը։ Ավարտից հետո հաստատեք ազատումը։ Ադմինը կփոխանցի գումարը կատարողին (հանած 1% միջնորդավճար)։",
  },
];

/** Provider journey for protected deals */
export const ESCROW_PROVIDER_STEPS: EscrowStep[] = [
  {
    title: "Ուղարկեք առաջարկ",
    detail:
      "Դիմեք մրցույթին և սպասեք պատվիրատուի որոշմանը։",
  },
  {
    title: "Հաստատեք պայմանագիրը",
    detail:
      "Երբ կողմը հաստատելուց հետո դուք պաշտոնապես ընտրված է։",
  },
  {
    title: "Սպասեք գումարի պահմանը",
    detail:
      "Պատվիրատուն վճարում է Tend.am հաշվին։ Ադմինը հաստատումից հետո միայն սկսեք աշխատանքը։",
  },
  {
    title: "Կատարեք աշխատանքը",
    detail:
      "Ավարտից հետո պատվիրատուն հաստատում է ազատումը։",
  },
  {
    title: "Ստացեք վճարումը",
    detail:
      "Ադմինը ձեզ է փոխանցում գումարը ձեզ (հանած 1% հարթակի միջնորդավճար կատարված աշխատանքից)։",
  },
];

export function formatEscrowStepsMessage(
  role: "client" | "provider",
  feePercent: number = DEFAULT_ESCROW_FEE_PERCENT,
): string {
  const steps =
    role === "client" ? ESCROW_CLIENT_STEPS : ESCROW_PROVIDER_STEPS;
  const title =
    role === "client"
      ? "Պատվիրատուի քայլերը (պաշտպանված գործարք)"
      : "Կատարողի քայլերը (պաշտպանված գործարք)";
  const feeNote =
    role === "client"
      ? `Միջնորդավճար՝ ${feePercent}% հանվում է կատարողից բարեհաջողվ ավարտից հետո։`
      : `Միջնորդավճար՝ ${feePercent}% հանվում է ձեզ կատարված աշխատանքի գումարից։`;

  const lines = [
    title,
    "",
    feeNote,
    "",
    ...steps.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`),
  ];
  return lines.join("\n");
}
