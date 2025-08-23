import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";

interface DCardPopupProps {
  title: string;
  message?: string;
  openInfo: string;
  CustomComponent: React.ComponentType;
}

export default function DCardPopup({ title, message, openInfo, CustomComponent }: DCardPopupProps) {
    const [ open, setOpen ] = useState<boolean>(false)

    // collapse navbar when open
    useEffect(() => {
        const html = document.documentElement;
        if (open) { html.classList.add("overflow-hidden")}
        else { html.classList.remove("overflow-hidden")}
        return () => {
          html.classList.remove("overflow-hidden");
        };
    }, [open]);

    return (
        <div className="bg-white/50 dark:bg-black/50 rounded-lg p-7 shadow-md flex flex-col h-full">
            <h2 className="text-sm md:text-lg font-semibold">{title}</h2>
            <div className="mt-4 text-xs xs:text-sm">{message}</div>
            <button
                onClick={() => setOpen(true)}
                className="text-left inline-block text-xs mt-auto pt-2 text-indigo-600 hover:underline"
            >
                {openInfo} →
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
                        <div className="relative justify-between flex w-full rounded-t-lg p-4 flex-row border-b-2 border-gray-300 dark:border-black bg-gray-200 dark:bg-custom_gray">
                            <h2 className="text-xl font-semibold">{title}</h2>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-gray-600 hover:text-white text-xl font-bold"
                            >
                                <MdClose />
                            </button>
                        </div>
                        <div className="pl-4 pr-4 overflow-y-auto custom-scrollbar h-full">
                            <CustomComponent />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
