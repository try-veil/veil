import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class GrafanaService {
  private readonly logger = new Logger(GrafanaService.name);
  private url = this.config.get<string>('GRAFANA_URL');
  private adminUser = this.config.get<string>('GRAFANA_ADMIN_USER');
  private adminPassword = this.config.get<string>('GRAFANA_ADMIN_PASSWORD');

  constructor(private config: ConfigService) {}

  private auth() {
    return { auth: { username: this.adminUser, password: this.adminPassword } };
  }

  async provisionProviderResources(providerId: string, providerEmail: string) {
    // 0. Create Grafana user if missing
    // const randomPass = crypto.randomBytes(12).toString('base64');
    // await axios.post(
    //   `${this.url}/api/admin/users`,
    //   {
    //     name: providerId,
    //     email: providerEmail,
    //     login: providerEmail,
    //     password: randomPass,
    //     role: 'Editor'
    //   },
    //   {
    //     auth: {
    //       username: process.env.GRAFANA_ADMIN_USER,
    //       password: process.env.GRAFANA_ADMIN_PASSWORD
    //     }
    //   }
    // ).catch(err => {
    //   if (err.response?.status !== 409) throw err;
    // });

    // 1. Create folder
    const folderUid = `${providerId}-folder`;
    await axios.post(
      `${this.url}/api/folders`,
      { title: `${providerId} Folder`, uid: folderUid },
      {
        auth: {
          username: process.env.GRAFANA_ADMIN_USER,
          password: process.env.GRAFANA_ADMIN_PASSWORD
        }
      }
    ).catch(err => {
      if (err.response?.status !== 409) throw err;
    });

    const dashboardUid = `${providerId}-dashboard`;
    const dashboard = {
      dashboard: {
        title: `${providerId} Dashboard`,
        uid: dashboardUid,
        panels: [
          {
            type: 'logs',
            title: 'Provider Logs',
            datasource: { type: 'loki', uid: 'loki' },
            targets: [
              { expr: `{provider_id="${providerId}"}`, refId: 'A' }
            ],
            gridPos: { x: 0, y: 0, w: 24, h: 9 }
          }
        ]
      },
      folderUid,
      overwrite: false
    };
    await axios.post(
      `${this.url}/api/dashboards/db`,
      dashboard,
      this.auth()
    ).catch(err => {
      if (err.response?.status !== 412) throw err;
    });

    const userResp = await axios.get(
      `${this.url}/api/users/lookup?loginOrEmail=${encodeURIComponent(providerEmail)}`,
      this.auth()
    );
    const userId = userResp.data.id;

    await axios.post(
      `${this.url}/api/folders/${folderUid}/permissions`,
      {
        items: [
          { userId, permission: 1 }
        ]
      },
      this.auth()
    );
    return { folderUid, dashboardUid };
  }
}