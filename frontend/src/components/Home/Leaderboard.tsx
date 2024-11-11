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


  const renderPodium = (topColleges: any[]) => {
    const podiumItems = [
      { place: 'second', college: topColleges[1], flagSize: 'w-18 h-18', overlaySize: 'w-50 h-50 top-2', textSize: 'w-32' },
      { place: 'first', college: topColleges[0], flagSize: 'w-40 h-40', overlaySize: 'w-50 h-35 top-2', textSize: 'w-40' },
      { place: 'third', college: topColleges[2], flagSize: 'w-18 h-18', overlaySize: 'w-50 h-50 top-2', textSize: 'w-32' }
    ];
  
    return (
      <div className="flex justify-center items-end space-x-4">
        {podiumItems.map(({ place, college, flagSize, overlaySize, textSize }) => (
          <div key={place} className={`flex flex-col items-center space-y-2 text-center ${textSize}`}>
            <div className={`flex items-center justify-center mx-auto relative ${place === 'first' ? 'w-40 h-40' : 'w-16 h-16'}`}>
              <img
                src={`/college_flags/${college.name}.png`}
                alt={college.name}
                className={`${flagSize} object-contain mb-2`}
              />
              <img
                src={`/college_flags/podium_${place}.png`}
                alt={`${place} Place Overlay`}
                className={`absolute ${overlaySize}`}
              />
            </div>
            <h3 className="font-semibold text-sm mt-10 text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
              {college.name}
            </h3>
            <p className="text-sm text-gray-500">Points: {college.points}</p>
          </div>
        ))}
      </div>
    );
  };


  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">

      {/* Podium !! */}
      <div className="flex justify-center space-x-8 py-6">
        {/* Pass 3 to only grab the podium worthy teams! */}
        {renderPodium(sortedColleges.slice(0, 3))}
      </div>

      {/* Full Leaderboard */}
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
