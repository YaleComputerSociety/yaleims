// A page's title. On desktops it sits in the top bar's row, at its left
// (TopBar leaves that side free; it is fixed like the bar, and lets clicks
// through to it); on phones it is a large centered heading under the bar.
// The account controls are TopBar's. CSS picks the variant (md:), so the
// server's HTML is already right for both.
interface PageHeadingProps {
  heading: string;
}

export default function PageHeading({ heading }: PageHeadingProps) {
  return (
    <>
      <div className="hidden md:flex fixed top-0 z-[51] h-[60px] items-center px-8 pointer-events-none">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{heading}</h1>
      </div>
      <div className="md:hidden mt-[65px] mb-4 px-4 text-center">
        <p className="text-black dark:text-white text-4xl font-bold leading-[1.1] tracking-tight py-2">{heading}</p>
        <div className="mt-2 mx-auto w-12 h-1 rounded-full bg-blue-500/60" />
      </div>
    </>
  );
}
