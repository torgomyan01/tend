import { Mail, Phone } from "lucide-react";
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONES,
  supportPhoneHref,
} from "@/lib/support-contact";

type Props = {
  className?: string;
  showLabel?: boolean;
};

export function SupportContactLinks({ className = "", showLabel = false }: Props) {
  return (
    <div className={className}>
      {showLabel ? (
        <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Աջակցություն
        </p>
      ) : null}
      <ul className="space-y-2.5 text-sm font-semibold text-slate-700">
        {SUPPORT_PHONES.map((phone) => (
          <li key={phone.dial}>
            <a
              href={supportPhoneHref(phone.dial)}
              className="inline-flex items-center gap-2.5 transition hover:text-amber-800"
            >
              <Phone className="size-4 shrink-0 text-amber-700" aria-hidden />
              <span>{phone.display}</span>
            </a>
          </li>
        ))}
        <li>
          <a
            href={SUPPORT_EMAIL_HREF}
            className="inline-flex items-center gap-2.5 transition hover:text-amber-800"
          >
            <Mail className="size-4 shrink-0 text-amber-700" aria-hidden />
            <span>{SUPPORT_EMAIL}</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
