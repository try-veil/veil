import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class GrafanaService {
  private readonly logger = new Logger(GrafanaService.name);
  private grafanaUrl = this.config.get<string>('GRAFANA_URL') || 'http://localhost:4000';
  private adminAuth = {
    username: this.config.get<string>('GRAFANA_ADMIN_USER') || 'admin',
    password: this.config.get<string>('GRAFANA_ADMIN_PASSWORD') || 'admin'
  };

  constructor(private config: ConfigService) { }

  /**
   * Create Grafana user with FusionAuth ID as login
   */
  async createGrafanaUser(email: string, fusionAuthId: string, userPassword: string): Promise<number> {
    try {
      // Check if user already exists by login (which will be the fusionAuthId)
      try {
        const existingUser = await axios.get(
          `${this.grafanaUrl}/api/users/lookup?loginOrEmail=${fusionAuthId}`,
          { auth: this.adminAuth }
        );
        this.logger.debug(`Grafana user already exists with FusionAuth ID: ${fusionAuthId}`);
        return existingUser.data.id;
      } catch (error) {
        // User doesn't exist, create new one
        if (error.response?.status !== 404) {
          throw error;
        }
      }

      // Create user with FusionAuth ID as login for consistent identification
      const payload = {
        name: email,                // Display name is still email for readability
        email: email,               // Email for notifications
        login: fusionAuthId,        // Login is FusionAuth ID for consistent identification
        password: userPassword,     // Use the same password they signed up with!
        role: 'Editor'
      };

      this.logger.debug(`Creating new Grafana user with FusionAuth ID: ${fusionAuthId}`);
      const response = await axios.post(
        `${this.grafanaUrl}/api/admin/users`,
        payload,
        { auth: this.adminAuth }
      );

      // Ensure user is in the main organization with Editor role
      try {
        await axios.post(
          `${this.grafanaUrl}/api/orgs/1/users`,
          {
            loginOrEmail: fusionAuthId,  // Use FusionAuth ID here too
            role: 'Editor'
          },
          { auth: this.adminAuth }
        );
      } catch (orgError) {
        // User might already be in the org, which is fine
        this.logger.debug(`Note: ${orgError.message}`);
      }

      this.logger.debug(`Created Grafana user with ID: ${response.data.id} for FusionAuth ID: ${fusionAuthId}`);
      return response.data.id;

    } catch (error) {
      this.logger.error(`Failed to create Grafana user for FusionAuth ID ${fusionAuthId}:`, error.message);
      throw new Error(`Grafana user creation failed: ${error.message}`);
    }
  }

  /**
   * Create simple dashboard with Loki logs (public method for AuthService)
   */
  async createDashboard(email: string, fusionAuthId: string): Promise<string> {
    try {
      // Use FusionAuth ID for dashboard UID to ensure consistency
      const dashboardUid = `fa-${fusionAuthId.substring(0, 8)}-dashboard`;

      const dashboard = {
        dashboard: {
          title: `${email} Dashboard`,
          uid: dashboardUid,
          tags: ['provider', 'logs'],
          timezone: 'browser',
          refresh: '30s',
          time: {
            from: 'now-24h',
            to: 'now'
          },
          panels: [
            {
              id: 1,
              type: 'logs',
              title: 'Your API Logs',
              gridPos: { x: 0, y: 0, w: 24, h: 12 },
              targets: [
                {
                  expr: `{fusionAuthId="${fusionAuthId}"}`,  // Filter by FusionAuth ID
                  refId: 'A',
                  legendFormat: 'API Logs'
                }
              ],
              datasource: {
                type: 'loki',
                uid: 'loki'
              },
              options: {
                showTime: true,
                showLabels: true,
                wrapLogMessage: true,
                sortOrder: 'Descending'
              }
            }
          ]
        },
        overwrite: true,
        message: `Dashboard created for ${email} (${fusionAuthId})`
      };

      await axios.post(
        `${this.grafanaUrl}/api/dashboards/db`,
        dashboard,
        { auth: this.adminAuth }
      );

      this.logger.debug(`Created dashboard: ${dashboardUid} for user: ${email} (${fusionAuthId})`);
      return dashboardUid;

    } catch (error) {
      this.logger.error(`Failed to create dashboard for ${email} (${fusionAuthId}):`, error.message);
      throw new Error(`Dashboard creation failed: ${error.message}`);
    }
  }

  /**
   * Main method: Provision complete Grafana resources for user
   */
  async provisionUserResources(email: string, fusionAuthId: string, userPassword: string): Promise<{
    success: boolean;
    dashboardUid?: string;
    loginUrl?: string;
    grafanaUserId?: number;
    error?: string;
  }> {
    try {
      this.logger.debug(`Starting Grafana provisioning for: ${email} (${fusionAuthId})`);

      // Step 1: Create Grafana user with FusionAuth ID and same password
      const grafanaUserId = await this.createGrafanaUser(email, fusionAuthId, userPassword);

      // Step 2: Create dashboard
      const dashboardUid = await this.createDashboard(email, fusionAuthId);

      // Step 3: Generate standard login URL (same for all providers)
      const loginUrl = `${this.grafanaUrl}/login/generic_oauth`;

      this.logger.debug(`Successfully provisioned Grafana resources for: ${email} (${fusionAuthId})`);

      return {
        success: true,
        dashboardUid,
        loginUrl,
        grafanaUserId
      };

    } catch (error) {
      this.logger.error(`Grafana provisioning failed for ${email} (${fusionAuthId}):`, error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Simple health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      await axios.get(`${this.grafanaUrl}/api/health`, {
        auth: this.adminAuth,
        timeout: 5000
      });
      return { status: 'healthy', message: 'Grafana is accessible' };
    } catch (error) {
      return { status: 'unhealthy', message: `Grafana health check failed: ${error.message}` };
    }
  }
}