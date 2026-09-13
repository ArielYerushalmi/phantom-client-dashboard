import { Role } from "../../enums/role.enum";

export interface IUser {
    username: string;
    password: string;
    email: string;
    // age: number;
    role: Role;
}