"use client";
// A person as staff see them where they act on them: the name, then in
// small print the NetID (or `tag`, what else tells them apart) and, for
// admins, the email (lib/api/users Identity: the server sends it only to them),
// shown at once or, with `emailOnRequest`, behind a button.
import { useState } from "react";
import type { Identity } from "@/lib/api/users";

export default function PersonName({ person, tag, emailOnRequest = false }: { person: Identity; tag?: string; emailOnRequest?: boolean }) {
  const [emailShown, setEmailShown] = useState(!emailOnRequest);
  const details = [tag ?? person.netid, emailShown ? person.email : null].filter(Boolean);
  return (
    <>
      {person.name}
      {details.length > 0 && <> <span className="text-xs font-normal text-gray-500 break-all">({details.join(" · ")})</span></>}
      {emailOnRequest && person.email && (
        <button
          type="button"
          className="ml-1.5 align-middle rounded-full px-2 py-0.5 text-xs font-normal whitespace-nowrap bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-expanded={emailShown}
          onClick={() => setEmailShown((shown) => !shown)}
        >
          {emailShown ? "hide email" : "show email"}
        </button>
      )}
    </>
  );
}
