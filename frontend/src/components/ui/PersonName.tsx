// A person as staff see them where they act on them: the name, then in
// small print the NetID (or `tag`, what else tells them apart) and, for
// admins, the email (lib/api/users Identity: the server sends it only to them).
import type { Identity } from "@/lib/api/users";

export default function PersonName({ person, tag }: { person: Identity; tag?: string }) {
  const details = [tag ?? person.netid, person.email].filter(Boolean);
  return (
    <>
      {person.name}
      {details.length > 0 && <> <span className="text-xs font-normal text-gray-500 break-all">({details.join(" · ")})</span></>}
    </>
  );
}
