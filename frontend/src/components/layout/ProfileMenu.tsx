"use client";
// The account button at the right of the top bar, the same on phones and
// computers (YALEMOJI-PLAN Y1). Its picture is the first one available: the
// person's Yalemoji (lib/yalemojiCache.ts), their initials (only from a
// recorded name: session `named`), a generic user icon. Its menu: that
// picture large, with a link to edit the Yalemoji or to make one, then
// Profile, Confetti (while a champion celebration is live) and Sign out.
// Signed out, it is the Sign In link.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import { PiConfetti } from "react-icons/pi";
import { useSession } from "@/context/SessionContext";
import { useChampionship } from "@/hooks/useChampionship";
import { setConfettiEnabled, useConfettiEnabled } from "@/hooks/useConfettiEnabled";
import { signInUrl, type SessionViewer } from "@/lib/api/auth";
import type { YalemojiAvatar } from "@/lib/api/me";
import { initialsOf } from "@/lib/format";
import { useYalemoji } from "@/lib/yalemojiCache";
import YalemojiLink from "./YalemojiLink";
import { useMenu } from "./useMenu";

export default function ProfileMenu() {
  const { viewer, loading } = useSession();
  const pathname = usePathname() || "/";
  if (loading) return <span className="block size-[38px] rounded-[9px] bg-gray-200 dark:bg-gray-800 animate-pulse" />;
  if (!viewer) {
    return (
      <Link
        className="py-1.5 px-4 rounded-xl border text-sm font-medium transition-colors duration-200 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400"
        href={signInUrl(pathname)}
        prefetch={false}
      >
        Sign In
      </Link>
    );
  }
  return <AccountMenu viewer={viewer} />;
}

const itemClass =
  "flex w-full items-center gap-3 py-2 px-3 rounded-lg text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150";

function AccountMenu({ viewer }: { viewer: SessionViewer }) {
  const { signOut } = useSession();
  const { open, ref, toggle, close } = useMenu();
  const yalemoji = useYalemoji(viewer.netid);
  // A PNG that fails to load (gone, blocked) falls back to the initials.
  const [brokenPng, setBrokenPng] = useState<string | null>(null);
  const avatar = yalemoji && yalemoji.pngUrl !== brokenPng ? yalemoji : null;
  const initials = viewer.named ? initialsOf(viewer.name) : "";
  const onBroken = () => setBrokenPng(yalemoji?.pngUrl ?? null);

  return (
    <div className="flex items-center md:relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls="account-menu"
        className="relative size-[38px] grid place-items-center overflow-hidden rounded-[9px] bg-blue-600 hover:bg-blue-700 aria-expanded:bg-blue-700 text-white font-bold transition-colors"
      >
        <Picture avatar={avatar} initials={initials} large={false} onBroken={onBroken} />
      </button>
      {open && (
        <div
          id="account-menu"
          className="fixed inset-x-2 top-[50px] md:absolute md:inset-x-auto md:right-0 md:top-[48px] md:w-[220px] z-50 overflow-hidden rounded-[18px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg motion-safe:animate-menu-in"
        >
          <div className="relative min-h-[168px] md:min-h-[108px] flex flex-col items-center justify-center overflow-hidden bg-blue-600 text-white px-4 py-3">
            <Picture avatar={avatar} initials={initials} large onBroken={onBroken} />
            {avatar ? (
              <YalemojiLink
                page="editor"
                onClick={close}
                aria-label="Edit your Yalemoji"
                title="Edit your Yalemoji"
                className="absolute bottom-2.5 right-2.5 size-7 grid place-items-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] hover:drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a static icon */}
                <img src="/apps-panel/yalemoji-edit.svg" alt="" width={20} height={16} />
              </YalemojiLink>
            ) : (
              // Only once Yalemoji has said they have none: while it's down, the menu doesn't urge them.
              yalemoji === null && (
                <YalemojiLink
                  page="create"
                  onClick={close}
                  className="relative mt-2.5 py-1.5 px-3.5 rounded-full border border-white bg-white text-blue-600 text-xs font-semibold hover:bg-transparent hover:text-white transition-colors duration-300"
                >
                  Make your Yalemoji
                </YalemojiLink>
              )
            )}
          </div>
          <div className="p-1.5">
            <Link href="/profile" onClick={close} className={itemClass}>
              <FaUser className="text-xs text-blue-600 dark:text-blue-400" />
              Profile
            </Link>
            <ConfettiItem />
            <button type="button" onClick={() => { close(); void signOut(); }} className={`${itemClass} hover:text-red-600 dark:hover:text-red-400`}>
              <FaSignOutAlt className="text-xs text-red-500" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The avatar (its square background, the face over it), or the initials, or
 * the user icon. Yalemoji backgrounds stretch to any box
 * (preserveAspectRatio="none"), so the background is always drawn square:
 * the button's 38 px, or as wide as the menu's header, centered.
 */
function Picture({ avatar, initials, large, onBroken }: {
  avatar: YalemojiAvatar | null;
  initials: string;
  large: boolean;
  onBroken: () => void;
}) {
  if (!avatar) {
    if (!initials) return <FaUser className={large ? "text-3xl my-1" : "text-[15px]"} aria-hidden />;
    return <span className={`scale-x-[0.8] leading-none ${large ? "text-4xl" : "text-base"}`} aria-hidden>{initials}</span>;
  }
  /* eslint-disable @next/next/no-img-element -- Yalemoji's public images, as they are (images.unoptimized) */
  return (
    <>
      <img src={avatar.backgroundUrl} alt="" className="absolute left-0 top-1/2 w-full aspect-square -translate-y-1/2" />
      <img
        src={avatar.pngUrl}
        alt={large ? "Your Yalemoji" : ""}
        onError={onBroken}
        className={`relative object-contain ${large ? "size-40 md:size-[104px]" : "size-full"}`}
      />
    </>
  );
  /* eslint-enable @next/next/no-img-element */
}

/** The champion celebration's confetti switch, only while one is live (per browser). */
function ConfettiItem() {
  const enabled = useConfettiEnabled();
  const { championCollegeId, celebrationActive } = useChampionship();
  if (!celebrationActive || !championCollegeId) return null;
  return (
    <button type="button" role="switch" aria-checked={enabled} onClick={() => setConfettiEnabled(!enabled)} className={`${itemClass} justify-between`}>
      <span className="flex items-center gap-3">
        <PiConfetti className="text-sm text-amber-500" />
        Confetti
      </span>
      <span className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors ${enabled ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`}>
        <span className={`inline-block size-3 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-1"}`} />
      </span>
    </button>
  );
}
