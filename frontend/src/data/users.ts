export interface User {
    netid: string;
    firstname: string;
    lastname: string;
    college: string;
    role: "player" | "referee" | "secretary" | "admin";
    personalPoints: number;
  }
  
  export const users: User[] = [
    {
      netid: "abc123",
      firstname: "Anna",
      lastname: "Xu",
      college: "Branford",
      role: "admin",
      personalPoints: 45,
    },
    {
      netid: "xyz456",
      firstname: "John",
      lastname: "Doe",
      college: "Timothy Dwight",
      role: "player",
      personalPoints: 25,
    },
    {
      netid: "jane789",
      firstname: "Jane",
      lastname: "Smith",
      college: "Silliman",
      role: "admin",
      personalPoints: 95,
    },
    {
      netid: "sec001",
      firstname: "Emily",
      lastname: "Johnson",
      college: "Berkeley",
      role: "secretary",
      personalPoints: 80,
    },
    // Add more users as needed
  ];
  