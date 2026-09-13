import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { createDashboardDTO } from '../../dtos/dashboard/create-dashboard.dto';
import { DashboardRO } from '../../dtos/dashboard/dashboard.ro';
import { updateDashboardDTO } from '../../dtos/dashboard/update-dashboard.dto';
import { ParameterRO } from '../../dtos/parameter/parameter.ro';
;

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private readonly parameterURL: string = 'http://localhost:4242/parameter';
  private readonly dashboardURL: string = 'http://localhost:4242/dashboard';

  constructor(private httpClient: HttpClient) { }

  createDashboard(dashboard: createDashboardDTO): Observable<DashboardRO> {
    return this.httpClient.post<DashboardRO>(this.dashboardURL, dashboard);
  }

  getDashboard(dashboardId: string): Observable<DashboardRO> {
    return this.httpClient.get<DashboardRO>(`${this.dashboardURL}/${dashboardId}`);
  }

  updateDashboard(dashboardId: string, updateDashboard: updateDashboardDTO): Observable<DashboardRO> {
    return this.httpClient.patch<DashboardRO>(`${this.dashboardURL}/${dashboardId}`, updateDashboard)
  }

  deleteDashboard(dashboardId: string): Observable<DashboardRO> {
    return this.httpClient.delete<DashboardRO>(`${this.dashboardURL}/${dashboardId}`);
  }

  getAllDashboards(IsLive: boolean): Observable<DashboardRO[]> {
    let queryParams = new HttpParams().append("IsLive", IsLive);
    return this.httpClient.get<DashboardRO[]>(this.dashboardURL, { params: queryParams });
  }

  getParameters(): Promise<ParameterRO[]> {
    return new Promise<ParameterRO[]>((res, rej) => {
      this.httpClient.get<ParameterRO[]>(this.parameterURL).subscribe((parameters: ParameterRO[]) => {
        if (parameters != null) {
          res(parameters);
        } else {
          rej("Promise is rejected!");
        }
      });
    })
  }
}
