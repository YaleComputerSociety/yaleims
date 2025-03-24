"use client";

import { useState } from "react";

const ContactPage: React.FC = () => {
  const [message, setMessage] = useState("");

  const handleSendEmail = () => {
    const subject = encodeURIComponent("Intramural Sports Inquiry");
    const body = encodeURIComponent(message);
    const email = "ephraim.akai-nettey@yale.edu";
    const ccEmail = "anna.xu@yale.edu";
    window.location.href = `mailto:${email}?cc=${ccEmail}&subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-center mb-4">Contact Us</h1>
      <p className="text-lg text-gray-700 mb-6 text-center dark:text-gray-300">
        Have questions about intramural sports? Send us an email!
      </p>

      {/* Contact Form */}
      <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-md">
        <label
          className="block text-gray-700 font-medium mb-2"
          htmlFor="message"
        >
          Your Message:
        </label>
        <textarea
          id="message"
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-black"
          placeholder="Type your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <button
          onClick={handleSendEmail}
          className="w-full bg-blue-600 text-white p-2 rounded-md mt-3 hover:bg-blue-700 transition"
        >
          Send Message
        </button>
      </div>
    </div>
  );
};

export default ContactPage;
