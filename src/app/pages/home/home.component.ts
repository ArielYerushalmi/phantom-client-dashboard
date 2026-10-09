import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { Role } from "src/app/common/enums/role.enum";
import { AuthGuardService } from "src/app/common/services/authGuard-service/auth-guard.service";
import { LiveLinkPhase, LtsService } from "src/app/common/services/lts-service/lts.service";
import { SensorAlertService, SensorLinkState, SensorState } from "src/app/common/services/sensor-alert-service/sensor-alert.service";

interface QuickLink {
  path: string;
  label: string;
  description: string;
  // Roles permitted to use this link. Omitted = every authenticated role.
  roles?: Role[];
}

/**
 * Shared landing screen for every role once they're past login: a greeting,
 * the channels this role can open, and a compact systems board (telemetry
 * link, safety sensor feed, active annunciators).
 */
@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
export class HomeComponent implements OnInit, OnDestroy {
  username: string = "";
  today = new Date();
  telemetryPhase: LiveLinkPhase = "idle";
  sensorLink: SensorLinkState = "offline";
  activeAlerts: SensorState[] = [];

  private readonly allLinks: QuickLink[] = [
    { path: "/live", label: "Live", description: "Watch telemetry as it arrives, with safety annunciators and limit tracking.", roles: [Role.Pilot, Role.ADMIN] },
    { path: "/archive", label: "Archive", description: "Replay recorded flights on a DVR timeline and debrief any parameter.", roles: [Role.Debrifer, Role.ADMIN] },
    { path: "/manager", label: "Admin", description: "Manage operator accounts and their roles.", roles: [Role.ADMIN] },
  ];

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly authGuard: AuthGuardService,
    private readonly lts: LtsService,
    private readonly sensorAlerts: SensorAlertService
  ) { }

  ngOnInit(): void {
    this.username = localStorage.getItem("UserName") || "";
    this.sensorAlerts.start();
    this.subscriptions.add(this.lts.linkState.subscribe((s) => this.telemetryPhase = s.phase));
    this.subscriptions.add(this.sensorAlerts.link$.subscribe((l) => this.sensorLink = l));
    this.subscriptions.add(this.sensorAlerts.states$.subscribe((states) => this.activeAlerts = states.filter((s) => s.active)));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get links(): QuickLink[] {
    const role = this.authGuard.userRole;
    return this.allLinks.filter(link => !link.roles || link.roles.includes(role));
  }

  get roleLabel(): string {
    switch (this.authGuard.userRole) {
      case Role.ADMIN: return "Administrator";
      case Role.Pilot: return "Pilot";
      case Role.Debrifer: return "Debriefer";
      default: return "Operator";
    }
  }

  get greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }

  get telemetryLabel(): string {
    switch (this.telemetryPhase) {
      case "live": return "Streaming";
      case "connecting": return "Connecting";
      case "reconnecting": return "Reconnecting";
      case "lost": return "Link lost";
      default: return "Standby";
    }
  }
}
