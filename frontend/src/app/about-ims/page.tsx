"use client";

import React from "react";

const AboutIMSPage: React.FC = () => {
    return (
        <div className="w-4/5 mx-auto space-y-8">
            <br></br>
            <br></br>
            <h1 className="text-3xl font-bold text-center text-blue-700">
                About Yale Undergraduate Intramurals
            </h1>
            <p className="text-lg leading-relaxed">
                Yale Undergraduate Intramurals offer opportunities for athletic competition within the Yale community. Teams are organized through the 14 residential colleges, promoting community, sportsmanship, and fun. The ultimate prize of the program is the coveted Tyng Cup, awarded annually to the college with the most points.
            </p>

            <h2 className="text-2xl font-semibold text-blue-700">
                Who Can Participate?
            </h2>
            <p className="text-lg leading-relaxed">
                All current Yale College students are eligible to participate.
            </p>

            <h2 className="text-2xl font-semibold text-blue-700">
                What Makes Intramurals Unique?
            </h2>
            <p className="text-lg leading-relaxed">
                Intramurals focus on exercise, recreation, and light competition among Yale teams. Unlike club sports, which involve external competitions and higher commitment levels, intramurals are accessible to all skill levels and prioritize fun and community.
            </p>

            <h2 className="text-2xl font-semibold text-blue-700">
                The Tyng Cup
            </h2>
            <p className="text-lg leading-relaxed">
                The Tyng Cup, established in 1933, is awarded to the college with the highest points at the end of the year. Points are earned based on game wins and the number of players per game.
            </p>

            <h2 className="text-2xl font-semibold text-blue-700">
                Administration
            </h2>
            <p className="text-lg leading-relaxed">
                The program is managed by the Department of Campus Recreation, with support from the Head Intramural Secretary, Supervisors, Referees, and the IM Secretaries from each residential college. Together, they ensure smooth operations and student participation.
            </p>

            <h2 className="text-2xl font-semibold text-blue-700">
                History
            </h2>
            <p className="text-lg leading-relaxed">
                Intramurals date back to the early 20th century but were reorganized in 1933 with the introduction of the residential college system and the Tyng Cup. The Harkness Cup Games, introduced in 1935, pit Yale and Harvard champions against each other.
            </p>
        </div>
    );
};

export default AboutIMSPage;
