"use client";

import {
  Camera,
  Loader2,
  LockKeyhole,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneInput } from "@/components/phone-input";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

export type AccountProfileInitial = {
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  bio: string | null;
};

type Props = {
  initialProfile: AccountProfileInitial;
  /** false for Google-only accounts that never set a password */
  hasPassword: boolean;
};

export function AccountProfileSettings({
  initialProfile,
  hasPassword: hasPasswordInitial,
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const snapshot = JSON.stringify(initialProfile);
  const [name, setName] = useState(initialProfile.name ?? "");
  const [email, setEmail] = useState(initialProfile.email);
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [imageUrl, setImageUrl] = useState(initialProfile.image);
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [hasPassword, setHasPassword] = useState(hasPasswordInitial);

  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const resetPasswordModalState = useCallback(() => {
    setPasswordError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, []);

  const closePasswordModal = useCallback(() => {
    setPasswordModalOpen(false);
    resetPasswordModalState();
  }, [resetPasswordModalState]);

  const openPasswordModal = useCallback(() => {
    resetPasswordModalState();
    setPasswordModalOpen(true);
  }, [resetPasswordModalState]);

  useEffect(() => {
    if (!passwordModalOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !passwordSaving) {
        closePasswordModal();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [passwordModalOpen, passwordSaving, closePasswordModal]);

  useEffect(() => {
    const p = JSON.parse(snapshot) as AccountProfileInitial;
    setName(p.name ?? "");
    setEmail(p.email);
    setPhone(p.phone ?? "");
    setImageUrl(p.image);
    setBio(p.bio ?? "");
  }, [snapshot]);

  useEffect(() => {
    setHasPassword(hasPasswordInitial);
  }, [hasPasswordInitial]);

  const initialLetter = (
    name.trim().charAt(0) ||
    email.trim().charAt(0) ||
    "?"
  ).toUpperCase();

  async function syncSessionProfile(user: {
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    bio?: string | null;
  }) {
    await update({
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image ?? undefined,
    });
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileOk(false);
    setProfileSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        user?: AccountProfileInitial;
        requiresTelegramReverification?: boolean;
      } | null;
      if (!res.ok) {
        if (data?.error === "EMAIL_OR_PHONE_TAKEN") {
          const msg =
            "Այս էլ․ փոստը կամ հեռախոսահամարը արդեն զբաղեցված է։";
          setProfileError(msg);
          toastError("Զբաղված է", msg);
        } else {
          const msg = "Չհաջողվեց պահպանել։ Ստուգեք դաշտերը։";
          setProfileError(msg);
          toastError("Պահպանում չհաջողվեց", msg);
        }
        return;
      }
      if (data?.user) {
        const savedPhone = (data.user.phone ?? "").trim();
        const prevPhone = (initialProfile.phone ?? "").trim();
        const phoneActuallyChanged = savedPhone !== prevPhone;

        setName(data.user.name ?? "");
        setEmail(data.user.email);
        setPhone(data.user.phone ?? "");
        setImageUrl(data.user.image);
        setBio(data.user.bio ?? "");

        if (phoneActuallyChanged || data.requiresTelegramReverification) {
          toastSuccess(
            "Հեռախոսը թարմացվեց",
            "Ավարտեք Telegram վերիֆիկացիան՝ նոր համարով հաշիվը ակտիվացնելու համար։",
          );
          router.push(ROUTES.accountVerifyTelegram);
          router.refresh();
          return;
        }

        await syncSessionProfile(data.user);
        setProfileOk(true);
        toastSuccess("Պահպանվեց", "Պրոֆիլի տվյալները թարմացվել են։");
        router.refresh();
      }
    } catch {
      const msg = "Ցանցի խնդիր։";
      setProfileError(msg);
      toastError("Ցանց", msg);
    } finally {
      setProfileSaving(false);
    }
  }

  async function onPickAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.set("avatar", file);
      const res = await fetch("/api/account/profile/avatar", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        image?: string;
      } | null;
      if (!res.ok || !data?.image) {
        const msg =
          data?.error === "INVALID_IMAGE"
            ? "Թույլատրված են JPG, PNG, WebP՝ մինչև 5 ՄԲ։"
            : "Նկարի վերբեռնումը չհաջողվեց։";
        setAvatarError(msg);
        toastError("Նկար", msg);
        return;
      }
      setImageUrl(data.image);
      await update({ image: data.image });
      toastSuccess("Նկարը թարմացվեց", "Պրոֆիլի լուսանկարը փոխվել է։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setAvatarError(msg);
      toastError("Ցանց", msg);
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const res = await fetch("/api/account/profile/avatar", {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = "Չհաջողվեց հեռացնել նկարը։";
        setAvatarError(msg);
        toastError("Նկարը չհեռացվեց", msg);
        return;
      }
      setImageUrl(null);
      await update({ removeAvatar: true });
      toastSuccess("Նկարը հեռացվեց", "Պրոֆիլում այլևս նկար չի ցուցադրվում։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setAvatarError(msg);
      toastError("Ցանց", msg);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      const msg = "Նոր գաղտնաբառերը չեն համընկնում։";
      setPasswordError(msg);
      toastError("Չեն համընկնում", msg);
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/account/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasPassword
            ? { currentPassword, newPassword }
            : { newPassword },
        ),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        mode?: string;
      } | null;
      if (!res.ok) {
        if (data?.error === "WRONG_PASSWORD") {
          const msg = "Ընթացիկ գաղտնաբառը սխալ է։";
          setPasswordError(msg);
          toastError("Գաղտնաբառ", msg);
        } else {
          const msg = hasPassword
            ? "Չհաջողվեց փոխել գաղտնաբառը։"
            : "Չհաջողվեց սահմանել գաղտնաբառը։";
          setPasswordError(msg);
          toastError("Սխալ", msg);
        }
        return;
      }

      if (!hasPassword) {
        setHasPassword(true);
        toastSuccess(
          "Գաղտնաբառը սահմանված է",
          "Այժմ կարող եք մուտք գործել նաև հեռախոսով/email-ով և գաղտնաբառով։",
        );
        closePasswordModal();
        router.refresh();
        return;
      }

      toastSuccess(
        "Գաղտնաբառը փոխվեց",
        "Անվտանգության համար մուտք գործեք նորից։",
      );
      await signOut({ callbackUrl: ROUTES.login });
    } catch {
      const msg = "Ցանցի խնդիր։";
      setPasswordError(msg);
      toastError("Ցանց", msg);
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
          <div className="relative size-28 overflow-hidden rounded-3xl bg-slate-100 ring-2 ring-amber-100">
            {imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-3xl font-black text-slate-600">
                {initialLetter}
              </span>
            )}
            {avatarBusy ? (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <Loader2 className="size-8 animate-spin text-white" />
              </div>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) =>
              void onPickAvatar(e.target.files?.[0] ?? undefined)
            }
          />
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Camera className="size-3.5" />
              Նոր նկար
            </button>
            {imageUrl ? (
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => void removeAvatar()}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                Հեռացնել
              </button>
            ) : null}
          </div>
          {avatarError ? (
            <p className="text-center text-xs font-bold text-rose-700 sm:text-left">
              {avatarError}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            Անձնական տվյալներ
          </h2>
          <p className="text-sm font-semibold text-slate-600">
            Մուտք գործելիս միշտ օգտագործեք{" "}
            <span className="font-black text-slate-900">հեռախոսահամարը և գաղտնաբառը</span>
            ։ Հեռախոսը փոխելուց հետո դուրս կգաք համակարգից և պետք է նորից մուտք
            գործեք նոր համարով։
          </p>
          <Link
            href={ROUTES.accountVerification}
            className="inline-flex text-xs font-black text-amber-800 underline-offset-2 hover:underline"
          >
            Հաշվի վերիֆիկացիա / փաստաթղթեր →
          </Link>

          <form className="space-y-4" onSubmit={(e) => void saveProfile(e)}>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Անուն ազգանուն
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Էլ․ փոստ
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={160}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Հեռախոսահամար
              </span>
              <span className="mt-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <PhoneInput value={phone} onValueChange={setPhone} required />
              </span>
            </label>

            <label className="block">
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                  Իմ մասին
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {bio.length}/2000
                </span>
              </span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 2000))}
                rows={5}
                placeholder="Պատմեք ձեր փորձի, մասնագիտացման և մատուցվող ծառայությունների մասին։"
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            {profileError ? (
              <p className="text-sm font-bold text-rose-700">{profileError}</p>
            ) : null}
            {profileOk ? (
              <p className="text-sm font-bold text-emerald-700">
                Պրոֆիլը պահպանվեց։
              </p>
            ) : null}

            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 rounded-full bg-amber-700 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-amber-600 disabled:opacity-60"
            >
              {profileSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Պահպանել տվյալները
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              <LockKeyhole className="size-4 text-slate-400" />
              Գաղտնաբառ
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {hasPassword
                ? "Առաջարկվում է ուժեղ գաղտնաբառ՝ առնվազն 8 նիշ։ Փոխելուց հետո դուրս կգաք համակարգից և պետք է նորից մուտք գործեք։"
                : "Դուք մուտք եք գործել Google-ով և դեռ գաղտնաբառ չունեք։ Կարող եք սահմանել գաղտնաբառ՝ հետագայում նաև հեռախոսով մուտք գործելու համար։"}
            </p>
          </div>
          <button
            type="button"
            onClick={openPasswordModal}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            {hasPassword ? "Փոխել գաղտնաբառը" : "Սահմանել գաղտնաբառ"}
          </button>
        </div>
      </div>

      {passwordModalOpen ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center sm:p-6">
          <div
            role="presentation"
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => {
              if (!passwordSaving) closePasswordModal();
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            className="relative z-10 w-full max-w-md overflow-hidden rounded-4xl bg-white shadow-2xl shadow-slate-950/20 ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <h3
                id="password-modal-title"
                className="text-lg font-black text-slate-900"
              >
                {hasPassword ? "Նոր գաղտնաբառ" : "Սահմանել գաղտնաբառ"}
              </h3>
              <button
                type="button"
                disabled={passwordSaving}
                onClick={closePasswordModal}
                className="grid size-10 place-items-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                aria-label="Փակել"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <form
                className="grid gap-4"
                onSubmit={(e) => void savePassword(e)}
              >
                  {hasPassword ? (
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                        Ընթացիկ գաղտնաբառ
                      </span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      />
                    </label>
                  ) : null}
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                      {hasPassword ? "Նոր գաղտնաբառ" : "Գաղտնաբառ"}
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={128}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                      Կրկնել գաղտնաբառը
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={128}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>

                  {passwordError ? (
                    <p className="text-sm font-bold text-rose-700">
                      {passwordError}
                    </p>
                  ) : null}

                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={passwordSaving}
                      onClick={closePasswordModal}
                      className="rounded-full px-5 py-3 text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Չեղարկել
                    </button>
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-700 px-6 py-3 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-60"
                    >
                      {passwordSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Պահպանել
                    </button>
                  </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
