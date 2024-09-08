import React from 'react';
import { loggedInUser } from '../../data/user'; // Adjust the path as needed

const ProfilePage: React.FC = () => {
  const { netid, firstname, lastname, college, role, personalPoints } = loggedInUser;

  return (
    <div className="min-h-screen flex justify-center items-center">
      <div className="bg-white shadow-2xl rounded-lg p-8 max-w-lg w-full text-center relative">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white rounded-full h-20 w-20 flex justify-center items-center text-4xl font-bold shadow-lg">
          {firstname[0]}{lastname[0]}
        </div>
        <h1 className="text-5xl font-bold text-gray-800 mt-12 mb-6">Profile</h1>

        <div className="text-center mb-6">
          <p className="text-xl font-semibold text-gray-600">Name:</p>
          <p className="text-3xl font-bold text-gray-800">{firstname} {lastname}</p>
        </div>
        <div className="text-center mb-6">
          <p className="text-xl font-semibold text-gray-600">NetID:</p>
          <p className="text-2xl font-bold text-gray-800">{netid}</p>
        </div>
        <div className="text-center mb-6">
          <p className="text-xl font-semibold text-gray-600">College:</p>
          <p className="text-2xl font-bold text-blue-600">{college}</p>
        </div>
        <div className="text-center mb-6">
          <p className="text-xl font-semibold text-gray-600">Role:</p>
          <p className={`text-2xl font-bold ${role === 'player' ? 'text-green-600' : role === 'referee' ? 'text-orange-600' : role === 'secretary' ? 'text-purple-600' : 'text-red-600'}`}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </p>
        </div>
        <div className="text-center mb-6">
          <p className="text-xl font-semibold text-gray-600">Personal Points:</p>
          <p className="text-3xl font-bold text-yellow-500">{personalPoints}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
