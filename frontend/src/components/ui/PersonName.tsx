"use client";
// A person as staff see them where they act on them: the name, then in
// small print the NetID (or `tag`, what else tells them apart) and, for
// admins, the email (lib/api/users Identity: the server sends it only to them),
// shown at once or, with `emailOnRequest`, behind a button.
import { useState } from "react";
import { FaEllipsisH } from "react-icons/fa";
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
          className="ml-1 p-0.5 align-middle rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label={emailShown ? "Hide email" : "Show email"}
          aria-expanded={emailShown}
          title={emailShown ? "Hide email" : "Show email"}
          onClick={() => setEmailShown((shown) => !shown)}
        >
          <FaEllipsisH className="h-3 w-3" />
        </button>
      )}
    </>
  );
}
