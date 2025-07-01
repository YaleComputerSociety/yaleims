import Link from "next/link";
import { useRef } from "react"
import { MdClose } from "react-icons/md";
import {useSignIn} from "@src/context/SignInContext";
import gsap from 'gsap'; 
import { useGSAP } from '@gsap/react'; 

gsap.registerPlugin(useGSAP);

export default function LoginModal() {
    const { open, setOpen } = useSignIn();

    const main = useRef();

    return (
        open && (
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-xs w-[100%] h-[100%] flex-col"
                onClick={() => setOpen(false)}
            >
                <div 
                    className="w-[80%] md:w-[50%] lg:w-[30%] h-[50%] bg-gray-200 dark:bg-black rounded-lg flex flex-col "
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative justify-between flex w-full rounded-t-lg p-4 flx-row bg-gray-200 dark:bg-black">
                        <button
                            onClick={() => setOpen(false)}
                            className="text-gray-600 hover:text-white text-xl font-bold"
                        >
                            <MdClose />
                        </button>
                    </div>
                    <div className="pl-4 pr-4 h-full flex flex-col items-center gap-y-4">
                        <Link
                            className={`py-1.5 px-3 
                                dark:border-gray-200 bg-slate-500 dark:hover:border-gray-400 dark:hover:text-gray-400 text-gray-100"
                            }`}
                            href="api/auth/login"
                        >
                            Sign In As User
                        </Link>
                        <Link
                            className={`py-1.5 px-3 
                                dark:border-gray-200 bg-slate-500 dark:hover:border-gray-400 dark:hover:text-gray-400 text-gray-100"
                            }`}
                            href="api/auth/login"
                        >
                            Sign In As Admin
                        </Link>
                    </div>
                </div>
            </div>
        )
    )
}