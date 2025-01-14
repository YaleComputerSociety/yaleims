import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-blue-400 dark:bg-[#0e265c] text-white py-8">
      <div className="container mx-auto px-8">
        <div className="flex gap-5 flex-col sm:flex-row ">
          {/* Logo Section */}
          <div className="basis-1/3 text-white">
            <Image src={"LOGO.png"} width={150} height={150} alt="YALE IMS" />
            <h2 className="text-xs mt-3">
              a{" "}
              <a
                className=" underline"
                href="https://yalecomputersociety.org/"
                target="_blank"
              >
                yale computer society (y/cs)
              </a>
            </h2>
            <p>
              <span className="text-xs">
                and{" "}
                <a href="https://designatyale.com/" className=" underline">
                  design at yale (day)
                </a>{" "}
                product
              </span>
            </p>
          </div>

          <div className="basis-2/3 grid grid-cols-3 text-sm sm:text-md">
            {/* Explore Section */}
            <div>
              <h3 className="text-lg font-bold text-white">Explore</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/scores" className="hover:underline">
                    Scores
                  </Link>
                </li>
                <li>
                  <Link href="/schedules" className="hover:underline">
                    Schedules
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:underline">
                    Profile
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support Section */}
            <div>
              <h3 className="text-lg font-bold text-white">Support</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/faq" className="hover:underline">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="https://yaleims.canny.io" className="hover:underline" target="_blank">
                    Feedback
                  </Link>
                </li>
              </ul>
            </div>

            {/* About Section */}
            <div>
              <h3 className="text-lg font-bold text-white">About</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/about-us" className="hover:underline">
                    Team
                  </Link>
                </li>
                <li>
                  <Link href="/release-notes" className="hover:underline">
                    Release Notes
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/YaleComputerSociety/yaleims"
                    target="_blank"
                    className="hover:underline"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-right text-blue-700 dark:text-white">
          <p className="text-md">YaleIMs © 2025</p>
        </div>
      </div>
    </footer>
  );
}

// ymeets footer

// const Footer = () => {
//   return (
//     <footer className="hidden sm:block fixed bottom-0 left-0 w-full bg-white dark:bg-[#0e265c] py-4 text-lg  z-10">
//       <div className="flex flex-row justify-center gap-6">
//         <Link
//           href="https://yalecomputersociety.org/"
//           target="_blank"
//           className="font-bold hover:text-blue-500"
//         >
//           © 2024 – A y/cs product
//         </Link>
//         <Link href="/privacy-policy">
//           <div className="hover:text-gray-400 font-light">
//             Privacy Policy + Limited Use Agreement
//           </div>
//         </Link>
//       </div>
//     </footer>
//   );
// };

// export default Footer;
