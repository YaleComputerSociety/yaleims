import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const Leaderboard: React.FC = () => {
  const [colleges, setColleges] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('https://getleaderboard-65477nrg6a-uc.a.run.app');
        if (response.ok) {
          const data = await response.json();
          setColleges(data);
        } else {
          console.error('Failed to fetch leaderboard');
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchLeaderboard();
  }, []);

  // Sort colleges by points in descending order (already sorted from backend but just in case)
  const sortedColleges = colleges.sort((a, b) => b.points - a.points);

  const handleCollegeClick = (collegeName) => {
    sessionStorage.setItem('selectedCollege', collegeName);
    router.push('/scores');
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-blue-600">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Rank</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">College</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Points</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedColleges.map((college, index) => (
            <tr key={college.id} onClick={() => handleCollegeClick(college.name)} className="hover:bg-gray-100 cursor-pointer" >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{college.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{college.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
