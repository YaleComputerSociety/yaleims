import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";

interface PopupActionCardProps {
  title: string;
  icon: string;
  description?: string;
  popupTitle?: string;
  gradient?: string;
  CustomComponent: React.ComponentType;
}

export default function PopupActionCard({
  title,
  icon,
  description,
  popupTitle,
  gradient = "from-indigo-500/10 to-purple-500/10",
  CustomComponent,
}: PopupActionCardProps) {
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const html = document.documentElement;
    if (open) {
      html.classList.add("overflow-hidden");
    } else {
      html.classList.remove("overflow-hidden");
    }
    return () => {
      html.classList.remove("overflow-hidden");
    };
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-left group w-full">
        <div
          className={`
            relative overflow-hidden rounded-xl p-4 md:p-5
            bg-gradient-to-br ${gradient}
            backdrop-blur-sm
            transition-all duration-300
            hover:scale-[1.02]
            hover:shadow-lg hover:shadow-indigo-500/10
            h-full flex flex-col
          `}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl md:text-3xl">{icon}</span>
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-sm md:text-base mb-1">{title}</h3>
          {description && (
            <p className="text-xs text-gray-400 line-clamp-2">{description}</p>
          )}
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-white/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-85 w-[100%] h-[100%] flex-col"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[80%] md:w-[60%] h-[80%] bg-gray-200 dark:bg-custom_gray rounded-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold">{popupTitle || title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <CustomComponent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
