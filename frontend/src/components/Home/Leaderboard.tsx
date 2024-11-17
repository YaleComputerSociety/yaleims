import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import Next.js Image component
import { colleges } from '../../data/colleges';
import LoadingScreen from '../LoadingScreen';

const Leaderboard: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [sortedColleges, setSortedColleges] = useState(
    Object.values(colleges) // Convert object to array
  );

  useEffect(() => {
    // Simulate a loading delay
    const timer = setTimeout(() => {
      // Sort colleges by points in descending order
      const sorted = [...sortedColleges].sort((a, b) => b.points - a.points);
      setSortedColleges(sorted);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleCollegeClick = (collegeName: string) => {
    sessionStorage.setItem('selectedCollege', collegeName);
    router.push('/scores');
  };

  const renderPodium = (topColleges: any) => {
    const podiumItems = [
      { place: 'second', college: topColleges[1], size: 'small', offset: 'translate-y-6' },
      { place: 'first', college: topColleges[0], size: 'large', offset: 'translate-y-0' },
      { place: 'third', college: topColleges[2], size: 'small', offset: 'translate-y-6' },
    ];
  
    return (
      <div className="flex justify-center items-end space-x-6">
        {podiumItems.map(({ place, college, size, offset }, index) =>
          college ? (
            <div
              key={index}
              className={`flex flex-col items-center ${offset} text-center mb-3`}
            >
              <div
                className={`relative ${
                  size === 'large' ? 'w-32 h-32' : 'w-24 h-24'
                } flex items-center justify-center mb-4`}
              >
                <Image
                  src={`/college_flags/${college.name.replace(/\s+/g, ' ')}.png`}
                  alt={college.name}
                  width={size === 'large' ? 128 : 96}
                  height={size === 'large' ? 128 : 96}
                  className="object-contain p-3"
                />
                <Image
                  src={`/college_flags/podium_${place}.png`}
                  alt={`${place} Place Overlay`}
                  width={size === 'large' ? 200 : 150} // Adjust the sizes to your needs
                  height={size === 'large' ? 200 : 150}
                  layout="intrinsic" // Ensures the image respects its intrinsic dimensions
                  className="absolute top-3"
                />
              </div>
              <h3 className="font-semibold text-sm text-gray-800 mt-2">{college.name}</h3>
              <p className="text-sm text-gray-500">Points: {college.points}</p>
            </div>
          ) : null
        )}
      </div>
    );
  };
  

  if (loading) {
    return <div className="text-center py-10"><LoadingScreen/></div>;
  }

  return (
    
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Podium */}
      <div className="py-6">{renderPodium(sortedColleges.slice(0, 3))}</div>

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
          {sortedColleges.slice(3,).map((college, index) => (
            <tr
              key={college.id}
              onClick={() => handleCollegeClick(college.name)}
              className="hover:bg-gray-100 cursor-pointer"
            >
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{index + 4}</td>
              <td className="px-6 py-4 text-sm text-gray-900 flex items-center">
                <Image
                  src={`/college_flags/${college.name.replace(/\s+/g, ' ')}.png`}
                  alt={college.name}
                  width={24}
                  height={24}
                  className="mr-2 object-contain"
                />
                {college.name}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{college.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Leaderboard;
