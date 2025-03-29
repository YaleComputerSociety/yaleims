"use client";

import React from "react";
import Dropdown from "../../components/Faq/Dropdown";
import Link from "next/link";

const AboutIMSPage: React.FC = () => {
  const faqs = [
    {
      question: "What is the Tyng Cup?",
      answer:
        "The Tyng Cup is awarded to the Yale college with the most points at the end of the academic school year. Points are earned in intramural contests, with each game awarding Tyng Cup points based on the number of athletes playing at one time. Below you will find more information on the point system.",
    },
    {
      question: "Who is eligible to play IMs?",
      answer:
        "All Yale undergraduates affiliated with a residential college and currently enrolled in classes are eligible, with restrictions on varsity, club, and professional athletes in associated sports. Non-undergraduates like residential heads and fellows may participate under specific conditions, but alumni, graduate students, and employees are ineligible.",
    },
    {
      question: "I'm a D1 athlete, can I play in IMs?",
      answer:
        "D1 athletes cannot participate in the sport they play at the varsity level or any associated sport. However, they may regain eligibility in their sport after a one-year absence from varsity competition. They are eligible to play other IM sports unrelated to their varsity involvement.",
    },
    {
      question: "What are the sports?",
      answer: "Read more information about sports and their rules here.",
      links: [{ label: "here", url: "/sports-info" }],
    },
    {
      question: "How does the point system work?",
      answer:
        "The Tyng Cup point system rewards colleges for overall performance in intramural sports. Points are awarded for wins and ties in regular season games and playoffs, based on factors like the number of player positions and contests. Every sport has a different point total, which you can find out here. A final standings report is published each season, and disputes must be submitted promptly to be considered. Talk to your college IM secretaries for more information.",
    },
    {
      question: "What are round robins and what are playoffs?",
      answer:
        "Round robins are the regular-season phase where teams compete against others in their division. There are always two divisions between the 14 colleges, and these divisions are determined by the Head IM Secretary. Each sport of the season includes a round robin followed by playoffs. All teams advance to the playoffs, with matchups based on seeding from the round robin results. Higher-seeded teams face lower-seeded teams in the early rounds. The more matches you play and the more wins or ties you achieve, the more overall points you earn for the Tyng Cup.",
    },
    {
      question: "Is there a penalty for forfeits?",
      answer:
        "No, there is no penalty for forfeits. While the official Yale Intramural Sports FAQ mentions penalties, these rules are not actively enforced. Hopefully, with YaleIMs, there will be more participation so that forfeits can rarely happen.",
    },
    {
      question:
        "Are undergraduate Yale Intramurals the same as the Yale graduate Intramurals?",
      answer:
        "No. If you are a graduate student, see more information for your intramurals here.",
      links: [{ label: "here", url: "https://recreation.yale.edu/gradproims" }],
    },
    {
      question: "What is the history of IMs?",
      answer:
        "Yale Intramurals began in the early 20th century as competitions for non-varsity athletes, originally organized by graduation classes. In 1933, with the inauguration of the Residential College system, teams shifted to being based on colleges, fostering closer community ties. That same year, the Tyng Cup was introduced and has been awarded annually to the college with the most Tyng points. In 1935, the tradition of the Harkness Cup Games began, where Yale and Harvard intramural champions compete, typically the day before The Game.",
    },
    {
      question: "Who oversees Intramural Sports?",
      answer:
        "The Intramurals program is managed by the Department of Campus Recreation, which oversees operations, hires staff, develops rules with IM Secretaries and the Rules Committee, ensures safety, and coordinates facilities and weather decisions. The Head IM Secretary, a student advisor, handles scheduling, statistics, and chairs IM Secretaries meetings. On the field, Intramural Supervisors ensure games run smoothly and address issues, while referees officiate games and report scores. Each residential college is represented by IM Secretaries, who organize teams, recruit captains, and foster participation within their colleges.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 px-10">
      <br />
      <br />
      <h1 className="text-3xl font-bold text-center">
        About Yale Undergraduate Intramurals
      </h1>
      <p className="text-md leading-relaxed">
        Yale Undergraduate Intramurals offer opportunities for athletic
        competition within the Yale community. Teams are organized through the
        14 residential colleges, promoting community, sportsmanship, and fun.
        The ultimate prize of the program is the coveted Tyng Cup, awarded
        annually to the college with the most points. See more information about
        the sports offered{" "}
        <Link className="text-blue-500" href={"/about-sports"}>
          here.
        </Link>
      </p>
      <br />
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <Dropdown
            key={index}
            question={faq.question}
            answer={faq.answer}
            links={faq.links}
          />
        ))}
      </div>
      <div className="flex gap-1">
        <p>See more FAQs</p>
        <Link className="text-blue-500" href={"/faq"}>
          here.
        </Link>
      </div>

      <br></br>
      <br></br>
    </div>
  );
};

export default AboutIMSPage;
