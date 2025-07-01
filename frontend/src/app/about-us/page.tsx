"use client";

import React from "react";
import { useEffect } from "react";
import PersonCard from "@src/app/About/PersonCard";
import Link from "next/link";

const AboutUsPage: React.FC = () => {
  // title of page
  useEffect(() => {
    document.title = "About";
  }, []);

  // add college and grad year to display

  const teamMembers = [
    {
      name: "Anna Xu",
      roles: ["Team Lead, Software Engineer"],
      image: "/dev_images/Anna_Xu.jpeg",
      github: "https://github.com/annaxu9",
      linkedin: "https://www.linkedin.com/in/anna-wenxin-xu/",
      portfolio: "",
    },
    {
      name: "Ephraim Akai-Nettey",
      roles: ["Team Lead, Software Engineer"],
      image: "/dev_images/Ephraim_Akai-Nettey.jpg",
      github: "https://github.com/dennisephraim",
      linkedin: "https://www.linkedin.com/in/ephraim-akai-nettey/",
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
      name: "Daniel Morales",
      roles: ["Software Engineer"],
      image: "/dev_images/Daniel_Morales.jpg",
      github: "https://github.com/dmo7567",
      linkedin: "https://www.linkedin.com/in/dmorales7567/",
      portfolio: undefined,
    },
    {
      name: "Brian Di Bassinga",
      roles: ["Software Engineer"],
      image: "/dev_images/Brian_Di_Bassinga.jpeg",
      github: "https://github.com/btd2026",
      linkedin: "https://www.linkedin.com/in/brian-di-bassinga-2399661a5?m",
      portfolio: undefined,
    },
    {
      name: "Ella White",
      roles: ["Software Engineer"],
      image: "/dev_images/Ella_White.png",
      github: undefined,
      linkedin: "https://www.linkedin.com/in/ella-white-707012243/",
      portfolio: undefined,
    },
    {
      name: "Farhan Baig",
      roles: ["Software Engineer"],
      image: "/dev_images/Farhan_Baig.jpeg",
      github: undefined,
      linkedin: "https://www.linkedin.com/in/baig-farhan/",
      portfolio: undefined,
    },
    {
      name: "Vojtech Kysilka",
      roles: ["Software Engineer"],
      image: "/dev_images/Vojtech_Kysilka.jpeg",
      github: undefined,
      linkedin: "https://www.linkedin.com/in/vojtech-kysilka/",
      portfolio: undefined,
    },
    {
      name: "Diego Aspinwall",
      roles: ["Software Engineer"],
      image: "/dev_images/Diego_Aspinwall.png",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Shankara Abbineni",
      roles: ["Software Engineer"],
      image: "/dev_images/Shankara_Abbineni.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Lleyton Emery",
      roles: ["Software Engineer"],
      image: "/dev_images/Lleyton_Emery.jpg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Lily Lin",
      roles: ["UI/UX Designer"],
      image: "/dev_images/Lily_Lin.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Naomi Ling",
      roles: ["UI/UX Designer"],
      image: "/dev_images/Naomi_Ling.jpeg",
      github: undefined,
      linkedin: "https://www.linkedin.com/in/naomi-ling/",
      portfolio: "https://naomiling.super.site/",
    },
    {
      name: "Asya Tarabar",
      roles: ["UI/UX Designer"],
      image: "/dev_images/Asya_Tarabar.jpeg",
      github: "https://www.linkedin.com/in/asya-tarabar/",
      linkedin: undefined,
      portfolio: "https://asyatarabar.com/",
    },
  ];

  const specialThanks = [
    {
      name: "Alejandro Gonzalez",
      roles: ["Software Engineer"],
      image: "/dev_images/Alejandro_Gonzalez.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Mary Jiang",
      roles: ["Software Engineer"],
      image: "/dev_images/Mary_Jiang.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Cierra Ouellette",
      roles: ["Software Engineer"],
      image: "/dev_images/Cierra_Ouellette.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Kelly Qiang",
      roles: ["Software Engineer"],
      image: "/dev_images/Kelly_Qiang.png",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Bienn Viquiera",
      roles: ["Software Engineer"],
      image: "/dev_images/Bienn_Viquiera.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
    {
      name: "Edward Yang",
      roles: ["Software Engineer"],
      image: "/dev_images/Edward_Yang.jpeg",
      github: undefined,
      linkedin: undefined,
      portfolio: undefined,
    },
  ];

  return (
    <div className="min-h-screen p-2 xs:p-8 flex flex-col items-center w-11/12 sm:w-4/5 justify-center max-w-[1500px] mx-auto">
      <h1 className="text-2xl sm:text-4xl font-bold text-center mb-4 sm:mb-8 pt-5 lg:-ml-6">
        About Us
      </h1>
      <p>
        Every school year Yale’s 14 colleges compete in intramural sports for
        the Tyng Cup. Learn more about how it all works{" "}
        <Link className="text-blue-600 dark:text-blue-300" href="/about-ims">
          here
        </Link>
        . As sports players and enthusiasts, we know how fun and rewarding
        sports and friendly competition can be, but we also understand how
        confusing logistics and poor organization can take away from the
        experience.
      </p>
      <br />
      <p>
        That’s why we, a small team of{" "}
        <Link
          target="_blank"
          className="text-blue-600 dark:text-blue-300"
          href={"https://yalecomputersociety.org/"}
        >
          y/cs (Yale Computer Society)
        </Link>{" "}
        developers, created YaleIMs—a platform designed to simplify scheduling,
        enhance communication, and reduce forfeits. With input from IM
        secretaries, referees, and players, our goal is to make intramurals more
        accessible and enjoyable for everyone. Have more questions? Check out
        our{" "}
        <Link className="text-blue-600 dark:text-blue-300" href="/faq">
          FAQ.
        </Link>
      </p>
      <br />
      <div className="mb-8 p-5 rounded-lg ">
        <p className="text-lg sm:text-3xl font-semibold pb-5 text-center md:-ml-6">
          Our Team
        </p>
        <div className="flex justify-center">
          <div className="grid xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 gap-4">
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
      </div>
      <div className="mb-8 p-5 rounded-lg">
        <p className="text-lg sm:text-3xl font-semibold pb-5 md:-ml-6 text-center">
          Special Thanks
        </p>
        <div className="flex justify-center">
          <div className="grid lg:grid-cols-6 md:grid-cols-4 grid-cols-2 xs:grid-cols-2 gap-4 sm:gap-8">
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
    </div>
  );
};

export default AboutUsPage;
