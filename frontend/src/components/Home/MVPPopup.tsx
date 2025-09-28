import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useUser } from "@src/context/UserContext";
import { useSeason } from "@src/context/SeasonContext";
import { seasonStart, getCurrentWeekId, buildWeekOptions } from "@src/utils/helpers";

const MVPPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const { currentSeason } = useSeason();
  const [mvps, setMvps] = useState<any>(null);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekId(seasonStart));  

  const weeks = buildWeekOptions(seasonStart);

  function getWeeklyMvps(): { email: string; data: any }[] {
    if (!mvps || !mvps[selectedWeek]) return [];
    return Object.entries(mvps[selectedWeek]).map(([email, data]) => ({
      email,
      data,
    }));
  }

  const [mvpData, setMvpData] = useState({
    fname: "Julien",
    lname: "Yang",
    photo: "/mvp_images/no_image.png",
    college: "Branford",
    year: "Junior",
    major: "Computer Science",
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isOpen) { html.classList.add("overflow-hidden")}
    else { html.classList.remove("overflow-hidden")}
    return () => {
      html.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchData = async () => {
      if (currentSeason) {
        const response = await fetch(`/api/functions/getMVPs?seasonId=${currentSeason.year}&collegeId=${user?.college}`, {
          method: "GET"
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMvps(data);
      }
    };
    fetchData();
  }, [currentSeason, user]);
  

  // useEffect(() => {
  //   fetch("https://yalies.io/graphql", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer YOUR_YALIES_API_KEY`,
  //     },
  //     body: JSON.stringify({
  //       query: `
  //         query {
  //           people(name: "Alex Johnson") {
  //             fname
  //             lname
  //             photo
  //             college
  //             year
  //             major
  //           }
  //         }
  //       `,
  //     }),
  //   })
  //     .then((res) => res.json())
  //     .then((data) => {
  //       const person = data?.data?.people?.[0];
  //       if (person) {
  //         setMvpData({
  //           fname: person.fname,
  //           lname: person.lname,
  //           photo: person.photo,
  //           college: person.college,
  //           year: person.year,
  //           major: person.major,
  //         });
  //       }
  //     });
  // }, []);

  return (
    <div>
      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center text-blue-600 underline font-medium text-sm hover:text-blue-800 transition w-20 h-46"
        >
          <img
            src="/mvp_images/mvpicon.png"
            alt="MVP Icon"
            className="w-15 h-20 filter drop-shadow-[0_4px_6px_rgba(59,130,246,0.6)]"
          />
          View MVP
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/60 items-center justify-center w-[100%] h-[100%] flex-col"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="dark:bg-custom_gray bg-white rounded-3xl  p-4 max-w-md w-full h-[80%] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className=" text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            {user ?
              <div className="flex flex-col h-[95%]">
                <h2 className="text-2xl font-bold text-center">
                  MOST VALUABLE PLAYER 🏆
                </h2>

                <div className="flex justify-between items-center mb-4 p-4">
                  <div className="items-center text-sm rounded-xl shadow">
                    {weeks.length > 0 && (
                      <select 
                        className="w-full rounded-lg border p-2"
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                      >
                        {weeks.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="">{user.college}</div>
                </div>

                <div className="relative gap-4 bg-white rounded-2xl p-4 flex flex-col items-center">
                  <Image
                    src="/mvp_images/newmedal.png"
                    alt="MVP Badge"
                    height={500}
                    width={400}
                    className="absolute left-[-17rem] top-[-3rem] drop-shadow-300w-10 z-50"
                  />
                  <div className="bg-gray-100 text-lg text-black rounded-xl p-3 w-full overflow-auto">
                    {getWeeklyMvps().length === 0 ? (
                      <p className="text-center text-gray-500">
                        No MVPs recorded for this week.
                      </p>
                    ) : (
                      getWeeklyMvps().map(({ email, data }) => (
                        <div key={email} className="flex items-center space-x-4 p-1">
                          <img
                            src={data.photo ?? "/mvp_images/no_image.png"}
                            alt={`${data.fname} ${data.lname}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-semibold">
                              {data.fname} {data.lname}
                            </p>
                            {/* add more fields if you store them */}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-auto flex flex-col text-center text-sm text-blue-800">
                  Know someone who deserves the spotlight?{" "}
                  <a href="/hub" className="underline font-semibold">
                    Contact your college representatitve!
                  </a>
                </div>
              </div> : 
              <div>Please log in to view MVP details.</div>
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default MVPPopup;
