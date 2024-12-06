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
    <div className="rounded-lg border min-w-fit bg-white mr-6 mb-6 shadow-lg \ transform transition-transform hover:scale-105 active:scale-100e">
      <img
        src={image}
        alt={name}
        className={
          "mb-2 min-w-full object-cover object-center rounded-t-lg" +
          (specialThanks ? " h-40" : " h-80")
        }
      />
      <div className="px-5 pb-2">
        <h2 className="text-xl font-bold mt-4">{name}</h2>
        {roles.map((role, index) => (
          <p key={index} className="text-gray-600">
            {role}
          </p>
        ))}
      </div>
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
    </div>
  );
};

export default PersonCard;
