import React from "react";


const Title: React.FC = () => {
    return (
        <div className="grid grid-cols-2 md:max-w-[80%] sm:max-w-[75%] max-w-[85%] mx-auto pt-7">
            <h1 className="md:text-5xl text-center xs:text-4xl text-3xl text-blue-600 font-bold dark:text-white mg:text-6xl relative">TYNG CUP STANDINGS</h1>
            <div className="text-right">
                <button className="dark:bg-black bg-white border-solid border-4 md:p-2 p-1 border-blue-600 md:rounded-2xl rounded-xl text-blue-600 mg:text-sm xs:text-xs font-bold text-[10px]">
                    2024-2025
                </button>
                <p className="mg:pt-5 pt-3 text-blue-600 underline mg:text-sm xs:text-xs text-[10px]">Every point, every game,</p>
                <p className="text-blue-600 underline mg:text-sm xs:text-xs text-[10px]">every play matters.</p>
            </div>
        </div>
    )
}

export default Title