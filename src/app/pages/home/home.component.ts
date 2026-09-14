import { Component, OnInit } from "@angular/core";
import { Role } from "src/app/common/enums/role.enum";
import { AuthGuardService } from "src/app/common/services/authGuard-service/auth-guard.service";

interface QuickLink {
  path: string;
  label: string;
  description: string;
  // Roles permitted to use this link. Omitted = every authenticated role.
  roles?: Role[];
}

/**
 * Shared landing screen for every role once they're past login. Kept
 * deliberately light for this pass: the shell restructure is what this
 * page exists to prove out (a real destination behind the command bar's
 * "Home" channel and the post-login redirect), not a fleshed-out mission
 * overview - that's a follow-up concern, same as Live/Archive's own
 * internal composition.
 */
@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit {
  username: string = "";

  private readonly allLinks: QuickLink[] = [
    { path: "/live", label: "Live", description: "Live telemetry and active mission control.", roles: [Role.Pilot, Role.ADMIN] },
    { path: "/archive", label: "Archive", description: "Review and debrief recorded flight data.", roles: [Role.Debrifer, Role.ADMIN] },
    { path: "/manager", label: "Admin", description: "Manage platform users and roles.", roles: [Role.ADMIN] },
  ];

  constructor(private readonly authGuard: AuthGuardService) { }

  ngOnInit(): void {
    this.username = localStorage.getItem("UserName") || "";
  }

  get links(): QuickLink[] {
    const role = this.authGuard.userRole;
    return this.allLinks.filter(link => !link.roles || link.roles.includes(role));
  }
}
