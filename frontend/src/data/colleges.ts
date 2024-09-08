export interface College {
    id: string;
    name: string;
    points: number;
  }
  
  export const colleges: { [key: string]: College } = {
    "1": { id: "1", name: "Benjamin Franklin", points: 1 },
    "2": { id: "2", name: "Berkeley", points: 2 },
    "3": { id: "3", name: "Branford", points: 3 },
    "4": { id: "4", name: "Davenport", points: 4 },
    "5": { id: "5", name: "Ezra Stiles", points: 5 },
    "6": { id: "6", name: "Grace Hopper", points: 6 },
    "7": { id: "7", name: "Jonathan Edwards", points: 7 },
    "8": { id: "8", name: "Morse", points: 8 },
    "9": { id: "9", name: "Pauli Murray", points: 9 },
    "10": { id: "10", name: "Pierson", points: 10 },
    "11": { id: "11", name: "Saybrook", points: 11 },
    "12": { id: "12", name: "Silliman", points: 12 },
    "13": { id: "13", name: "Timothy Dwight", points: 13 },
    "14": { id: "14", name: "Trumbull", points: 14 }
  };
  