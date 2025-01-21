"use client";

import Dropdown from "@src/components/faq/Dropdown";

export default function FAQ() {
  const sections = [
    {
      title: "About Us",
      faqs: [
        {
          question: "What is YaleIMs?",
          answer:
            "YaleIMs is a platform designed to simplify and enhance Yale's undergraduate intramural sports experience by addressing the key communication challenges intramurals currently face.",
        },
        {
          question: "Who runs YaleIMs?",
          answer:
            "YaleIMs is run by a small team of volunteers within the Yale Computer Society.",
          links: [
            { label: "Team", url: "/about-us" },
            {
              label: "Yale Computer Society",
              url: "https://yalecomputersociety.org/",
            },
          ],
        },
        {
          question:
            "What is the problem with intramural sports currently / Why YaleIMs?",
          answer:
            "Intramural sports face logistical challenges due to communication gaps and organizational complexities, making it difficult to fully maximize participation and coordination. YaleIMs is a thoughtfully designed platform that makes it easy for everyone to stay informed, stay connected, and fully enjoy the experience of intramural sports.",
        },
        {
          question: "What is the history of YaleIMs?",
          answer:
            "YaleIMs began as a small project two years ago and has grown into a platform designed to simplify and improve intramural sports organization. While many teams have attempted similar projects in the past without success, as members of the Yale Computer Society, we are committed to making this app a reality.",
        },
      ],
    },
    {
      title: "Using YaleIMs",
      faqs: [
        {
          question: "Who can use YaleIMs?",
          answer:
            "YaleIMs is a publicly accessible app where anyone can view standings. However, to sign up for sports, you must be a current Yale undergraduate with a Yale email address. You can only sign in with a Yale email address.",
        },
        {
          question: "Where can I submit feedback or bugs?",
          answer:
            "If you have a suggestion or find a bug, please submit our general feedback form. We'll be in touch as soon as possible.",
          links: [{ label: "General Feedback Form", url: "#" }],
        },
        {
          question: "How can I contribute?",
          answer:
            "The YaleIMs website is open-source and available at our Github repository. If you'd like to join the team, apply to the Yale Computer Society.",
          links: [
            {
              label: "Github Repository",
              url: "https://github.com/YaleComputerSociety/yaleims",
            },
            {
              label: "Yale Computer Society",
              url: "https://yalecomputersociety.org/join",
            },
          ],
        },
        {
          question: "Do you have a privacy policy?",
          answer: "You can find our privacy policy here.",
          links: [{ label: "Privacy Policy", url: "/privacy-policy" }],
        },
      ],
    },
    {
      title: "Questions About IMs",
      faqs: [
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
          links: [{ label: "here", url: "/about-sports" }],
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
          links: [
            { label: "here", url: "https://recreation.yale.edu/gradproims" },
          ],
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
      ],
    },
    {
      title: "Predicting Game Outcomes",
      faqs: [
        {
          question: "How do predictions work?",
          answer:
            "Odds is a fun game of speculation where you can place virtual predictions on Yale intramural games using Ycoins, showcasing your prediction skills and college spirit. Odds determine your potential winnings based on the likelihood of the outcome.",
        },
        {
          question: "What are YCoins?",
          answer:
            "YCoins are virtual coins used in YaleIMs. Each user starts with 500 YCoins to place predictions on intramural games. Winnings depend on your predictions and the odds of the match.",
        },
        {
          question: "How do YCoins work? Can I lose all my YCoins?",
          answer:
            "Each week, you receive 500 YCoins to place predictions on intramural games. If your predictions are incorrect, you can lose your YCoins, but the game is designed to be fun and not financially impactful.",
        },
        {
          question: "How are odds determined?",
          answer:
            "Odds are calculated using an algorithm that considers team performance, such as frequent winners versus underdogs. This affects your potential winnings from bets.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-lg sm:text-3xl font-bold text-center mb-2 sm:mb-6">
          Frequently Asked Questions
        </h1>
        <p className="text-center mb-3">
          Have another question?{" "}
          <a className="text-blue-500" href="#">
            Contact us
          </a>
          .
        </p>
        {sections.map((section, index) => (
          <div key={index} className="mb-8">
            <h2 className="text-lg sm:text-2xl font-semibold mb-4">
              {section.title}
            </h2>
            <div className="space-y-4 ml-5">
              {section.faqs.map((faq, i) => (
                <Dropdown
                  key={i}
                  question={faq.question}
                  answer={faq.answer}
                  links={faq.links || []}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
