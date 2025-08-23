import Link from 'next/link';
import { useUser } from '../context/UserContext'
import { useTheme } from 'next-themes';
import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";
import { useNavbar } from '@src/context/NavbarContext';
import { FaSignOutAlt } from "react-icons/fa";


const UserMenu: React.FC<{ name: string }> = ({ name }) => {
  const first = (name ?? "").split(" ")[0] || "Friend";
  const { casSignOut } = useUser()


  return (
    <div className="relative group">
      <div
        className="py-1 px-3 border rounded-lg cursor-pointer border-blue-600 text-blue-600 hover:text-blue-400 hover:border-blue-400 flex items-center gap-2"
        aria-haspopup="menu"
      >
        Welcome, {first}!
      </div>
      <div
        role="menu"
        className="
        absolute right-0 w-full rounded-lg border border-blue-600/40 p-2 gap-y-1
        bg-white text-gray-800 shadow-xl dark:bg-slate-900 dark:text-gray-100
        opacity-0 scale-95 translate-y-1 pointer-events-none
        transition-all duration-150 ease-out z-50
        group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto
        group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto
        "
      >
        {/* <Link
            href={"/profile"} 
            className="flex text-left p-1 gap-x-2 items-center rounded-lg hover:bg-gray-200 text-sm w-full dark:hover:bg-slate-800" 
            role="menuitem"    
        > 
            <CgProfile />
            View Profile
        </Link> */}
        <button 
            className="flex text-left p-1 gap-x-2 items-center rounded-lg hover:bg-gray-200 text-sm w-full dark:hover:bg-slate-800" 
            role="menuitem"
            onClick={casSignOut}
        >
            <FaSignOutAlt />
            Sign out
        </button>
      </div>
    </div>
  );
};



interface PageHeadingProps {
    heading: string;
}

export default function PageHeading({ heading }: PageHeadingProps) {
    const { user, loading } = useUser();
    const { theme, setTheme } = useTheme();
    const { collapsed } = useNavbar()

    return (
        <div className={`transition-all duration-200 md:fixed md:top-0 md:z-50 flex flex-row ${collapsed ? "w-[95%]" : "w-[84%]"} md:p-3 md:px-6 p-4 px-4 backdrop-blur-sm`}>
            <div className='w-full flex flex-row justify-between items-center'>
                <h1 className="md:text-3xl text-2xl font-bold">{heading}</h1>
                <div className="hidden md:flex flex-row gap-x-5 items-center">
                    <button
                        onClick={() => theme === "light" ? setTheme('dark') : setTheme('light')}
                        className="rounded transition-colors text-center"
                        aria-label="Toggle Light/Dark Mode"
                    >
                        {theme === "light" ? (
                        <MdOutlineLightMode
                            className="text-gray-800 hover:text-blue-400"
                            size={24}
                        />) : (         
                        <MdDarkMode
                            className="text-gray-100 hover:text-yellow-300"
                            size={24}
                        />)
                        }
                    </button>
                    {loading ? (
                        <div className="animate-pulse text-gray-800 dark:text-gray-300">
                            Loading...
                        </div>
                    ) : user ? (
                        <UserMenu name={user.name} />
                    ) : (
                        <Link
                            className={`px-3 rounded border cursor-pointer ${
                                theme === "light"
                                ? "border-black hover:border-gray-400 hover:text-gray-400"
                                : "border-gray-200 hover:border-gray-400  hover:text-gray-400 text-gray-100"
                            }`}
                            href='api/auth/login'
                        >
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}