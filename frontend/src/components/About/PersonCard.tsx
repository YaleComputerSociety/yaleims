import React from "react";
import { FaGithubSquare, FaLinkedin, FaLink } from "react-icons/fa";

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
        specialThanks ? "w-24" : "w-64 bg-white dark:bg-black"
      } mr-6 mb-6 transform transition-transform`}
    >
      <img
        src={image}
        alt={name}
        className={`${
          specialThanks
            ? "w-24 h-24 rounded-full"
            : "w-full h-80"
        } object-cover`}
      />
      <div className={`${specialThanks ? "text-center mt-2" : "text-left px-5 pb-2"}`}>
        <h2 className="text-lg font-bold mt-2">{name}</h2>
        {!specialThanks &&
          roles.map((role, index) => (
            <p key={index} className="text-gray-600">
              {role}
            </p>
          ))}
      </div>
      {!specialThanks && (
        <div className="flex bottom-0 flex-row mt-2 px-5 pb-5 text-gray-500">
          <div className="pr-1 hover:text-blue-500">
            {github && <a href={github}>{<FaGithubSquare size={30} />}</a>}
          </div>
          <div className="pr-1 hover:text-blue-500">
            {linkedin && <a href={linkedin}>{<FaLinkedin size={30} />}</a>}
          </div>
          <div className="pr-1 hover:text-blue-500">
            {portfolio && <a href={portfolio}>{<FaLink size={30} />}</a>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonCard;
