"use client";

import PageHeading from "@src/components/PageHeading";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React, { useState, useEffect, useMemo } from "react";
import { colleges, sports } from "@src/utils/helpers";
import { User } from "@src/types/components";

// Available roles for the multi-select dropdown
const ALL_ROLES = ["admin", "dev", "captain", "college_rep", "user"];

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
  const collegeNames = colleges.map((college) => college.name);
  const dropdownOptions = ["Admin", "Dev", ...collegeNames];

  const [selectedCollege, setSelectedCollege] = useState<string>(
    dropdownOptions[0] || ""
  );
  const [specialRoleUsers, setSpecialRoleUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [editingSportsCaptainOf, setEditingSportsCaptainOf] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedCollege) return;
    setLoading(true);
    fetch(`/api/functions/getSpecialUsers?college=${selectedCollege}`)
      .then((res) => res.json())
      .then((data) => {
        setSpecialRoleUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setSpecialRoleUsers([]));
  }, [selectedCollege]);

  // Group users by role
  const usersByRole = useMemo(() => {
    const grouped: Record<string, User[]> = {
      admin: [],
      dev: [],
      captain: [],
      college_rep: [],
    };

    specialRoleUsers.forEach((user) => {
      const roles = user.mRoles || [];
      roles.forEach((role) => {
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
              mRoles: editingRoles,
              sportsCaptainOf: editingSportsCaptainOf,
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

    // Send update to backend
    try {
      const response = await fetch(`/api/functions/updateUserRoles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          roles: rolesToSave,
          sportsCaptainOf: sportsToSave,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update roles");
      }

      console.log("Successfully updated user roles and sports");
    } catch (error) {
      console.error("Failed to update roles:", error);
      // Revert optimistic update on error
      window.location.reload();
      alert("Failed to update user roles. Please try again.");
    }
  };

  const toggleRole = (role: string) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const toggleSport = (sportName: string) => {
    setEditingSportsCaptainOf((prev) =>
      prev.includes(sportName)
        ? prev.filter((s) => s !== sportName)
        : [...prev, sportName]
    );
  };

  const RoleTable = ({ role, users }: { role: string; users: User[] }) => {
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
                    {(user.firstname || "") + " " + (user.lastname || "") ||
                      "N/A"}
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
                        {(user.mRoles || []).map((r) => (
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
                                onClick={() => toggleSport(sport.name)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  editingSportsCaptainOf.includes(sport.name)
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
                    ) : (user.mRoles || []).includes("captain") ? (
                      <div className="flex flex-wrap gap-1">
                        {(user.sportsCaptainOf || []).length > 0 ? (
                          (user.sportsCaptainOf || []).map((sportName) => {
                            const sport = sports.find(
                              (s) => s.name === sportName
                            );
                            return (
                              <span
                                key={sportName}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              >
                                {sport?.emoji} {sportName}
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
                          startEditing(
                            user.email,
                            user.mRoles || [],
                            user.sportsCaptainOf || []
                          )
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
            {specialRoleUsers.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">
                  No users with special roles found for {selectedCollege}.
                </p>
              </div>
            ) : selectedCollege === "Admin" || selectedCollege === "Dev" ? (
              <RoleTable
                role={selectedCollege.toLowerCase()}
                users={specialRoleUsers}
              />
            ) : (
              <div>
                <RoleTable role="admin" users={usersByRole.admin} />
                <RoleTable role="dev" users={usersByRole.dev} />
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

export default withRoleProtectedRoute(ManageUserRolesPage, ["dev"]);
