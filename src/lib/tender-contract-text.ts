import { formatAmd, formatDateTime } from "@/lib/format";

export type ContractPartyInput = {
  name: string;
  email: string;
  phone: string | null;
  accountType: "INDIVIDUAL" | "LEGAL_ENTITY";
  companyName: string | null;
  legalForm: string | null;
  taxId: string | null;
  legalAddress: string | null;
  directorName: string | null;
};

export type GenerateTenderContractTextInput = {
  contractRef: string;
  generatedAt: Date;
  tender: {
    id: string;
    title: string;
    description: string;
    category: string;
    service: string;
    city: string | null;
    address: string | null;
  };
  bid: {
    price: number;
    timelineDays: number | null;
    coverLetter: string;
  };
  client: ContractPartyInput;
  provider: ContractPartyInput;
};

function partyBlock(label: string, p: ContractPartyInput): string {
  const lines: string[] = [`${label}`];
  if (p.accountType === "LEGAL_ENTITY") {
    lines.push(
      `Իրավաբանական անձ՝ ${p.companyName?.trim() || p.name}`,
    );
    if (p.legalForm) lines.push(`Իրավական ձև՝ ${p.legalForm}`);
    if (p.taxId) lines.push(`ՀՎՀՀ / նույնականացման համար՝ ${p.taxId}`);
    if (p.directorName) lines.push(`Տնօրեն / ներկայացուցիչ՝ ${p.directorName}`);
    if (p.legalAddress) lines.push(`Իրավական հասցե՝ ${p.legalAddress}`);
  } else {
    lines.push(`Ֆիզիկական անձ՝ ${p.name}`);
  }
  lines.push(`Էլ․ փոստ՝ ${p.email}`);
  if (p.phone?.trim()) lines.push(`Հեռախոս՝ ${p.phone.trim()}`);
  return lines.join("\n");
}

/**
 * Գեներացնում է փաստացի էլեկտրոնային պայմանագրի տեքստ (hy)՝
 * կողմերի հաստատումը հարթակում համարվում է ընդունում։
 */
export function generateTenderContractText(
  input: GenerateTenderContractTextInput,
): string {
  const place =
    [input.tender.city?.trim(), input.tender.address?.trim()]
      .filter(Boolean)
      .join(", ") || "նշված չէ";

  const timeline =
    input.bid.timelineDays && input.bid.timelineDays > 0
      ? `${input.bid.timelineDays} օրացուցային օր`
      : "կողմերի առանձին համաձայնությամբ (առաջարկում ժամկետ նշված չէ)";

  const cover =
    input.bid.coverLetter.trim().length > 800
      ? `${input.bid.coverLetter.trim().slice(0, 800)}…`
      : input.bid.coverLetter.trim();

  const desc =
    input.tender.description.trim().length > 1200
      ? `${input.tender.description.trim().slice(0, 1200)}…`
      : input.tender.description.trim();

  const when = formatDateTime(input.generatedAt);

  return [
    `ԷԼԵԿՏՐՈՆԱՅԻՆ ՊԱՅՄԱՆԱԳԻՐ № ${input.contractRef}`,
    `Կնքման ամսաթիվ (գեներացում)՝ ${when}`,
    `Հարթակ՝ Tend.am (այսուհետ՝ «Հարթակ»)`,
    ``,
    `Սույն փաստաթուղթը կազմում է պարտադիր իրավական ուժ ունեցող համաձայնություն Հայաստանի Հանրապետության օրենսդրությամբ ճանաչելի պարտավորությունների շրջանակում՝ այն պահից, երբ երկու Կողմերն էլ Հարթակում սեղմում են «Համաձայն եմ / Հաստատել» և համակարգը գրանցում է երկու հաստատումները։`,
    ``,
    `1. ԿՈՂՄԵՐ`,
    ``,
    partyBlock("1.1. ՊԱՏՎԻՐԱՏՈՒ (այսուհետ՝ «Պատվիրատու»)", input.client),
    ``,
    partyBlock("1.2. ԿԱՏԱՐՈՂ (այսուհետ՝ «Կատարող»)", input.provider),
    ``,
    `2. ԱՌԱՐԿԱ`,
    `2.1. Պատվիրատուն պատվիրում է, իսկ Կատարողը պարտավորվում է կատարել հետևյալ աշխատանքը/ծառայությունը՝`,
    `Վերնագիր՝ ${input.tender.title}`,
    `Ոլորտ / ծառայություն՝ ${input.tender.category} · ${input.tender.service}`,
    `Վայր՝ ${place}`,
    `Մրցույթի նույնացուցիչ (Tend.am)՝ ${input.tender.id}`,
    ``,
    `2.2. Աշխատանքի նկարագրություն (մրցույթից)՝`,
    desc,
    ``,
    `2.3. Կատարողի առաջարկի ուղեկցող նամակ (ամփոփ)՝`,
    cover || "—",
    ``,
    `3. ԳԻՆ ԵՎ ԺԱՄԿԵՏ`,
    `3.1. Պայմանավորված գին՝ ${formatAmd(input.bid.price)} (ներառյալ Հարթակում գրանցված առաջարկի գումարը)։`,
    `3.2. Կատարման ժամկետ՝ ${timeline}՝ հաշված այն պահից, երբ սույն պայմանագիրը համարվում է կնքված (երկու հաստատում)։`,
    `3.3. Վճարման կարգը Կողմերը համաձայնեցնում են միմյանց միջև։ Հարթակը չի հանդիսանում վճարային երաշխավոր, եթե այլ բան հատուկ նախատեսված չէ Tend.am-ի պայմաններով։`,
    ``,
    `4. ԿՈՂՄԵՐԻ ՊԱՐՏԱՎՈՐՈՒԹՅՈՒՆՆԵՐ`,
    `4.1. Կատարողը պարտավորվում է աշխատանքը կատարել որակով, ժամկետում և համաձայն նկարագրության ու առաջարկի։`,
    `4.2. Պատվիրատուն պարտավորվում է տրամադրել անհրաժեշտ տեղեկություններ/մուտք և վճարել համաձայնեցված գինը։`,
    `4.3. Կողմերը պարտավորվում են չփոխանցել միմյանց անձնական տվյալները երրորդ անձանց առանց իրավական հիմքի։`,
    ``,
    `5. ՀԱՐԹԱԿԻ ԴԵՐ`,
    `5.1. Tend.am-ը միջնորդ հարթակ է մրցույթի և առաջարկների համար։ Սույն պայմանագրի կողմեր են Պատվիրատուն և Կատարողը։`,
    `5.2. Հարթակը պահում է սույն տեքստը, հաստատումների ժամանակները և կողմերի նույնականացման տվյալները՝ վեճերի դեպքում ապացույցի համար։`,
    ``,
    `6. ԿՆՔՈՒՄ ԵՎ ԷԼԵԿՏՐՈՆԱՅԻՆ ՀԱՍՏԱՏՈՒՄ`,
    `6.1. Պայմանագիրը կնքված է համարվում միայն այն պահին, երբ և՛ Պատվիրատուն, և՛ Կատարողը Հարթակում հաստատել են սույն տեքստը։`,
    `6.2. Մինչև երկու հաստատումը Կատարողը վերջնական ընտրված չի համարվում, և Պատվիրատուն կարող է չեղարկել առաջարկը։`,
    `6.3. Յուրաքանչյուր «Համաձայն եմ / Հաստատել» գործողություն համարվում է Կողմի էլեկտրոնային ընդունում՝ իրավական ուժով համարժեք գրավոր ստորագրությանը՝ Հարթակի օգտագործման պայմանների շրջանակում։`,
    ``,
    `7. ՎԵՋԵՐ`,
    `7.1. Վեճերը Կողմերը նախ ձգտում են լուծել բանակցությամբ։ Չլուծվելու դեպքում կիրառվում է ՀՀ օրենսդրությունը և իրավասու դատարանները։`,
    ``,
    `8. ԵԶՐԱՓԱԿԻՉ ԴՐՈՒՅԹՆԵՐ`,
    `8.1. Սույն տեքստը գեներացվել է ավտոմատ՝ մրցույթի և ընտրված առաջարկի տվյալների հիման վրա (կաղապարի տարբերակ՝ 1)։`,
    `8.2. Կողմերը հաստատում են, որ ծանոթացել են տեքստին ամբողջությամբ և համաձայն են պայմաններին։`,
    ``,
    `— Փաստաթղթի վերջ —`,
  ].join("\n");
}
