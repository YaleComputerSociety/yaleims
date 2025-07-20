"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";
import { isValidEmail } from "@src/utils/helpers";
import { sports } from "@src/utils/helpers";

const roles = ["dev", "admin", "college-rep", "captain", "user"];

const AssignRoles = () => {
  const [roleInput, setRoleInput] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");
  const [sportInput, setSportInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleInput(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
  };

  const isButtonDisabled = () => {
    return (
      !roleInput ||
      !emailInput ||
      !isValidEmail(emailInput) ||
      (roleInput === "captain" && !sportInput)
    );
  };

  const handleSubmit = async () => {
    if (isButtonDisabled()) {
      toast.error("Invalid input");
      return;
    }

    setLoading(true);
    try {
      const userToken = sessionStorage.getItem("userToken");
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/updateUserRole",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            email: emailInput,
            role: roleInput,
            sport: sportInput,
          }),
        }
      );

      if (response.ok) {
        toast.success(`updated user ${emailInput} to ${roleInput}`);
        setEmailInput("");
        setRoleInput("");
        setSportInput("");
      } else {
        toast.error(`Failed to update user role`);
      }
    } catch (error) {
      toast.error("Failed to update user role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-row justify-center p-4">
      <h2 className="text-lg font-semibold flex items-center">Assign Roles</h2>
      <select
        className="ml-8 px-4 py-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
        value={roleInput}
        onChange={handleRoleChange}
      >
        <option
          value=""
          className="text-gray-300 dark:text-gray-500 bg-white dark:bg-gray-900"
        >
          Assign role
        </option>
        {roles.map((role) => (
          <option
            key={role}
            value={role}
            className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900"
          >
            {role}
          </option>
        ))}
      </select>
      <input
        type="email"
        className="ml-4 px-4 py-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 placeholder:text-gray-300"
        placeholder="User email"
        value={emailInput}
        onChange={handleEmailChange}
      />
      {roleInput === "captain" && (
        <select
          className="ml-4 px-2 py-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
          value={sportInput}
          onChange={(e) => setSportInput(e.target.value)}
        >
          <option
            value=""
            className="text-gray-300 dark:text-gray-500 bg-white dark:bg-gray-900"
          >
            Assign sport
          </option>
          {sports.map((sport) => (
            <option
              key={sport.id}
              value={sport.name}
              className="text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900"
            >
              {sport.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={handleSubmit}
        className="ml-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-300 disabled:dark:bg-gray-800 disabled:cursor-not-allowed"
        disabled={isButtonDisabled()}
      >
        <span
          className="inline-flex items-center justify-center"
          style={{ minWidth: "64px" }}
        >
          {loading ? <FaSpinner className="animate-spin" /> : "Submit"}
        </span>
      </button>
    </div>
  );
};

export default AssignRoles;
