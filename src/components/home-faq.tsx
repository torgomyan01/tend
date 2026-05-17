import { ChevronDown, HelpCircle } from "lucide-react";

const faqItems = [
  {
    q: "Որքա՞ն արժե մրցույթ տեղադրելը։",
    a: "Մրցույթ տեղադրելը պատվիրատուի համար ամբողջությամբ անվճար է։ Դուք վճարում եք միայն այն ժամանակ, երբ ընտրում եք կատարողին և սկսում աշխատանքը։",
  },
  {
    q: "Ինչպե՞ս են աշխատում փակ առաջարկները։",
    a: "Մինչև մրցույթի փակվելը կամ քո կողմից հաղթողի ընտրությունը՝ մասնագետները չեն տեսնում միմյանց գները։ Սա ապահովում է արդար մրցակցություն և տալիս է քեզ ավելի լավ պայմաններ։",
  },
  {
    q: "Ինչպե՞ս կարող եմ վստահել մասնագետին։",
    a: "Մասնագետները ունեն իրական պրոֆիլներ՝ վարկանիշով, ավարտված մրցույթներով և կարծիքներով։ Կարող ես տեսնել նրանց պորտֆոլիոն և մինչև ընտրությունը հարցեր ուղղել։",
  },
  {
    q: "Ի՞նչ է լինում, եթե մասնագետը չի կատարում աշխատանքը։",
    a: "Մեր թիմը միջամտում է վեճերի դեպքում։ Կարող ես բողոք ուղարկել, իսկ մենք ստուգում ենք գործը և անհրաժեշտության դեպքում սահմանափակում ենք խախտող մասնագետի հաշիվը։",
  },
  {
    q: "Ե՞րբ է վճարում մասնագետը։",
    a: "Մասնագետը վճարում է միայն այն ժամանակ, երբ ուղարկում է առաջարկ՝ մեկ հաստատուն գնով կամ ամսական բաժանորդագրությունից։ Առաջին 3 մասնակցությունը անվճար է։",
  },
  {
    q: "Կարո՞ղ եմ խմբագրել արդեն տեղադրված մրցույթը։",
    a: "Այո, քանի դեռ առաջարկներ չկան՝ կարող ես ազատ խմբագրել մրցույթը։ Առաջարկներից հետո՝ սահմանափակ դաշտերը մնում են խմբագրելի՝ խաբեության խուսափման համար։",
  },
];

export function HomeFaq() {
  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-amber-800">
            <HelpCircle className="size-3.5" />
            Հաճախ տրվող հարցեր
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Ամեն ինչ, ինչ պետք է իմանաս՝ սկսելուց առաջ։
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
            Չե՞ս գտել քո հարցի պատասխանը։ Գրիր մեզ՝ կպատասխանենք 24 ժամվա
            ընթացքում, և եթե հարցդ ընդհանուր է՝ կավելացնենք այս ցուցակում։
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <details
              key={item.q}
              className="group rounded-3xl bg-white p-1 shadow-sm ring-1 ring-slate-200 transition open:ring-amber-300 open:shadow-lg"
              {...(index === 0 ? { open: true } : {})}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-5 text-left text-base font-black text-slate-950 sm:text-lg">
                <span className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xs font-black text-slate-500 group-open:bg-amber-200 group-open:text-amber-900">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.q}
                </span>
                <ChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180 group-open:text-amber-700" />
              </summary>
              <p className="px-5 pb-5 text-sm leading-7 text-slate-600 sm:text-base">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
