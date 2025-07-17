import Link from 'next/link';
import { useUser } from '../context/UserContext'
import { useTheme } from 'next-themes';

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
    const { theme } = useTheme();

    return (
        <div className='fixed top-0 z-50 flex flex-row w-[84%] transition-all p-4 justify-between items-center backdrop-blur-sm'>
            <h1 className="md:text-3xl text-xl font-bold text-center">{heading}</h1>
            <div className=" transition-all">
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