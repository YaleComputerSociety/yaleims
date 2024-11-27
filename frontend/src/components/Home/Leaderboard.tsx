import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
//import { colleges } from '../../data/colleges';

const Leaderboard: React.FC = () => {
  const router = useRouter();
  // State to store the college data
  const [colleges, setColleges] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  
  
  // Function to handle clicking on a college
  const handleCollegeClick = (collegeName: string) => {
    // Store the selected college in session storage
    sessionStorage.setItem('selectedCollege', collegeName);
    router.push('/scores');
  };

  // Fetch leaderboard data from the Cloud Function
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('https://getleaderboard-65477nrg6a-uc.a.run.app'); // Replace with your actual Firebase function endpoint
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      //console.log('Leaderboard data:', data); // Add this line
      return data;
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchLeaderboard();
        setColleges(data);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);
  
  
  // Sort colleges by points in descending order
  const collegeArray = Object.values(colleges);
  const sortedColleges = collegeArray.sort((a, b) => b.points - a.points);

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {loading ? (
        <p>Loading...</p> // Show loading text while data is being fetched
      ) : colleges.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">College</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {colleges
              .sort((a, b) => b.points - a.points)
              .map((college, index) => (
                <tr key={college.id} onClick={() => handleCollegeClick(college.name)} className="hover:bg-gray-100 cursor-pointer">
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
      ) : (
        <p>No colleges found</p>
      )}
    </div>
  );
};

export default Leaderboard;
