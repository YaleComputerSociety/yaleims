import React from 'react';
import { useRouter } from 'next/navigation';
import { colleges } from '../../data/colleges';

const Leaderboard: React.FC = () => {
  const router = useRouter();

  // Sort colleges by points in descending order
  const collegeArray = Object.values(colleges);
  const sortedColleges = collegeArray.sort((a, b) => b.points - a.points);

  // Function to handle clicking on a college
  const handleCollegeClick = (collegeName: string) => {
    // Store the selected college in session storage
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center">
                <img src={`/college_flags/${college.name}.png`} alt={college.name} className="w-6 h-6 mr-2 object-contain" />
                {college.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{college.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
