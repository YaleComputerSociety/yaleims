const bets = [
  {
    userId: "abu.kamara@yale.edu",
    betId: "sKSPq0tFckIkeW6o8seS",
    betAmount: 10,
    betOption: "SM",
    sport: "Dodgeball",
    home_college: "SM",
    createdAt: {
      seconds: 1739415711,
      nanoseconds: 550000000,
    },
    betOdds: 0.27816897822142844,
    matchId: "494",
    away_college: "BK",
  },
  {
    userId: "adam.buchsbaum@yale.edu",
    betId: "lm6gWzfZf8NwK2naCm8z",
    betOption: "BF",
    matchId: "500",
    createdAt: {
      seconds: 1737596249,
      nanoseconds: 224000000,
    },
    away_college: "BF",
    betAmount: 150,
    sport: "Dodgeball",
    home_college: "JE",
    betOdds: 0.25343762004124515,
  },
  {
    userId: "addison.goolsbee@yale.edu",
    betId: "fDGBNTgpiTpcUrvpCbPK",
    sport: "Dodgeball",
    matchId: "493",
    away_college: "BF",
    createdAt: {
      seconds: 1739406998,
      nanoseconds: 667000000,
    },
    betAmount: 100,
    home_college: "TD",
    betOption: "BF",
    betOdds: 0.2909220420554996,
  },
  {
    userId: "akhil.elangovan@yale.edu",
    betId: "LYpUiZxpJi3MH6jhzToC",
    betOption: "BR",
    createdAt: {
      seconds: 1737486962,
      nanoseconds: 17000000,
    },
    betOdds: 0.2619734689214759,
    sport: "Dodgeball",
    home_college: "PC",
    away_college: "BR",
    matchId: "497",
    betAmount: 250,
  },
  {
    userId: "amelia.lee@yale.edu",
    betId: "ISl1I1n37CMSdevmWlqB",
    home_college: "GH",
    matchId: "495",
    betOdds: 0.4383429403132143,
    betOption: "GH",
    createdAt: {
      seconds: 1737504877,
      nanoseconds: 917000000,
    },
    betAmount: 1,
    away_college: "DC",
    sport: "Dodgeball",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "DXW2VpAj1o4MhoQE5iHW",
    home_college: "ES",
    betOption: "JE",
    sport: "Dodgeball",
    createdAt: {
      seconds: 1739328897,
      nanoseconds: 612000000,
    },
    betOdds: 0.33069588307413056,
    matchId: "492",
    betAmount: 20,
    away_college: "JE",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "6x3XZnWz2wYpemjzdjDj",
    betOption: "BF",
    away_college: "BF",
    betOdds: 0.34633576435178526,
    home_college: "TD",
    betAmount: 10,
    createdAt: {
      seconds: 1739328913,
      nanoseconds: 162000000,
    },
    matchId: "493",
    sport: "Dodgeball",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "EHps2IjzUb6na9PSQsTI",
    betOption: "SM",
    betAmount: 10,
    betOdds: 0.36550867012458405,
    matchId: "494",
    createdAt: {
      seconds: 1739735899,
      nanoseconds: 661000000,
    },
    home_college: "BR",
    sport: "W-Hoops",
    away_college: "SM",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "Z9g9aWtnNYbMXs8WQNZ6",
    createdAt: {
      seconds: 1739328925,
      nanoseconds: 966000000,
    },
    betOdds: 0.3192487835969386,
    betAmount: 10,
    home_college: "SM",
    away_college: "BK",
    sport: "Dodgeball",
    betOption: "SM",
    matchId: "494",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "oJdftuXUZ7mkRk9AncfE",
    betAmount: 30,
    createdAt: {
      seconds: 1737466566,
      nanoseconds: 749000000,
    },
    matchId: "495",
    betOdds: 0.3831701670395408,
    betOption: "GH",
    home_college: "GH",
    sport: "Dodgeball",
    away_college: "DC",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "IOqv2m3Lyn6RmO4ryOq3",
    matchId: "496",
    away_college: "MY",
    betOdds: 0.3084301945528861,
    createdAt: {
      seconds: 1737504202,
      nanoseconds: 576000000,
    },
    home_college: "TC",
    sport: "Dodgeball",
    betAmount: 20,
    betOption: "MY",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "7vG1jLyQ1Tocd8a4rXuw",
    sport: "Dodgeball",
    betAmount: 10,
    createdAt: {
      seconds: 1737504225,
      nanoseconds: 68000000,
    },
    betOption: "PC",
    betOdds: 0.2619734689214759,
    away_college: "BR",
    home_college: "PC",
    matchId: "497",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "UeswckeBxNrWATL7O5XS",
    betAmount: 15,
    matchId: "498",
    home_college: "SM",
    betOption: "SY",
    createdAt: {
      seconds: 1737547630,
      nanoseconds: 148000000,
    },
    sport: "Dodgeball",
    away_college: "SY",
    betOdds: 0.3129507088812194,
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "eXAEEDXk8AhqzXsphq3K",
    matchId: "499",
    betOption: "ES",
    sport: "Dodgeball",
    home_college: "ES",
    betOdds: 0.479869086667989,
    betAmount: 20,
    createdAt: {
      seconds: 1737547647,
      nanoseconds: 761000000,
    },
    away_college: "TD",
  },
  {
    userId: "anna.xu@yale.edu",
    betId: "xwu2IUzcuZFhSs2w0oJE",
    away_college: "BF",
    betOption: "BF",
    sport: "Dodgeball",
    matchId: "500",
    betOdds: 0.27363241232906066,
    createdAt: {
      seconds: 1737547670,
      nanoseconds: 424000000,
    },
    betAmount: 50,
    home_college: "JE",
  },
  {
    userId: "b.bennett@yale.edu",
    betId: "5WLJheiH2SJpjQDErV6L",
    matchId: "497",
    sport: "Dodgeball",
    betOption: "BR",
    away_college: "BR",
    betAmount: 25,
    createdAt: {
      seconds: 1737499510,
      nanoseconds: 962000000,
    },
    home_college: "PC",
    betOdds: 0.2619734689214759,
  },
  {
    userId: "benjamin.mousseau@yale.edu",
    betId: "Qlhl2PMxAwM4mWBUu0oL",
    createdAt: {
      seconds: 1737486120,
      nanoseconds: 893000000,
    },
    sport: "Dodgeball",
    betOption: "SY",
    away_college: "SY",
    betAmount: 30,
    home_college: "SM",
    matchId: "498",
    betOdds: 0.3174484654482548,
  },
  {
    userId: "brooks.meine@yale.edu",
    betId: "prUvxBlxbtE4x9R3MOpN",
    sport: "Dodgeball",
    betOption: "ES",
    matchId: "499",
    betAmount: 250,
    createdAt: {
      seconds: 1737508194,
      nanoseconds: 780000000,
    },
    betOdds: 0.48213016891814425,
    home_college: "ES",
    away_college: "TD",
  },
  {
    userId: "christian.tamez@yale.edu",
    betId: "zhhbGIIrltp8Yiav4blW",
    home_college: "JE",
    betOption: "BF",
    sport: "Dodgeball",
    betAmount: 20,
    createdAt: {
      seconds: 1737481084,
      nanoseconds: 532000000,
    },
    betOdds: 0.20659012599595933,
    matchId: "500",
    away_college: "BF",
  },
  {
    userId: "cutter.renowden@yale.edu",
    betId: "CakrTbUxymKDg2ibYB03",
    betAmount: 250,
    away_college: "SY",
    sport: "Dodgeball",
    createdAt: {
      seconds: 1737476096,
      nanoseconds: 799000000,
    },
    betOdds: 0.2851687894631157,
    home_college: "SM",
    betOption: "SM",
    matchId: "498",
  },
  {
    userId: "d.cho@yale.edu",
    betId: "SHXRSKehsdo5zbL6ALx5",
    betAmount: 250,
    createdAt: {
      seconds: 1737474631,
      nanoseconds: 602000000,
    },
    betOption: "BF",
    betOdds: 0.24594062618566584,
    matchId: "500",
    sport: "Dodgeball",
    away_college: "BF",
    home_college: "JE",
  },
  {
    userId: "daniel.siegel@yale.edu",
    betId: "L8hgg3FruHSeEqCtqZzq",
    away_college: "SY",
    createdAt: {
      seconds: 1737473464,
      nanoseconds: 425000000,
    },
    home_college: "SM",
    betOdds: 0.31686477876929,
    betOption: "SY",
    matchId: "498",
    sport: "Dodgeball",
    betAmount: 500,
  },
  {
    userId: "diego.aspinwall@yale.edu",
    betId: "CoR3UvwQqIlom27B6GyV",
    matchId: "498",
    createdAt: {
      seconds: 1737474606,
      nanoseconds: 758000000,
    },
    betOption: "SM",
    betOdds: 0.26616641416620357,
    sport: "Dodgeball",
    away_college: "SY",
    home_college: "SM",
    betAmount: 100,
  },
  {
    userId: "dylan.council@yale.edu",
    betId: "Je58P1U7tiCSxs8s33g1",
    betOdds: 0.31227914577737104,
    createdAt: {
      seconds: 1737512778,
      nanoseconds: 214000000,
    },
    sport: "Dodgeball",
    betAmount: 25,
    away_college: "BR",
    home_college: "PC",
    betOption: "BR",
    matchId: "497",
  },
  {
    userId: "dylan.council@yale.edu",
    betId: "qSyegO5AqqAYfNe9oDdq",
    betOption: "SY",
    matchId: "498",
    home_college: "SM",
    createdAt: {
      seconds: 1737512812,
      nanoseconds: 433000000,
    },
    away_college: "SY",
    sport: "Dodgeball",
    betOdds: 0.3160328433736835,
    betAmount: 25,
  },
  {
    userId: "dylan.council@yale.edu",
    betId: "u8QYpmJlovA75tNgWabS",
    betOdds: 0.48213016891814425,
    home_college: "ES",
    sport: "Dodgeball",
    matchId: "499",
    betOption: "TD",
    createdAt: {
      seconds: 1737512828,
      nanoseconds: 985000000,
    },
    betAmount: 10,
    away_college: "TD",
  },
  {
    userId: "dylan.council@yale.edu",
    betId: "QoazOiym6raGrSZtmzkY",
    createdAt: {
      seconds: 1737512557,
      nanoseconds: 259000000,
    },
    home_college: "JE",
    sport: "Dodgeball",
    betAmount: 50,
    betOption: "BF",
    betOdds: 0.274675232378938,
    away_college: "BF",
    matchId: "500",
  },
  {
    userId: "emerson.soo-hoo@yale.edu",
    betId: "PFuoz6yi8zPs0aBp8VAN",
    betOdds: 0.436529606979881,
    betAmount: 25,
    sport: "Dodgeball",
    createdAt: {
      seconds: 1737495767,
      nanoseconds: 312000000,
    },
    away_college: "DC",
    home_college: "GH",
    betOption: "GH",
    matchId: "495",
  },
  {
    userId: "emiliano.colin-diaz@yale.edu",
    betId: "EourEXbqp6E1XmJfMNgw",
    sport: "Dodgeball",
    betOption: "TD",
    away_college: "TD",
    betOdds: 0.4799361332653742,
    home_college: "ES",
    betAmount: 10,
    createdAt: {
      seconds: 1737596705,
      nanoseconds: 520000000,
    },
    matchId: "499",
  },
  {
    userId: "emiliano.colin-diaz@yale.edu",
    betId: "vlpRDphZRdsEXetaPA4U",
    betOdds: 0.24672598542263377,
    betAmount: 200,
    betOption: "BF",
    matchId: "500",
    sport: "Dodgeball",
    createdAt: {
      seconds: 1737596724,
      nanoseconds: 872000000,
    },
    home_college: "JE",
    away_college: "BF",
  },
  {
    userId: "ephraim.akai-nettey@yale.edu",
    betId: "kJdoVby4w10vo49wQh9Z",
    matchId: "495",
    sport: "Dodgeball",
    away_college: "DC",
    betOption: "GH",
    betOdds: 0.48186294031321436,
    createdAt: {
      seconds: 1737473139,
      nanoseconds: 988000000,
    },
    betAmount: 50,
    home_college: "GH",
  },
  {
    userId: "etai.smotrich-barr@yale.edu",
    betId: "G6ILWwcM7HZjrLJE5vDJ",
    sport: "Dodgeball",
    matchId: "495",
    betAmount: 100,
    home_college: "GH",
    away_college: "DC",
    createdAt: {
      seconds: 1737483003,
      nanoseconds: 466000000,
    },
    betOdds: 0.4747518292021033,
    betOption: "DC",
  },
  {
    userId: "evan.yip@yale.edu",
    betId: "iRbk5TQ6Q9FaAgdUcrhX",
    createdAt: {
      seconds: 1737475697,
      nanoseconds: 861000000,
    },
    betAmount: 10,
    home_college: "PC",
    matchId: "497",
    betOdds: 0.31187317728747127,
    away_college: "BR",
    sport: "Dodgeball",
    betOption: "BR",
  },
  {
    userId: "gabriel.escobedo@yale.edu",
    betId: "jQVXlrrp4FNvsId5UroJ",
    betAmount: 20,
    betOption: "DC",
    sport: "Dodgeball",
    away_college: "DC",
    betOdds: 0.48186294031321436,
    matchId: "495",
    createdAt: {
      seconds: 1737482001,
      nanoseconds: 714000000,
    },
    home_college: "GH",
  },
  {
    userId: "gabriel.escobedo@yale.edu",
    betId: "zrVIixGypuiazpBu3eUU",
    matchId: "496",
    home_college: "TC",
    sport: "Dodgeball",
    createdAt: {
      seconds: 1737507783,
      nanoseconds: 61000000,
    },
    betAmount: 20,
    away_college: "MY",
    betOption: "MY",
    betOdds: 0.3262079723306639,
  },
  {
    userId: "gabriel.escobedo@yale.edu",
    betId: "YmqS5szJXCVjX67DdsAr",
    home_college: "PC",
    betOption: "BR",
    createdAt: {
      seconds: 1737507650,
      nanoseconds: 132000000,
    },
    sport: "Dodgeball",
    betOdds: 0.3229258498738568,
    away_college: "BR",
    matchId: "497",
    betAmount: 100,
  },
  {
    userId: "george.cheung@yale.edu",
    betId: "X8DTWTdNAiEvPtQNYhVy",
    matchId: "495",
    sport: "Dodgeball",
    home_college: "GH",
    betAmount: 100,
    away_college: "DC",
    betOdds: 0.48186294031321436,
    betOption: "GH",
    createdAt: {
      seconds: 1737480258,
      nanoseconds: 391000000,
    },
  },
  {
    userId: "henry.hoak@yale.edu",
    betId: "bxnDsvAV499vx3rHInYz",
    createdAt: {
      seconds: 1739374344,
      nanoseconds: 108000000,
    },
    away_college: "JE",
    sport: "Dodgeball",
    home_college: "ES",
    betOdds: 0.33069588307413056,
    betAmount: 200,
    betOption: "JE",
    matchId: "492",
  },
  {
    userId: "henry.hoak@yale.edu",
    betId: "9XpWsahK1TZxECsmel7n",
    home_college: "SM",
    betOdds: 0.42816897822142846,
    matchId: "494",
    sport: "Dodgeball",
    betAmount: 150,
    betOption: "BK",
    away_college: "BK",
    createdAt: {
      seconds: 1739374359,
      nanoseconds: 964000000,
    },
  },
  {
    userId: "howard.dai@yale.edu",
    betId: "rxu9Lk4CxTSSzcjOCxjE",
    betOption: "BR",
    betAmount: 250,
    sport: "Dodgeball",
    betOdds: 0.2619734689214759,
    createdAt: {
      seconds: 1737492428,
      nanoseconds: 351000000,
    },
    away_college: "BR",
    home_college: "PC",
    matchId: "497",
  },
  {
    userId: "hunter.wimsatt@yale.edu",
    betId: "krUQ02WmhkIXkIf86zBQ",
    away_college: "SY",
    createdAt: {
      seconds: 1737473521,
      nanoseconds: 209000000,
    },
    betOption: "SY",
    home_college: "SM",
    betAmount: 250,
    matchId: "498",
    betOdds: 0.26616641416620357,
    sport: "Dodgeball",
  },
  {
    userId: "jake.hammerman@yale.edu",
    betId: "SDnrb8atY1PIgXZuFJFj",
    home_college: "ES",
    betAmount: 250,
    matchId: "499",
    betOdds: 0.38348829633112413,
    betOption: "ES",
    createdAt: {
      seconds: 1737494633,
      nanoseconds: 409000000,
    },
    away_college: "TD",
    sport: "Dodgeball",
  },
  {
    userId: "kyle.abraham@yale.edu",
    betId: "LnL69bfkXexkuEbQ6KTM",
    betAmount: 50,
    home_college: "TC",
    betOption: "MY",
    matchId: "496",
    betOdds: 0.3084301945528861,
    createdAt: {
      seconds: 1737481878,
      nanoseconds: 72000000,
    },
    sport: "Dodgeball",
    away_college: "MY",
  },
  {
    userId: "kyle.abraham@yale.edu",
    betId: "Fh5j5YdE2sTS6AIf9Y1I",
    sport: "Dodgeball",
    betAmount: 50,
    betOption: "BR",
    away_college: "BR",
    home_college: "PC",
    betOdds: 0.2619734689214759,
    matchId: "497",
    createdAt: {
      seconds: 1737481930,
      nanoseconds: 87000000,
    },
  },
  {
    userId: "marcos.membreno@yale.edu",
    betId: "qbBS6SHZBNwGlxyjgjZR",
    sport: "Dodgeball",
    matchId: "497",
    betOption: "BR",
    betAmount: 100,
    betOdds: 0.31709308614635623,
    away_college: "BR",
    home_college: "PC",
    createdAt: {
      seconds: 1737511541,
      nanoseconds: 786000000,
    },
  },
  {
    userId: "mateo.bodon@yale.edu",
    betId: "O2E3qg7VenmWEvJYMOT6",
    betOdds: 0.48186294031321436,
    sport: "Dodgeball",
    betOption: "GH",
    matchId: "495",
    away_college: "DC",
    createdAt: {
      seconds: 1737481480,
      nanoseconds: 566000000,
    },
    betAmount: 250,
    home_college: "GH",
  },
  {
    userId: "mert.tarim@yale.edu",
    betId: "FWNCfgL0e9MCgoChxEOv",
    createdAt: {
      seconds: 1737513915,
      nanoseconds: 942000000,
    },
    matchId: "497",
    betOption: "BR",
    home_college: "PC",
    away_college: "BR",
    sport: "Dodgeball",
    betAmount: 250,
    betOdds: 0.3112042381522451,
  },
  {
    userId: "mert.tarim@yale.edu",
    betId: "J3j01eBEBWW1zJXf3lGk",
    matchId: "500",
    sport: "Dodgeball",
    createdAt: {
      seconds: 1737593350,
      nanoseconds: 403000000,
    },
    home_college: "JE",
    betOption: "BF",
    betOdds: 0.2682343016677921,
    away_college: "BF",
    betAmount: 204,
  },
  {
    userId: "muyi.aghedo@yale.edu",
    betId: "5KOENNrTaxFhwXVrByG0",
    betAmount: 50,
    betOption: "DC",
    away_college: "DC",
    createdAt: {
      seconds: 1737485394,
      nanoseconds: 657000000,
    },
    home_college: "GH",
    betOdds: 0.4469538494041234,
    matchId: "495",
    sport: "Dodgeball",
  },
  {
    userId: "royce.haynes@yale.edu",
    betId: "tHdQMCFFdY3uEVyNbngb",
    createdAt: {
      seconds: 1737599647,
      nanoseconds: 247000000,
    },
    matchId: "500",
    sport: "Dodgeball",
    betOdds: 0.24056370168027885,
    betAmount: 200,
    away_college: "BF",
    home_college: "JE",
    betOption: "BF",
  },
  {
    userId: "samir.batheja@yale.edu",
    betId: "03JX8yg8TkLcmTaQ4GHf",
    matchId: "492",
    home_college: "ES",
    away_college: "JE",
    betOdds: 0.3936855750882507,
    createdAt: {
      seconds: 1739248008,
      nanoseconds: 343000000,
    },
    sport: "Dodgeball",
    betAmount: 200,
    betOption: "JE",
  },
  {
    userId: "samir.batheja@yale.edu",
    betId: "aX5LZSE3Dxf3KHEUJseL",
    matchId: "500",
    home_college: "JE",
    betOdds: 0.20659012599595933,
    sport: "Dodgeball",
    betOption: "JE",
    away_college: "BF",
    betAmount: 200,
    createdAt: {
      seconds: 1737509450,
      nanoseconds: 590000000,
    },
  },
  {
    userId: "sharif.hassen@yale.edu",
    betId: "jxTLA1NBlSbFRUK8YBgX",
    sport: "Dodgeball",
    betOption: "ES",
    away_college: "TD",
    createdAt: {
      seconds: 1737516273,
      nanoseconds: 253000000,
    },
    betAmount: 250,
    home_college: "ES",
    matchId: "499",
    betOdds: 0.4789929140161834,
  },
  {
    userId: "shela.mensah@yale.edu",
    betId: "q27UVTI3KEgn7df578gu",
    betOdds: 0.3160772876064888,
    home_college: "SM",
    betOption: "SY",
    sport: "Dodgeball",
    matchId: "498",
    createdAt: {
      seconds: 1737486320,
      nanoseconds: 594000000,
    },
    away_college: "SY",
    betAmount: 1,
  },
  {
    userId: "thomas.luong@yale.edu",
    betId: "G30YnaLHH4B3N2b2LWEJ",
    away_college: "BR",
    betAmount: 100,
    sport: "Dodgeball",
    matchId: "497",
    createdAt: {
      seconds: 1737505060,
      nanoseconds: 813000000,
    },
    home_college: "PC",
    betOption: "PC",
    betOdds: 0.26466254455172794,
  },
  {
    userId: "timothy.ward@yale.edu",
    betId: "kcrYk14Wvo6m9d2td9rm",
    betOdds: 0.3084301945528861,
    matchId: "496",
    sport: "Dodgeball",
    betOption: "TC",
    betAmount: 10,
    home_college: "TC",
    createdAt: {
      seconds: 1737506218,
      nanoseconds: 506000000,
    },
    away_college: "MY",
  },
  {
    userId: "tyler.chen.tzc2@yale.edu",
    betId: "N3puBqVaulbN5iEvUv2J",
    away_college: "BR",
    betOption: "PC",
    betAmount: 250,
    betOdds: 0.2872972099286701,
    home_college: "PC",
    matchId: "497",
    createdAt: {
      seconds: 1737506193,
      nanoseconds: 755000000,
    },
    sport: "Dodgeball",
  },
  {
    userId: "william.massey@yale.edu",
    betId: "JZisz2o93YxkMjCUwSEL",
    sport: "Dodgeball",
    away_college: "MY",
    home_college: "TC",
    createdAt: {
      seconds: 1737477132,
      nanoseconds: 565000000,
    },
    matchId: "496",
    betOption: "MY",
    betAmount: 10,
    betOdds: 0.36717880303915007,
  },
  {
    userId: "youngin.kim@yale.edu",
    betId: "1kPR8zlTmLYAFHXvXL57",
    betOption: "SY",
    home_college: "SM",
    sport: "Dodgeball",
    betAmount: 50,
    away_college: "SY",
    createdAt: {
      seconds: 1737578375,
      nanoseconds: 990000000,
    },
    matchId: "498",
    betOdds: 0.31232155383644455,
  },
  {
    userId: "youngin.kim@yale.edu",
    betId: "3Flddx5ABks3g7RqPWIr",
    createdAt: {
      seconds: 1737578394,
      nanoseconds: 864000000,
    },
    matchId: "499",
    sport: "Dodgeball",
    betAmount: 5,
    away_college: "TD",
    home_college: "ES",
    betOption: "ES",
    betOdds: 0.47992306777460175,
  },
];

function calculateVolumes(bets) {
  const matchVolumes = {};

  bets.forEach((bet) => {
    const { matchId, betAmount, betOption, home_college, away_college } = bet;

    if (!matchVolumes[matchId]) {
      matchVolumes[matchId] = {
        home_volume: 0,
        away_volume: 0,
        draw_volume: 0,
        default_volume: 0,
      };
    }

    if (betOption === home_college) {
      matchVolumes[matchId].home_volume += betAmount;
    } else if (betOption === away_college) {
      matchVolumes[matchId].away_volume += betAmount;
    } else if (betOption === "DRAW") {
      matchVolumes[matchId].draw_volume += betAmount;
    } else {
      matchVolumes[matchId].default_volume += betAmount;
    }
  });

  return matchVolumes;
}

const result = calculateVolumes(bets);
console.log(result);
