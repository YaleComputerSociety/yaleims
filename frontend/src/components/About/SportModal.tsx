"use client";

import React from "react";
import { emojiMap } from "@src/utils/helpers";
import { SportModalProps, SportInfo } from "@src/types/components";

const sportInfoMap: Record<string, SportInfo> = {
  Soccer: {
    points: 11,
    players: 11,
    description:
      "Soccer is played with two teams of 11 players, including a designated goalkeeper. Matches consist of two 30-minute halves, with ties resolved through overtime or sudden death if necessary. The game starts with a kickoff, and goals are scored by propelling the ball into the opposing team's net using any body part except the hands or arms. Play is continuous, except for infractions, which result in free kicks, penalty kicks, or throw-ins, depending on the situation. Players must avoid offside positioning, fouls, and dangerous play. Substitutions are unlimited, and the team with the most goals at the end of regulation or overtime wins.",
  },
  Cornhole: {
    points: 6,
    players: 2,
    description:
      "Cornhole is a 2v2 game where teammates stand opposite each other and take turns throwing four bean bags underhand toward a board with a hole. Bags on the board score 1 point, while bags in the hole score 3 points, using cancellation scoring (only one team scores per round). Players can knock off opponents' bags to reduce their score. The first team to reach or exceed 21 points wins. Games are best-of-3, and all players must follow the eligibility rules and late policies. ",
  },
  Spikeball: {
    points: 6,
    players: 2,
    description:
      "Spikeball is played 2v2 with teams alternating hits (up to 3) to bounce the ball off the net so the opposing team cannot return it. The game starts with a serve, where the server stands 7 feet away and hits the ball into the net. Players can move freely after the serve. Points are scored if the ball hits the ground, rim, or isn’t returned properly. Games are to 21 points (win by 2) in a best-of-3 format. Defensive players must avoid blocking offensive plays, and infractions like illegal serves or rim hits result in possession changes.",
  },
  Pickleball: {
    points: 6,
    players: 2,
    description:
      "Pickleball is played in doubles with teams competing in a best-of-3-games match, with games played to 11 points (win by 2). Only the serving team can score, and servers alternate sides after each point. Both teams must let the ball bounce once on each side during the first two hits (double bounce rule), after which volleys are allowed. Players must avoid stepping into the non-volley zone when volleying. Faults include hitting out of bounds, failing to clear the net, or violating the double bounce or non-volley rules. Teams switch sides after each game, and the first to win 2 games takes the match.",
  },
  "Table Tennis": {
    points: 8,
    players: 8,
    description:
      "Table tennis is played as 4 singles and 2 doubles, with the tiebreak determined by the number of sets won. Matches consist of the best of 3 games, each played to 21 points (win by 2). Players or pairs alternate serves every 5 points, with a single serve alternating after 20-20.In singles, players take turns hitting the ball after it bounces once on their side, aiming to return it over the net. In doubles, teammates alternate hits in sequence. Points are scored when the opponent fails to return the ball, hits it out of bounds, or commits a fault during service or play. Teams must rotate ends after each game, with service and receiving roles reversing.",
  },
  "Flag Football": {
    points: 6,
    players: 6,
    description:
      "Flag football is played with two teams of six players in four quarters of 15 plays each. Teams have five downs to score a touchdown, starting each play with a snap from the line of scrimmage. The game emphasizes non-contact, with players pulling flags instead of tackling to stop the ball carrier. Substitutions are unlimited and allowed during stoppages. Points are scored through touchdowns (6 points) and optional extra points (1 or 2 points). Defensive players must wait three seconds before rushing the quarterback, and forward passes must originate from behind the line of scrimmage. Play is continuous, with penalties for infractions like offsides, flag guarding, or unsportsmanlike conduct. The team with the most points at the end of regulation wins.",
  },
  Broomball: {
    points: 6,
    players: 6,
    description:
      "Broomball is a hockey-like game played on ice with teams of 6, including a goalie. Players use brooms to hit a ball into the opposing team’s goal. The game consists of two 15-minute halves, with the team scoring the most goals winning. Players must wear helmets and non-slip shoes; skates are not allowed. High sticks, body contact, and sliding into opponents are penalized. The ball must be played with the broom, and only the goalie can use hands to stop the ball in the crease. Ties in playoffs are resolved with a shootout.",
  },
  CHoops: {
    points: 5,
    players: 5,
    description:
      "Basketball is played with two teams of five players, aiming to score points by shooting the ball into the opposing team's basket. Games consist of two 20-minute halves, with stop time in the final two minutes of each half. If tied, a 3-minute overtime period is played. Teams can call timeouts (two per half, one in overtime). Initial possession is determined by a jump ball, with alternating possession thereafter. Points are scored as one (free throw), two (inside the arc), or three (outside the arc). Common violations include traveling, double dribbling, and fouls, which may result in free throws or changes in possession.",
  },
  MHoops: {
    points: 5,
    players: 5,
    description:
      "Basketball is played with two teams of five players, aiming to score points by shooting the ball into the opposing team's basket. Games consist of two 20-minute halves, with stop time in the final two minutes of each half. If tied, a 3-minute overtime period is played. Teams can call timeouts (two per half, one in overtime). Initial possession is determined by a jump ball, with alternating possession thereafter. Points are scored as one (free throw), two (inside the arc), or three (outside the arc). Common violations include traveling, double dribbling, and fouls, which may result in free throws or changes in possession.",
  },
  WHoops: {
    points: 5,
    players: 5,
    description:
      "Basketball is played with two teams of five players, aiming to score points by shooting the ball into the opposing team's basket. Games consist of two 20-minute halves, with stop time in the final two minutes of each half. If tied, a 3-minute overtime period is played. Teams can call timeouts (two per half, one in overtime). Initial possession is determined by a jump ball, with alternating possession thereafter. Points are scored as one (free throw), two (inside the arc), or three (outside the arc). Common violations include traveling, double dribbling, and fouls, which may result in free throws or changes in possession.",
  },
  Dodgeball: {
    points: 8,
    players: 8,
    description:
      "Dodgeball is played with two teams of eight players, with four needed to start a match. The game is a best-of-five series, with each game lasting up to 7 minutes. Players are eliminated by being hit by a live ball, having a live ball caught, or dropping a ball due to contact with a live ball. Caught balls bring back the teammate eliminated the longest. Games start with players retrieving balls from the center line and must throw from behind the attacking line. A team possessing all six balls must throw at least two within 10 seconds. Blocking with a ball is allowed unless the blocker drops their ball. If the game is tied after 7 minutes, a 2-minute overtime with a smaller court is played. The team with the most players remaining wins. Substitutions are allowed between games, and each team has one 30-second timeout per game.",
  },
  "Indoor Soccer": {
    points: 5,
    players: 5,
    description:
      "Indoor soccer is played with teams of five (4 field players and a goalie) in two 20-minute halves, with ties in playoffs resolved by overtime and shootouts. Kick-ins replace throw-ins, and there are no offside rules. Slide tackling is prohibited, and dangerous play results in an indirect free kick. Goalkeepers can handle the ball within the three-point arc but must release it within 5 seconds using a roll—no punts or aerial throws allowed. Goals are scored by kicking the ball into the net, with penalty kicks taken from the top of the arc.",
  },
  Volleyball: {
    points: 6,
    players: 6,
    description:
      "Volleyball is played with teams of six, requiring at least four players to start. Matches are best-of-three games, each played to 21 points with rally scoring (win by 2). Teams rotate clockwise after winning a side-out, and substitutions are unlimited. Players are allowed three touches to return the ball, excluding blocks, and back-row players may only spike or block from behind the 10-foot line. Serves must be from behind the back line and cannot be blocked or spiked. The ball is in play if it lands on the boundary line, and illegal moves include double hits, carries, or touching the net.",
  },
  Netball: {
    points: 7,
    players: 7,
    description:
      "Netball is played with teams of seven on a court divided into five zones, with players restricted to specific zones. The objective is to pass the ball up the court, zone by zone, and score by shooting into the opposing team’s hoop. Players cannot run or dribble with the ball, and passes skipping zones or to oneself result in turnovers. Defenders cannot contact opponents or block a free pass, and holding the ball for more than three seconds results in a violation. Free passes allow unimpeded movement within one zone, while penalty shots are live after the shot’s apex. Teams must have at least five players to start, with late arrivals penalized incrementally.",
  },
};

const SportModal: React.FC<SportModalProps> = ({ sport, setSport }) => {
  if (!sport) {
    return null;
  }

  const onExit = () => {
    setSport(null);
  };

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center"
      onClick={onExit}
    >
      <div
        className="bg-white dark:bg-black rounded-3xl shadow-lg w-full max-w-md flex flex-col mx-4 text-xs md:text-base"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-row bg-blue-400 dark:bg-blue-600 w-full rounded-t-3xl p-8 py-4 justify-between items-center">
          <h2 className="text-2xl font-bold">{sport}</h2>
          <h2 className="text-3xl">{emojiMap[sport]}</h2>
        </div>
        <div className="px-8 py-4">
          <div>
            <div className="flex flex-row space-x-4 gap-1">
              <p className="font-bold">Points: </p>
              {sportInfoMap[sport].points}
            </div>
            <div className="flex flex-row space-x-4 gap-1">
              <p className="font-bold">Players Per Team: </p>
              {sportInfoMap[sport].players}
            </div>
          </div>
          <div className="mt-4">
            <p className="font-bold">How To Play: </p>
            <p>{sportInfoMap[sport].description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SportModal;
