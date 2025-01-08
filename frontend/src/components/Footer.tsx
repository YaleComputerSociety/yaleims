import Link from "next/link";

const Footer = () => {
  return (
    <footer className="hidden sm:block fixed bottom-0 left-0 w-full bg-white dark:bg-[#0e265c] py-4 text-lg  z-10">
      <div className="flex flex-row justify-center gap-6">
        <Link
          href="https://yalecomputersociety.org/"
          target="_blank"
          className="font-bold hover:text-blue-500"
        >
          © 2024 – A y/cs product
        </Link>
        <Link href="/privacy-policy">
          <div className="hover:text-gray-400 font-light">
            Privacy Policy + Limited Use Agreement
          </div>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
