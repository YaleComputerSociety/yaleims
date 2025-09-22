import React, { useState, useEffect } from "react";

const MVPPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [college, setCollege] = useState("Trumbull");
  const [mvpData, setMvpData] = useState({
    fname: "Julien",
    lname: "Yang",
    photo: "/mvp_images/no_image.png",
    college: "Branford",
    year: "Junior",
    major: "Computer Science",
  });

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
    <>
      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center text-blue-600 underline font-medium text-sm hover:text-blue-800 transition w-20 h-46"
        >
          <img
            src="/mvp_images/mvpicon.png"
            alt="MVP Icon"
            className="w-20 h-30 filter drop-shadow-[0_4px_6px_rgba(59,130,246,0.6)]"
          />
          View MVP
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-gradient-to-b from-[#E8F0FF] to-[#BBD3FF] rounded-3xl p-4 max-w-md w-full relative shadow-2xl">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold text-center text-blue-800">
                MOST VALUABLE PLAYER 🏆
              </h2>

              <div className="flex justify-between items-center mb-4 p-4">
                <div className="bg-white text-blue-800 font-semibold text-sm rounded-xl px-3 py-1 shadow">
                  {new Date().toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <select
                  className="border border-blue-500 rounded-xl px-2 py-1 text-blue-800 font-semibold shadow"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                >
                  <option>Benjamin Franklin</option>
                  <option>Branford</option>
                  <option>Davenport</option>
                  <option>Ezra Stiles</option>
                  <option>Grace Hopper</option>
                  <option>Jonathan Edwards</option>
                  <option>Morse</option>
                  <option>Pauli Murray</option>
                  <option>Pierson</option>
                  <option>Saybrook</option>
                  <option>Silliman</option>
                  <option>Timothy Dwight</option>
                  <option>Trumbull</option>
                </select>
              </div>

              <div className="relative gap-4 bg-white rounded-2xl p-4 flex flex-col items-center">
                <img
                  src="/mvp_images/newmedal.png"
                  alt="MVP Badge"
                  className="absolute left-[-15rem] top-[-3rem] drop-shadow-300w-10 z-50"
                />

                {mvpData.photo ? (
                  <img
                    src={mvpData.photo}
                    alt={`${mvpData.fname} ${mvpData.lname}`}
                    className="w-52 h-40 rounded-lg object-cover mb-3"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded-lg mb-3" />
                )}

                <div className="bg-gray-100 text-lg text-black rounded-xl p-3 w-full">
                  Congratulations to{" "}
                  <strong className="text-blue-600">
                    {mvpData.fname} {mvpData.lname}
                  </strong>
                  , a{" "}
                  <strong className="text-blue-600">{mvpData.year}</strong> in{" "}
                  <strong className="text-blue-600">{mvpData.college}</strong>{" "}
                  College studying{" "}
                  <strong className="text-blue-600">{mvpData.major}</strong>, for being named this week&apos;s Most Valuable Player. 🏅 Keep up the great work{" "}
                  <strong className="text-blue-600">{mvpData.fname}</strong>!
                </div>
              </div>

              <div className="mt-4 text-center text-sm text-blue-800">
                Know someone who deserves the spotlight?{" "}
                <a href="/contact" className="underline font-semibold">
                  Contact your college representatitve!
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MVPPopup;
