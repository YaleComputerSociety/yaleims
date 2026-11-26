"use client";
// The nine-dot "Yale apps" menu of the top bar: the y/cs apps, in the same
// list and order as Yalies' (apps/web/src/components/AppsDropdown.tsx; the
// icons in public/apps-panel are Yalies', MIT, LICENSE-yalies.txt there).
// Other apps open in a new tab; Yale IMs itself is a link home.
import Link from "next/link";
import YalemojiLink from "./YalemojiLink";
import { useMenu } from "./useMenu";

interface App {
  name: string;
  /** Absent: Yalemoji (YalemojiLink adds ref and mode). A path: this site. */
  href?: string;
  icon: string;
  /** Size and nudges that make the icons look the same size (they're drawn differently). */
  iconClass?: string;
}

const APPS: App[] = [
  { name: "CourseTable", href: "https://coursetable.com", icon: "coursetable.svg" },
  { name: "Yalies", href: "https://yalies.io", icon: "yalies.png" },
  { name: "YaleMeals", href: "https://apps.apple.com/us/app/yalemeals/id6755962674", icon: "yale-menus.png", iconClass: "size-[52px] max-w-none -translate-y-[5px]" },
  { name: "ymeets", href: "https://ymeets.com", icon: "ymeetslogo.png", iconClass: "rounded-lg" },
  { name: "Yalemoji", icon: "yalemoji-waffle.png", iconClass: "size-10 rounded-lg" },
  { name: "y/labs", href: "https://yalelabs.io", icon: "ylabs.png", iconClass: "-translate-y-0.5" },
  { name: "YaleIMs", href: "/", icon: "yaleims.png", iconClass: "-translate-y-0.5" },
  { name: "YaleClubs", href: "https://yaleclubs.io", icon: "yclubs.svg" },
];

const tileClass =
  "min-w-0 py-2 px-0.5 flex flex-col items-center gap-2 rounded-[10px] text-xs text-center text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800";

export default function AppsMenu() {
  const { open, ref, toggle, close } = useMenu();
  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Yale apps"
        aria-expanded={open}
        className="size-[30px] grid place-items-center rounded-[7px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 aria-expanded:bg-gray-100 dark:aria-expanded:bg-gray-800"
      >
        <span className="grid grid-cols-[repeat(3,5px)] gap-[3px]" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="size-[5px] rounded-full bg-current" />
          ))}
        </span>
      </button>
      {open && (
        <div className="absolute top-[42px] -right-[50px] z-50 w-[270px] max-w-[calc(100vw-16px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg motion-safe:animate-menu-in">
          <div className="grid grid-cols-3 gap-0.5 px-2 pt-3.5 pb-2.5">
            {APPS.map((app) => {
              const icon = (
                <span className="size-[46px] grid place-items-center" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static icons (images.unoptimized) */}
                  <img src={`/apps-panel/${app.icon}`} alt="" className={`size-[34px] object-contain ${app.iconClass ?? ""}`} />
                </span>
              );
              if (!app.href) {
                return (
                  <YalemojiLink key={app.name} page="home" className={tileClass} onClick={close}>
                    {icon}
                    {app.name}
                  </YalemojiLink>
                );
              }
              if (app.href.startsWith("/")) {
                return (
                  <Link key={app.name} href={app.href} className={tileClass} onClick={close}>
                    {icon}
                    {app.name}
                  </Link>
                );
              }
              return (
                <a key={app.name} href={app.href} target="_blank" rel="noopener noreferrer" className={tileClass} onClick={close}>
                  {icon}
                  {app.name}
                </a>
              );
            })}
          </div>
          <p className="pb-3 text-center text-xs text-gray-500 dark:text-gray-400">
            Yale IMs is a{" "}
            <a href="https://yalecomputersociety.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">
              y/cs
            </a>{" "}
            product
          </p>
        </div>
      )}
    </div>
  );
}
