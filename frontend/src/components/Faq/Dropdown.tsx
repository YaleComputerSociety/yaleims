import { useState, useRef } from "react";
import { SlArrowRight, SlArrowDown } from "react-icons/sl";

interface Link {
  label: string;
  url: string;
}

interface DropdownProps {
  question: string;
  answer: string;
  links?: Link[];
}

export default function Dropdown({ question, answer, links }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Replace labels in the answer with actual links
  const getLinkedAnswer = () => {
    let modifiedAnswer = answer;
    if (links) {
      links.forEach(({ label, url }) => {
        const regex = new RegExp(`(${label})`, "gi");
        modifiedAnswer = modifiedAnswer.replace(
          regex,
          `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 dark:text-blue-400 hover:underline">$1</a>`
        );
      });
    }
    return modifiedAnswer;
  };

  return (
    <div className="my-3">
      {/* Pill container */}
      <div
        className="rounded-full border border-gray-300 dark:border-gray-600
        bg-gray-100/40 dark:bg-gray-800/40
        hover:bg-gray-100 dark:hover:bg-gray-700
        transition-colors duration-200 shadow-sm"
      >
        {/* Question button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center text-left text-base sm:text-lg font-semibold px-5 py-3 text-black dark:text-gray-100"
        >
          <span>{question}</span>
          {isOpen ? (
            <SlArrowDown className="text-lg transition-transform" />
          ) : (
            <SlArrowRight className="text-lg transition-transform" />
          )}
        </button>
      </div>

      {/* Answer content */}
      <div
        ref={contentRef}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "h-auto opacity-100 mt-2" : "h-0 opacity-0"
        }`}
        style={{
          height: isOpen ? `${contentRef.current?.scrollHeight || 0}px` : "0px",
        }}
      >
        <div className="ml-4 text-sm text-gray-800 dark:text-gray-300">
          <p dangerouslySetInnerHTML={{ __html: getLinkedAnswer() }} />
        </div>
      </div>
    </div>
  );
}
