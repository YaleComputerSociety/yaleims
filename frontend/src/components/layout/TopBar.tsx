"use client";
// The bar across the top of every page (app/layout.tsx mounts it once),
// over the content column: on the right the Yale apps menu, the theme
// switch and the account button (YALEMOJI-PLAN Y1); on phones, on the left,
// the menu button that unfolds the site's links (the desktop sidebar is
// NavBar). The page's title is the page's own (PageHeading): on desktops it
// is drawn in this bar's row, at its left.
// Its heights (46px on phones, 60px on desktops) are what the pages leave
// room for, and what the sticky day headers of /games stick under
// (GamesByDay: top-11 md:top-14).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IoIosMenu, IoMdClose } from "react-icons/io";
import { useNavbar } from "@/context/NavbarContext";
import { useSession } from "@/context/SessionContext";
import { signInUrl } from "@/lib/api/auth";
import AppsMenu from "./AppsMenu";
import { NAV_LINKS } from "./NavBar";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";

export default function TopBar() {
  const { collapsed } = useNavbar();
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // Any page change closes the phone menu (adjusting state while rendering, as React recommends over an effect).
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setMenuOpen(false);
  }

  return (
    <header className={`fixed top-0 right-0 z-50 w-full transition-all duration-200 ${collapsed ? "md:w-[95%]" : "md:w-[84%]"}`}>
      <div
        className={`h-[46px] md:h-[60px] flex items-center justify-between px-3 md:px-8 backdrop-blur-sm md:bg-transparent ${
          menuOpen ? "bg-white dark:bg-black" : "bg-white/50 dark:bg-black/50"
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Menu"}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          className="md:hidden text-gray-800 dark:text-gray-100"
        >
          {menuOpen ? <IoMdClose size={30} /> : <IoIosMenu size={30} />}
        </button>
        {/* While the phone menu is open, it alone shows (Y1). */}
        <div className={`${menuOpen ? "hidden md:flex" : "flex"} ml-auto items-center gap-2 md:gap-3`}>
          <AppsMenu />
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </div>
      {menuOpen && <PhoneMenu pathname={pathname} onNavigate={() => setMenuOpen(false)} />}
    </header>
  );
}

/** The site's links, unfolded under the bar on phones; signed out, the Sign In button too. */
function PhoneMenu({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const { viewer, loading } = useSession();
  return (
    <nav id="site-menu" className="md:hidden bg-white dark:bg-black flex flex-col pt-2 pb-4 px-3 space-y-4 rounded-b-lg shadow-lg">
      {NAV_LINKS.map((link) =>
        link.external ? (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className="text-center font-medium hover:text-slate-300 dark:hover:text-blue-300 transition duration-200">
            {link.text}
          </a>
        ) : (
          <Link key={link.href} href={link.href} onClick={onNavigate} className="text-center font-medium hover:text-slate-300 dark:hover:text-blue-300 transition duration-200">
            {link.text}
          </Link>
        )
      )}
      {!loading && !viewer && (
        <Link
          className="block w-full text-center bg-white dark:bg-yellow-500 text-blue-700 dark:text-gray-900 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-yellow-600 transition duration-200"
          href={signInUrl(pathname)}
          prefetch={false}
        >
          Sign In
        </Link>
      )}
    </nav>
  );
}
