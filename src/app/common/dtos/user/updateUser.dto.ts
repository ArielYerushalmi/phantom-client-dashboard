import { Role } from "../../enums/role.enum";

export class updateUserDTO {
    password: string;
    role: Role;

    constructor(password?: string, role?: Role) {
        this.password = password;
        this.role = role;
    }
}