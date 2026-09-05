import { AccountTypeBadge } from "@/components/account-type-badge";
import type { AccountTypeValue } from "@/lib/account-type";
import {
  coverLetterCharSnippet,
  coverLetterSnippet,
  initialsFromMasked,
  maskApplicantDisplayName,
} from "@/lib/bid-teaser";

export type TenderApplicantTeaserBid = {
  id: string;
  coverLetter: string;
  provider: {
    name: string | null;
    image: string | null;
    accountType: AccountTypeValue;
  };
};

type Props = {
  bids: TenderApplicantTeaserBid[];
  /** Ընդհանուր առաջարկների թիվը (կարող է գերազանցել bids երկարությունը take-ից հետո) */
  totalBidCount: number;
  /** Փակ մրցույթում նամակի տեքստը՝ միայն 15 տառ */
  isBlindBidding?: boolean;
};

export function TenderApplicantTeasers({
  bids,
  totalBidCount,
  isBlindBidding = false,
}: Props) {
  if (totalBidCount === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center ring-1 ring-slate-100">
        <p className="text-sm font-black text-slate-700">
          Դեռ առաջարկներ չեն ստացվել
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Եղեք առաջինը, ով կդիմի այս մրցույթին։
        </p>
      </section>
    );
  }

  const remainder = Math.max(0, totalBidCount - bids.length);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Մասնակիցների ակտիվություն
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-700">
            Այս մրցույթին արդեն դիմել են{" "}
            <span className="font-black text-slate-900">{totalBidCount}</span>{" "}
            մասնագետ
          </p>
        </div>
      </div>

      <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
        {isBlindBidding
          ? "Փակ առաջարկներ՝ անունները և նամակները ցուցադրվում են խիստ ընդհատված։"
          : "Անունները, լուսանկարները և նամակները ցուցադրվում են ընդհատված՝ գաղտնիության համար։"}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bids.map((bid) => {
          const masked = maskApplicantDisplayName(bid.provider.name);
          const letter = initialsFromMasked(masked);
          const snippet = isBlindBidding
            ? coverLetterCharSnippet(bid.coverLetter, 15)
            : coverLetterSnippet(bid.coverLetter, 8);

          return (
            <li
              key={bid.id}
              className="flex gap-3 rounded-3xl bg-linear-to-br from-white to-slate-50 p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-slate-200 ring-2 ring-white shadow-inner">
                {bid.provider.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={bid.provider.image}
                    alt=""
                    className="size-full scale-125 object-cover opacity-90 blur-[5px]"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-lg font-black text-slate-500 blur-[0.5px]">
                    {letter}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-black text-slate-900">
                    {masked}
                  </p>
                  <AccountTypeBadge accountType={bid.provider.accountType} />
                </div>
                <p className="mt-1 truncate text-xs font-semibold leading-snug text-slate-600">
                  «{snippet}»
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {remainder > 0 ? (
        <p className="text-center text-xs font-bold text-slate-500">
          Եվ այլ մասնակիցներ՝ ընդհանուր{" "}
          <span className="font-black text-slate-800">{remainder}</span>
        </p>
      ) : null}
    </section>
  );
}
