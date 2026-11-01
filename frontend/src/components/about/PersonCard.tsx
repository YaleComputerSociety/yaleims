import React from "react";
import { FaGithubSquare, FaLinkedin, FaLink } from "react-icons/fa";
import Image from "next/image";

interface PersonCardProps {
  name: string;
  roles: string[];
  image: string;
  github: string | undefined;
  linkedin: string | undefined;
  portfolio: string | undefined;
  specialThanks: boolean;
}

const PersonCard: React.FC<PersonCardProps> = ({
  name,
  roles,
  image,
  github,
  linkedin,
  portfolio,
  specialThanks,
}) => {
  return (
    <div
      className={`flex flex-col ${
        specialThanks ? "w-24" : "w-full bg-white dark:bg-black"
      }  mr-6 mb-6 transform transition-transform`}
    >
      {/* Image Section */}
      <div className={`relative ${specialThanks ? "h-24" : "h-60"} w-full`}>
        <Image
          src={image}
          alt={name}
          fill
          className={`${specialThanks ? "rounded-full" : ""} object-cover`}
          priority
        />
      </div>
      <div
        className={`${
          specialThanks
            ? "text-center mt-2 text-md"
            : "text-left px-5 pb-5 mt-4"
        }`}
      >
        <h2
          className={`${specialThanks ? "text-md font-medium" : "text-lg font-bold mt-2"}`}
        >
          {name}
        </h2>
        {!specialThanks &&
          roles &&
          roles.map((role, index) => (
            <p key={index} className="text-md text-gray-800 dark:text-gray-300">
              {role}
            </p>
          ))}
      </div>
      {!specialThanks && (
        <div className="flex bottom-0 flex-row mt-2 px-5 pb-5 text-gray-500">
          <div className="pr-1 hover:text-blue-500">
            {github && (
              <a target="_blank" href={github} rel="noopener noreferrer">
                <FaGithubSquare size={30} />
              </a>
            )}
          </div>
          <div className="pr-1 hover:text-blue-500">
            {linkedin && (
              <a target="_blank" href={linkedin} rel="noopener noreferrer">
                <FaLinkedin size={30} />
              </a>
            )}
          </div>
          <div className="pr-1 hover:text-blue-500">
            {portfolio && (
              <a target="_blank" href={portfolio} rel="noopener noreferrer">
                <FaLink size={30} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonCard;
