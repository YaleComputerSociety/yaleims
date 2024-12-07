"use client";

import React from "react";
import { useEffect } from "react";
import PersonCard from "@src/components/About/PersonCard";

const AboutPage: React.FC = () => {
  // title of page
  useEffect(() => {
    document.title = "About";
  }, []);

  // add college and grad year to display

  const teamMembers = [
    {
      name: "Anna Xu",
      roles: ["Product Lead", "Software Engineer"],
      image: "/dev_images/Anna_Xu.jpeg",
      github: "https://github.com/annaxu9",
      linkedin: "https://www.linkedin.com/in/anna-wenxin-xu/",
      portfolio: "https://www.anna-xu.com/",
    },
    {
      name: "Ephraim Akai-Nettey",
      roles: ["Software Engineer"],
      image: "/dev_images/Ephraim_Akai-Nettey.jpg",
      github: "https://github.com/dennisephraim",
      linkedin: "https://www.linkedin.com/in/ephraim-akai-nettey/",
      portfolio: "https://ephraimdennis.com/",
    },
    {
      name: "Brian Di Bassinga",
      roles: ["Software Engineer"],
      image: "https://randomuser.me/api/portrait",
      github: "https://github.com/btd2026",
      linkedin: "https://www.linkedin.com/in/brian-di-bassinga-2399661a5?m",
      portfolio: undefined,
    },
    {
      name: "Daniel Morales",
      roles: ["Software Engineer"],
      image: "/dev_images/Daniel_Morales.jpg",
      github: "https://github.com/dmo7567",
      linkedin: "https://www.linkedin.com/in/dmorales7567/",
      portfolio: undefined,
    },
    {
      name: "Kaitlyn Oikle",
      roles: ["Software Engineer"],
      image: "/dev_images/Kaitlyn_Oikle.jpg",
      github: "https://github.com/kjoikle",
      linkedin: "https://www.linkedin.com/in/kaitlyn-oikle/",
      portfolio: undefined,
    },
    {
      name: "Lily Lin",
      roles: ["Lead Designer"],
      image: "",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Naomi Ling",
      roles: ["UI/UX Designer"],
      image: "",
      github: undefined,
      linkedin: "https://www.linkedin.com/in/naomi-ling/",
      portfolio: "https://naomiling.super.site/",
    },
    {
      name: "Asya Tarabar",
      roles: ["UI/UX Designer"],
      image: "",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
  ];

  const specialThanks = [
    {
      name: "Alejandro Gonzalez",
      roles: ["Software Engineer"],
      image: "/dev_images/Alejandro_Gonzalez.png",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Mary Jiang",
      roles: ["Software Engineer"],
      image: "/dev_images/Mary_Jiang.png",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Cierra Ouellette",
      roles: ["Software Engineer"],
      image: "/dev_images/Cierra_Oullette.png",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Kelly Qiang",
      roles: ["Software Engineer"],
      image: "/dev_images/Kelly_Qiang.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Bienn Viquiera",
      roles: ["Software Engineer"],
      image: "/dev_images/Bienn_Viquiera.png",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Edward Yang",
      roles: ["Software Engineer"],
      image: "/dev_images/Edward_Yang.png",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-center mb-8 pt-5">About Us</h1>{" "}
      <div className="mb-8 bg-white shadow-lg p-5 rounded-lg w-4/5 ">
        <p className="text-3xl font-semibold text-blue-500">Our Story</p>
        <p className="text-2xl font-bold text-gray-800">.........</p>
      </div>
      <div className="mb-8 bg-white shadow-lg p-5 rounded-lg w-4/5">
        <p className="text-3xl font-semibold text-blue-500 pb-5">Our Team</p>
        <div className="grid lg:grid-cols-4 md:grid-cols-2">
          {teamMembers.map((member, index) => (
            <PersonCard
              key={index}
              name={member.name}
              roles={member.roles}
              image={member.image}
              github={member.github}
              linkedin={member.linkedin}
              portfolio={member.portfolio}
              specialThanks={false}
            />
          ))}
        </div>
      </div>
      <div className="mb-8 bg-white shadow-lg p-5 rounded-lg w-4/5">
        <p className="text-3xl font-semibold text-blue-500 pb-5">
          Special Thanks
        </p>
        <div className="grid lg:grid-cols-4 md:grid-cols-2">
          {specialThanks.map((member, index) => (
            <PersonCard
              key={index}
              name={member.name}
              roles={member.roles}
              image={member.image}
              github={member.github}
              linkedin={member.linkedin}
              portfolio={member.portfolio}
              specialThanks={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
