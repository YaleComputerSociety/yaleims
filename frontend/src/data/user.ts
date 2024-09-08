export interface User {
    netid: string;
    firstname: string;
    lastname: string;
    college: string;
    role: "player" | "referee" | "secretary" | "admin";
    personalPoints: number;
  }
  
  export const loggedInUser: User = {
    netid: "abc123",
    firstname: "Anna",
    lastname: "Xu",
    college: "Branford",
    role: "admin", // Could be "player", "referee", "secretary", or "admin"
    personalPoints: 45,
  };
  