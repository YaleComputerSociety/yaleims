"use client";

import PageHeading from "@/components/layout/PageHeading";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useSeason } from "@/context/SeasonContext";
import { fetchCollegePlayers } from "@/lib/api/colleges";
import { fetchRoleHolders, setUserRoles, userRolesSchema, type RoleHolder } from "@/lib/api/users";
import { COLLEGES, collegeName } from "@/lib/colleges";
import { placeholderNetid } from "@/lib/netid";

// Available roles for the multi-select dropdown
const ALL_ROLES = ["admin", "dev", "supervisor", "college_rep", "captain", "user"];

/** The groups listing everyone holding a role; any other group is a college. */
const ROLE_GROUPS: Record<string, "admin" | "dev" | "supervisor"> = { Admin: "admin", Dev: "dev", Supervisor: "supervisor" };

/** The roles PUT /api/users/{email}/roles stores ("user" and "captain" aren't stored roles). */
const STORED_ROLES = userRolesSchema.shape.roles.element.options;
type StoredRole = (typeof STORED_ROLES)[number];

/** Someone listed: their roles as one list ("user", global, this season's, "captain") and their captaincies (sport ids). */
interface Person {
  email: string;
  name: string;
  college: string | null;
  roles: string[];
  captainOf: string[];
}

const rolesOf = (globalRoles: string[], seasonRoles: string[], captainOf: string[]) => [
  "user",
  ...globalRoles,
  ...seasonRoles,
  ...(captainOf.length > 0 ? ["captain"] : []),
];

const personOf = (holder: RoleHolder): Person => ({
  email: holder.id,
  name: `${holder.firstname} ${holder.lastname}`,
  college: collegeName(holder.player?.collegeId),
  roles: rolesOf(holder.roles, holder.player?.roles ?? [], holder.captainOf),
  captainOf: holder.captainOf,
});

/**
 * The people of a group: a role group lists everyone holding that role; a
 * college name lists all the college's players this season (the page shows
 * those with a role, and finds the others to give one).
 */
async function loadGroup(group: string, seasonId: string): Promise<Person[]> {
  if (ROLE_GROUPS[group]) {
    return (await fetchRoleHolders({ role: ROLE_GROUPS[group] })).items.map(personOf);
  }
  const collegeId = COLLEGES.find((c) => c.name === group)?.id;
  if (!collegeId) return [];
  // A college's players carry their season roles; the global ones come from the role lists.
  const [players, admins, devs] = await Promise.all([
    fetchCollegePlayers(seasonId, collegeId),
    fetchRoleHolders({ role: "admin" }),
    fetchRoleHolders({ role: "dev" }),
  ]);
  const globalRoles = (email: string) => [
    ...(admins.items.some((u) => u.id === email) ? ["admin"] : []),
    ...(devs.items.some((u) => u.id === email) ? ["dev"] : []),
  ];
  return players.items
    .filter((p) => !placeholderNetid(p.id))
    .map((p) => ({
      email: p.id,
      name: p.name,
      college: collegeName(p.collegeId),
      roles: rolesOf(globalRoles(p.id), p.roles, p.captainOf),
      captainOf: p.captainOf,
    }));
}

// Skeleton loader component
const TableSkeleton = () => (
  <div className="mb-8">
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
            </th>
            <th className="px-6 py-3 text-left">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
            </th>
            <th className="px-6 py-3 text-left">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
            </th>
            <th className="px-6 py-3 text-left">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
            </th>
            <th className="px-6 py-3 text-left">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
            </th>
            <th className="px-6 py-3 text-left">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(3)].map((_, idx) => (
            <tr key={idx}>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-1">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse"></div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ManageUserRolesPage = () => {
  const { currentSeason } = useSeason();
  const sports = currentSeason?.sports ?? [];
  const collegeNames = COLLEGES.map((college) => college.name);
  const dropdownOptions = [...Object.keys(ROLE_GROUPS), ...collegeNames];

  const [selectedCollege, setSelectedCollege] = useState<string>(
    dropdownOptions[0] || ""
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [specialRoleUsers, setSpecialRoleUsers] = useState<Person[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [editingSportsCaptainOf, setEditingSportsCaptainOf] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  // A college's players picked to be given a role, and the search for them.
  const [added, setAdded] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedCollege || !currentSeason) return;
    let live = true;
    setLoading(true);
    setLoadError("");
    setAdded([]);
    setSearch("");
    loadGroup(selectedCollege, currentSeason.id)
      .then(
        (people) => live && setSpecialRoleUsers(people),
        (err: Error) => {
          console.error("Failed to load special users:", err);
          if (!live) return;
          setSpecialRoleUsers([]);
          setLoadError(err.message);
        }
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [selectedCollege, currentSeason, reloadKey]);

  // Group users by role ("user" alone isn't a role worth listing)
  const usersByRole = useMemo(() => {
    const grouped: Record<string, Person[]> = {
      admin: [],
      dev: [],
      supervisor: [],
      captain: [],
      college_rep: [],
    };

    specialRoleUsers.forEach((user) => {
      user.roles.forEach((role) => {
        if (grouped[role]) {
          grouped[role].push(user);
        }
      });
    });

    return grouped;
  }, [specialRoleUsers]);

  const startEditing = (
    userId: string,
    currentRoles: string[],
    currentSports: string[]
  ) => {
    setEditingUser(userId);
    setEditingRoles([...currentRoles]);
    setEditingSportsCaptainOf([...currentSports]);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditingRoles([]);
    setEditingSportsCaptainOf([]);
  };

  const saveRoleChanges = async (userId: string) => {
    // Update local state optimistically
    setSpecialRoleUsers((prev) =>
      prev.map((user) =>
        user.email === userId
          ? {
              ...user,
              roles: editingRoles,
              captainOf: editingSportsCaptainOf,
            }
          : user
      )
    );

    // Exit edit mode
    setEditingUser(null);
    const rolesToSave = [...editingRoles];
    const sportsToSave = [...editingSportsCaptainOf];
    setEditingRoles([]);
    setEditingSportsCaptainOf([]);

    // Send update to backend; "captain" turns the chosen sports on.
    try {
      await setUserRoles(userId, {
        roles: rolesToSave.filter((r): r is StoredRole => (STORED_ROLES as readonly string[]).includes(r)),
        captainOf: rolesToSave.includes("captain") ? sportsToSave : [],
      });
    } catch (error) {
      toast.error((error as Error).message);
      setReloadKey((k) => k + 1); // undo the optimistic update
    }
  };

  const toggleRole = (role: string) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleSport = (sportId: string) => {
    setEditingSportsCaptainOf((prev) =>
      prev.includes(sportId)
        ? prev.filter((s) => s !== sportId)
        : [...prev, sportId]
    );
  };

  const RoleTable = ({ role, users }: { role: string; users: Person[] }) => {
    if (users.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 capitalize flex items-center gap-2">
          {role.replace("_", " ")}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({users.length})
          </span>
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  College
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Captain Sports
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr
                  key={user.email}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.college || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {editingUser === user.email ? (
                      <div className="flex flex-wrap gap-2">
                        {ALL_ROLES.map((r) => (
                          <button
                            key={r}
                            onClick={() => toggleRole(r)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              editingRoles.includes(r)
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {editingUser === user.email ? (
                      editingRoles.includes("captain") ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Select sports:
                          </div>
                          <div className="flex flex-wrap gap-2 max-w-xs">
                            {sports.map((sport) => (
                              <button
                                key={sport.id}
                                onClick={() => toggleSport(sport.id)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  editingSportsCaptainOf.includes(sport.id)
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                }`}
                              >
                                {sport.emoji} {sport.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          Select captain role first
                        </span>
                      )
                    ) : user.roles.includes("captain") ? (
                      <div className="flex flex-wrap gap-1">
                        {user.captainOf.length > 0 ? (
                          user.captainOf.map((sportId) => {
                            const sport = sports.find((s) => s.id === sportId);
                            return (
                              <span
                                key={sportId}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              >
                                {sport?.emoji} {sport?.name ?? sportId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            No sports assigned
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingUser === user.email ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveRoleChanges(user.email)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 font-medium"
                        >
                          Done
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          startEditing(user.email, user.roles, user.captainOf)
                        }
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Edit Roles
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-10">
      <PageHeading heading="Manage User Roles" />
      <div className="mt-10 p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <label
            htmlFor="college-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Select College or Role Group
          </label>
          <select
            id="college-select"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 w-full md:w-64"
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
          >
            {dropdownOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div>
            <TableSkeleton />
            <TableSkeleton />
          </div>
        ) : (
          <>
            {loadError ? (
              <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-red-700 dark:text-red-300">{loadError}</p>
              </div>
            ) : ROLE_GROUPS[selectedCollege] ? (
              specialRoleUsers.length === 0 ? (
                <p className="text-center py-12 text-gray-500 dark:text-gray-400">
                  Nobody is {ROLE_GROUPS[selectedCollege]} yet. Pick their college to give them the role.
                </p>
              ) : (
                <RoleTable role={ROLE_GROUPS[selectedCollege]} users={specialRoleUsers} />
              )
            ) : (
              <div>
                <div className="mb-8 max-w-md">
                  <label htmlFor="find-player" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Give someone in {selectedCollege} a role
                  </label>
                  <input
                    id="find-player"
                    type="search"
                    placeholder="Name or email"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search.trim() &&
                    specialRoleUsers
                      .filter((p) => !added.includes(p.email))
                      .filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(search.trim().toLowerCase()))
                      .slice(0, 6)
                      .map((p) => (
                        <button
                          key={p.email}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          onClick={() => {
                            setAdded((a) => [...a, p.email]);
                            setSearch("");
                            startEditing(p.email, p.roles, p.captainOf);
                          }}
                        >
                          {p.name} <span className="text-xs text-gray-500">{p.email}</span>
                        </button>
                      ))}
                </div>
                <RoleTable role="New roles" users={specialRoleUsers.filter((p) => added.includes(p.email))} />
                <RoleTable role="admin" users={usersByRole.admin} />
                <RoleTable role="dev" users={usersByRole.dev} />
                <RoleTable role="supervisor" users={usersByRole.supervisor} />
                <RoleTable role="captain" users={usersByRole.captain} />
                <RoleTable role="college_rep" users={usersByRole.college_rep} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default withRoleProtectedRoute(ManageUserRolesPage, (viewer) => viewer.can.manageRoles);
