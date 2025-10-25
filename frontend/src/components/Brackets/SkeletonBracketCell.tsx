import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";

const SkeletonBracketCell = () => {
    const [isDark, setIsDark] = useState(false);

    // Detect if dark mode is active
    useEffect(() => {
        const checkDark = () =>
            setIsDark(document.documentElement.classList.contains("dark"));
            checkDark();
            // Recheck when theme changes (if using next-themes or manual toggles)
            const observer = new MutationObserver(checkDark);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["class"],
            });
        return () => observer.disconnect();
    }, []);

    const base = isDark ? "#2a2d33" : "#e5e7eb";
    const highlight = isDark ? "#3a3d42" : "#f9fafb";

    return (
        <div
        className={`relative transition-all rounded-3xl shadow-lg w-56 aspect-[288/155] flex flex-col justify-between p-4 
        ${isDark ? "bg-black border border-gray-800" : "bg-gray-50 border border-gray-200"}`}
        >
        {/* Center horizontal line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-300 dark:bg-gray-700 transform -translate-y-1/2 z-10" />

        {/* Top team */}
        <div className="flex items-center justify-between z-10">
            <div className="flex items-center space-x-1">
            <Skeleton circle height={24} width={24} baseColor={base} highlightColor={highlight} />
            <Skeleton height={18} width={90} baseColor={base} highlightColor={highlight} />
            <Skeleton height={22} width={26} borderRadius={12} baseColor={base} highlightColor={highlight} />
            </div>
            <Skeleton height={28} width={40} borderRadius={12} baseColor={base} highlightColor={highlight} />
        </div>

        {/* Bottom team */}
        <div className="flex items-center justify-between z-10">
            <div className="flex items-center space-x-1">
            <Skeleton circle height={24} width={24} baseColor={base} highlightColor={highlight} />
            <Skeleton height={18} width={90} baseColor={base} highlightColor={highlight} />
            <Skeleton height={22} width={26} borderRadius={12} baseColor={base} highlightColor={highlight} />
            </div>
            <Skeleton height={28} width={40} borderRadius={12} baseColor={base} highlightColor={highlight} />
        </div>

        {/* Time placeholder */}
        <div className="absolute bottom-0.5 right-4 text-[10px] text-gray-400 dark:text-gray-500">
            <Skeleton height={10} width={40} baseColor={base} highlightColor={highlight} />
        </div>
        </div>
    );
};

export default SkeletonBracketCell;
