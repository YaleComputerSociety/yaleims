// The desktop sidebar: the logo and the site's links (collapsible). On
// phones the same links unfold from the top bar's menu button (TopBar);
// the account controls are in the top bar on both.
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useNavbar } from "@/context/NavbarContext";
import { getVersionedImage } from "@/lib/images";
import { FaQuestionCircle } from "react-icons/fa";
import { IoInformationCircleOutline } from "react-icons/io5";
import { LuLayoutDashboard } from "react-icons/lu";
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight, MdOutlineLeaderboard, MdOutlineSportsScore, MdSports } from "react-icons/md";
import { TbBrackets, TbTournament } from "react-icons/tb";
import { VscFeedback } from "react-icons/vsc";

/** The site's pages, in menu order (the sidebar and the phone menu). */
export const NAV_LINKS: { href: string; text: string; icon: React.ReactNode; external?: boolean }[] = [
  { href: "/hub", text: "Hub", icon: <LuLayoutDashboard /> },
  { href: "/", text: "Leaderboard", icon: <MdOutlineLeaderboard /> },
  { href: "/games", text: "Games", icon: <MdSports /> },
  { href: "/brackets", text: "Playoff Brackets", icon: <TbBrackets /> },
  { href: "/events", text: "Special Events", icon: <TbTournament /> },
  { href: "/about-us", text: "About Us", icon: <IoInformationCircleOutline /> },
  { href: "/about-sports", text: "About Sports", icon: <MdOutlineSportsScore /> },
  { href: "/faq", text: "FAQ", icon: <FaQuestionCircle /> },
  { href: "https://yaleims.canny.io", text: "Feedback", icon: <VscFeedback />, external: true },
];

const NavBar: React.FC = () => {
  const { collapsed, onToggleCollapse } = useNavbar();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href.startsWith("http")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const baseLink = "transition-all flex items-center p-2 rounded-md";
  const hoverLink = "hover:bg-slate-300 dark:hover:bg-slate-800";
  const activeLink = "bg-blue-600 text-yellow-500 text-white dark:bg-slate-800 dark:text-yellow-500 font-semibold";

  const widthClass = collapsed ? "md:w-[5%]" : "md:w-[16%]";

  return (
    <nav className={`hidden md:block transition-all duration-200 ${collapsed ? 'mg:p-2' : 'mg:p-5'} p-2 z-50 items-center ${widthClass} h-full fixed backdrop-blur-sm bg-white/50 dark:bg-black/50`}>
      <div className={`flex flex-col justify-between h-full ${collapsed ? "items-center" : "items-left"}`}>
        <div className="text-base pb-10 flex flex-row justify-between ">
            {collapsed ? <Image className="pt-6" src={getVersionedImage("/favicon.ico")} width={40} height={40} alt="Logo"/> :
            <Image 
              src={getVersionedImage("/LOGO.png")}
              width={130} 
              height={130} 
              alt="YALE IMS"
            />}
        </div>
        
        <div className={`flex mp:text-base text-sm flex-col space-y-1 ${collapsed ? "items-center" : "items-left"}`}>
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
            <Link
              key={link.href}
              href={link.href}
              className={`${baseLink} ${active ? activeLink : hoverLink}`}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {collapsed ? 
                <span className="text-lg">{link.icon}</span> : 
                <>
                  <span className="mp:pr-2 pr-1">{link.icon}</span>
                  {link.text}
                </>}
            </Link>)
          })}
        </div>
        <button
          onClick={onToggleCollapse}
          className={`mb-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md mt-auto ${collapsed? "items-center" : "ml-auto"}`}
          aria-label="Toggle Collapse"
        >
          {collapsed ? <MdOutlineKeyboardArrowRight size={24} /> : <MdOutlineKeyboardArrowLeft size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
