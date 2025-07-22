import Link from 'next/link';
import { useUser } from '../context/UserContext'
import { useTheme } from 'next-themes';
import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";

const UserProfileButton: React.FC<{ name: string }> = ({ name }) => {
  return (
    <Link
      href="/profile"
      className="mt-3 py-1 px-3 hover:text-blue-400 border rounded-lg border-blue-600 hover:border-blue-400 text-blue-600"
    >
      Welcome, {name.split(" ")[0]}!
    </Link>
  );
};


interface PageHeadingProps {
    heading: string;
}

export default function PageHeading({ heading }: PageHeadingProps) {
    const { user, loading } = useUser();
    const { theme, setTheme } = useTheme();

    return (
        <div className='md:fixed md:top-0  md:z-50 flex flex-row w-[84%] transition-all md:p-2 p-4 justify-between items-center backdrop-blur-sm'>
            <h1 className="md:text-3xl text-2xl font-bold">{heading}</h1>
            <div className=" transition-all hidden md:flex gap-x-5 items-center">
                <button
                    onClick={() => theme === "light" ? setTheme('dark') : setTheme('light')}
                    className="mt-2 rounded transition-colors text-center"
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
                    <UserProfileButton name={user.name} />
                ) : (
                    <Link
                    className={`py-1.5 px-3 rounded border cursor-pointer ${
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
    )
}