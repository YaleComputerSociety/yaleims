// this is for using react-toastify for prettier alert messages

// this file defines the default config for a toast but this can be overwritten when
// creating an individual toast; this automatically grab the user's theme and applies it to
// the toast

"use client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@src/context/ThemeContext";

export default function ToastProvider() {
  const { theme } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      theme={theme === "dark" ? "dark" : "light"}
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
  );
}
