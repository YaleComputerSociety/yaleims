import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-blue-400 dark:bg-[#0e265c] text-white py-8">
      <div className="container mx-auto px-8">
        <div className="flex gap-5 flex-col sm:flex-row ">
          {/* Logo Section */}
          <div className="basis-1/3 text-white">
            <Link href="/">
              <Image src={"LOGO.png"} width={150} height={150} alt="YALE IMS" />
            </Link>
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
                  <Link href="/odds" className="hover:underline">
                    Odds
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
                  <Link
                    href="https://yaleims.canny.io"
                    className="hover:underline"
                    target="_blank"
                  >
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
      <br></br>
      <div className="text-center text-xs w-4/5 mx-auto text-blue-100 dark:text-blue-500">
        Yale is a registered trademark of Yale University. This website is
        student run and is maintained, hosted, and operated independently of
        Yale University. The activities on this website are not supervised or
        endorsed by Yale and information contained on this website does not
        necessarily reflect the opinions or official positions of the University
      </div>
    </footer>
  );
}
