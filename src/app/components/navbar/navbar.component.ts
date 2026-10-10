import { Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { Role } from "src/app/common/enums/role.enum";
import { AuthGuardService } from "src/app/common/services/authGuard-service/auth-guard.service";
import { LiveLinkState, LtsService } from "src/app/common/services/lts-service/lts.service";
import { SensorAlertService } from "src/app/common/services/sensor-alert-service/sensor-alert.service";

interface ChannelLink {
  path: string;
  label: string;
  // Roles permitted to see this channel. Omitted = every authenticated role.
  roles?: Role[];
}

/**
 * The shell's persistent top command bar: wordmark, channel selector,
 * master warning/caution lamps fed by the sensors-service safety stream,
 * the live telemetry link state, a UTC mission clock, and the session area.
 */
@Component({
  selector: "app-navbar",
  templateUrl: "./navbar.component.html",
  styleUrls: ["./navbar.component.scss"]
})
export class NavbarComponent implements OnInit, OnDestroy {
  private readonly allChannels: ChannelLink[] = [
    { path: "/home", label: "Home" },
    { path: "/live", label: "Live", roles: [Role.Pilot, Role.ADMIN] },
    { path: "/archive", label: "Archive", roles: [Role.Debrifer, Role.ADMIN] },
    { path: "/manager", label: "Admin", roles: [Role.ADMIN] }
  ];

  username: string = "";
  link: LiveLinkState = { phase: "idle", attempt: 0, maxAttempts: 5, retryInMs: 0 };
  master = { warning: false, caution: false };
  utcTime: string = "--:--:--";

  private readonly subscriptions = new Subscription();
  private clockTimer: any;

  constructor(
    private readonly router: Router,
    private readonly authGuard: AuthGuardService,
    private readonly ltsService: LtsService,
    private readonly sensorAlerts: SensorAlertService,
    private readonly zone: NgZone
  ) { }

  ngOnInit(): void {
    this.username = localStorage.getItem("UserName") || "";

    this.subscriptions.add(this.ltsService.linkState.subscribe((state) => this.link = state));

    this.sensorAlerts.start();
    this.subscriptions.add(this.sensorAlerts.master$.subscribe((master) => this.master = master));

    this.tickClock();
    // Run the interval outside Angular and re-enter only to publish the new string,
    // so a 1 Hz clock doesn't trigger change detection on its own schedule.
    this.zone.runOutsideAngular(() => {
      this.clockTimer = setInterval(() => this.zone.run(() => this.tickClock()), 1000);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    clearInterval(this.clockTimer);
  }

  /** Channels visible to the current user's role, in display order. */
  get channels(): ChannelLink[] {
    const role = this.authGuard.userRole;
    return this.allChannels.filter(channel => !channel.roles || channel.roles.includes(role));
  }

  get linkLabel(): string {
    switch (this.link.phase) {
      case "live": return "Live";
      case "connecting": return "Connecting";
      case "reconnecting": return `Retry ${this.link.attempt}/${this.link.maxAttempts}`;
      case "lost": return "Link lost";
      default: return "Standby";
    }
  }

  onMasterClick(): void {
    if (this.channels.some((c) => c.path === "/live")) {
      this.router.navigateByUrl("/live");
    }
  }

  logout(): void {
    this.router.navigateByUrl("/login");
  }

  private tickClock(): void {
    this.utcTime = new Date().toISOString().substring(11, 19);
  }
}
