"use client";

import React, { useState, useEffect } from "react";
import { users } from "../../data/users"; // Import the users array
import { loggedInUser } from "../../data/user"; // Import the logged-in user

const ManageUsersPage: React.FC = () => {
  const [filteredUsers, setFilteredUsers] = useState(users);
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    // Apply role filter when the filter changes
    if (roleFilter === "") {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter((user) => user.role === roleFilter));
    }
  }, [roleFilter]);

  // Check if the logged-in user is an admin
  const isAdmin = loggedInUser.role === "admin";

  // Handle role changes
  const handleRoleChange = (netid: string, newRole: string) => {
    setFilteredUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.netid === netid ? { ...user, role: newRole } : user
      )
    );
  };

  if (!isAdmin) {
    return <div className="min-h-screen bg-gray-100 p-8"><p className="text-red-600 text-center">You are not authorized to access this page.</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Manage Users</h1>

      {/* Role Filter */}
      <div className="mb-8">
        <label className="block mb-2 text-lg">Filter by Role:</label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Roles</option>
          <option value="player">Player</option>
          <option value="referee">Referee</option>
          <option value="secretary">Secretary</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Users Table */}
      <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-blue-600">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">NetID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">First Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Last Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">College</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Role</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <tr key={user.netid}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.netid}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.firstname}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.lastname}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.college}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.netid, e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg"
                >
                  <option value="player">Player</option>
                  <option value="referee">Referee</option>
                  <option value="secretary">Secretary</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ManageUsersPage;
