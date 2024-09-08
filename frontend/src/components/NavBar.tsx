import React from 'react';
import Link from 'next/link';

const NavBar: React.FC = () => {
  return (
    <nav className="bg-blue-600 p-4 text-white flex justify-between items-center">
      <div className="flex space-x-4">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/scores" className="hover:underline">
          Scores
        </Link>
        <Link href="/schedule" className="hover:underline">
          Schedule
        </Link>
        {/* <Link href="/ref-scoring" className="hover:underline">
          Ref Scoring
        </Link>
        <Link href="/manage-users" className="hover:underline">
          Manage Users
        </Link>
        <Link href="/manage-brackets" className="hover:underline">
          Manage Brackets
        </Link> */}
      </div>

      <div>
        <Link href="/profile" className="hover:underline">
          Profile
        </Link>
      </div>
    </nav>
  );
};

export default NavBar;
