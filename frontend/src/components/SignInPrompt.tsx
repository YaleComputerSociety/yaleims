"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Shown in place of content that needs a signed-in user. The sign-in link
 * returns to the current page afterwards.
 */
const SignInPrompt: React.FC<{ message: string }> = ({ message }) => {
  const pathname = usePathname() || "/";
  return (
    <div className="mx-auto my-10 max-w-md rounded-xl border border-blue-500/30 dark:border-blue-400/30 bg-blue-500/10 dark:bg-blue-500/5 px-6 py-6 flex flex-col items-center gap-4 text-center">
      <p className="text-gray-700 dark:text-gray-300">{message}</p>
      <Link
        href={`/api/auth/login?from=${encodeURIComponent(pathname)}`}
        prefetch={false}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
      >
        Sign in
      </Link>
    </div>
  );
};

export default SignInPrompt;
