import { useState } from "react";

type KeyInfo = {
  description: string;
  apiKey: string;
};

interface KeyListProps {
  items: KeyInfo[];
}

const KeyList: React.FC<KeyListProps> = ({ items }) => {
  const [copied, setCopied] = useState<string>("");

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(""), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <ul className="space-y-3">
      {items.map(({ description, apiKey }) => (
        <li
          key={apiKey}
          className="flex flex-col gap-2 rounded-md bg-white dark:bg-black p-2"
        >
          <p className="font-medium text-black dark:text-white">{description}</p>
          <div className="flex items-center gap-2 justify-between">
            <code className="break-all text-sm text-green-300">{apiKey}</code>
            <button
              onClick={() => handleCopy(apiKey)}
              className="rounded-md bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-600"
            >
              {copied === apiKey ? "Copied!" : "Copy"}
            </button>

          </div>
        </li>
      ))}
    </ul>
  );
};

export default KeyList;
