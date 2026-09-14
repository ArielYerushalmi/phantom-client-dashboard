import { Component, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { Role } from "src/app/common/enums/role.enum";
import { AuthGuardService } from "src/app/common/services/authGuard-service/auth-guard.service";
import { LtsService } from "src/app/common/services/lts-service/lts.service";

interface ChannelLink {
  path: string;
  label: string;
  // Roles permitted to see this channel. Omitted = every authenticated role.
  roles?: Role[];
}

/**
 * The shell's persistent top command bar: platform wordmark, the
 * horizontal channel selector (Home/Live/Archive/Admin), a live
 * connection-status strip, and the session/logout area. Replaces the old
 * black-dashboard-angular navbar-plus-collapsible-sidebar pattern with a
 * single, always-visible instrument strip.
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
  connectionActive: boolean = false;
  connectionLabel: string = "OFFLINE";

  private connectionStateSubscription: Subscription;

  constructor(
    private readonly router: Router,
    private readonly authGuard: AuthGuardService,
    private readonly ltsService: LtsService
  ) { }

  ngOnInit(): void {
    this.username = localStorage.getItem("UserName") || "";

    // Pick up whatever state the websocket is already in (e.g. a Live
    // session started earlier in this visit) instead of waiting on the
    // next open/close transition to know whether telemetry is flowing.
    this.applyConnectionState(this.ltsService._isOpened);
    this.connectionStateSubscription = this.ltsService.connectionState.subscribe(
      (isOpen: boolean) => this.applyConnectionState(isOpen)
    );
  }

  ngOnDestroy(): void {
    this.connectionStateSubscription?.unsubscribe();
  }

  /** Channels visible to the current user's role, in display order. */
  get channels(): ChannelLink[] {
    const role = this.authGuard.userRole;
    return this.allChannels.filter(channel => !channel.roles || channel.roles.includes(role));
  }

  logout(): void {
    this.router.navigateByUrl("/login");
  }

  private applyConnectionState(isOpen: boolean): void {
    this.connectionActive = isOpen;
    this.connectionLabel = isOpen ? "LIVE" : "OFFLINE";
  }
}
