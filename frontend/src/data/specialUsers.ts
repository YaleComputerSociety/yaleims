export interface User {
    netid: string;
    firstname: string;
    lastname: string;
    college: string;
    role: "player" | "referee" | "secretary" | "admin";
    personalPoints: number;
  }
  
  export const specialUsers: User[] = [
    {
      netid: "ref_123",
      firstname: "John",
      lastname: "Doe",
      college: "Timothy Dwight",
      role: "referee",
      personalPoints: 30,
    },
    {
      netid: "ref_456",
      firstname: "Jane",
      lastname: "Smith",
      college: "Silliman",
      role: "referee",
      personalPoints: 50,
    },
    {
      netid: "sec_001",
      firstname: "Emily",
      lastname: "Johnson",
      college: "Berkeley",
      role: "secretary",
      personalPoints: 75,
    },
    {
      netid: "admin_001",
      firstname: "Robert",
      lastname: "Brown",
      college: "Saybrook",
      role: "admin",
      personalPoints: 100,
    },
    {
      netid: "admin_002",
      firstname: "Alice",
      lastname: "Davis",
      college: "Morse",
      role: "admin",
      personalPoints: 95,
    },
    {
        netid: "abc123",
        firstname: "Anna",
        lastname: "Xu",
        college: "Branford",
        role: "referee", // Could be "player", "referee", "secretary", or "admin"
        personalPoints: 45,
    }
  ];
  