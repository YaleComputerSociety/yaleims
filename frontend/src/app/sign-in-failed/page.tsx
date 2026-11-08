// Where a Yale sign-in that didn't finish lands (api/auth/redirect): what
// happened, and a way to try again.
import Link from "next/link";
import type { LoginProblem } from "@/server/login";

const EXPLANATIONS: Record<LoginProblem, string> = {
  expired:
    "This sign-in timed out or was finished in another tab. A sign-in works once, in the browser that started it, within 10 minutes.",
  refused: "Yale didn't confirm this sign-in.",
  unavailable: "Yale's sign-in isn't responding right now. Please try again in a minute.",
};

export default async function SignInFailed({ searchParams }: { searchParams: Promise<{ problem?: string }> }) {
  const { problem } = await searchParams;
  const known = problem !== undefined && Object.hasOwn(EXPLANATIONS, problem);
  const explanation = EXPLANATIONS[known ? (problem as LoginProblem) : "unavailable"];
  return (
    <main className="mt-20 min-h-screen px-4">
      <div className="mx-auto my-10 max-w-md rounded-xl border border-blue-500/30 dark:border-blue-400/30 bg-blue-500/10 dark:bg-blue-500/5 px-6 py-6 flex flex-col items-center gap-4 text-center">
        <h1 className="text-xl font-semibold">Sign-in didn&apos;t finish</h1>
        <p className="text-gray-700 dark:text-gray-300">{explanation}</p>
        <Link
          href="/api/auth/login"
          prefetch={false}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          Sign in again
        </Link>
        <Link href="/" className="text-sm text-blue-700 dark:text-blue-300 hover:underline">
          Back to the homepage
        </Link>
      </div>
    </main>
  );
}
