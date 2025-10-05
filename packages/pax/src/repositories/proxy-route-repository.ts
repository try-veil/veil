import { db } from '../db';
import { proxyRoutes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateProxyRouteData } from '../types';

export class ProxyRouteRepository {
  async create(data: CreateProxyRouteData) {
    const [route] = await db.insert(proxyRoutes).values(data).returning();
    return route;
  }

  async findByUid(uid: string) {
    const [route] = await db.select()
      .from(proxyRoutes)
      .where(eq(proxyRoutes.uid, uid));
    return route || null;
  }

  async findByApiId(apiId: number) {
    return await db.select()
      .from(proxyRoutes)
      .where(eq(proxyRoutes.apiId, apiId));
  }

  async findMatchingRoute(apiId: number, method: string, path: string) {
    const routes = await this.findByApiId(apiId);

    // Find route that matches method and path pattern
    for (const route of routes) {
      if (route.method !== '*' && route.method !== method) {
        continue;
      }

      // Simple pattern matching (could be enhanced with regex)
      if (this.matchesPattern(path, route.pathPattern)) {
        return route;
      }
    }

    return null;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Convert pattern like /users/:id to regex
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
      .replace(/\*/g, '.*'); // Replace * with regex

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  async update(id: number, data: Partial<CreateProxyRouteData>) {
    const updateData: any = {
      updatedAt: new Date(),
      ...data,
    };

    const [updated] = await db.update(proxyRoutes)
      .set(updateData)
      .where(eq(proxyRoutes.id, id))
      .returning();

    return updated;
  }

  async delete(id: number) {
    await db.delete(proxyRoutes).where(eq(proxyRoutes.id, id));
  }
}

export const proxyRouteRepository = new ProxyRouteRepository();
