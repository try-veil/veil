import { proxyApiRepository } from '../repositories/proxy-api-repository';
import { CreateProxyApiData, UpdateProxyApiData } from '../types';

export class ProxyApiService {
  async createApi(data: CreateProxyApiData) {
    // Validate upstream URL
    try {
      new URL(data.upstreamUrl);
    } catch (error) {
      throw new Error('Invalid upstream URL');
    }

    // Check if slug already exists
    const existing = await proxyApiRepository.findBySlug(data.slug);
    if (existing) {
      throw new Error(`API with slug '${data.slug}' already exists`);
    }

    return await proxyApiRepository.create(data);
  }

  async getApi(slug: string) {
    const api = await proxyApiRepository.findBySlug(slug);
    if (!api) {
      throw new Error('API not found');
    }
    return api;
  }

  async getApiByUid(uid: string) {
    return await proxyApiRepository.findByUid(uid);
  }

  async listApis(activeOnly: boolean = false) {
    return await proxyApiRepository.findAll(activeOnly);
  }

  async updateApi(uid: string, data: UpdateProxyApiData) {
    const api = await proxyApiRepository.findByUid(uid);
    if (!api) {
      throw new Error('API not found');
    }

    // Validate upstream URL if provided
    if (data.upstreamUrl) {
      try {
        new URL(data.upstreamUrl);
      } catch (error) {
        throw new Error('Invalid upstream URL');
      }
    }

    return await proxyApiRepository.update(api.id, data);
  }

  async deleteApi(uid: string) {
    const api = await proxyApiRepository.findByUid(uid);
    if (!api) {
      throw new Error('API not found');
    }

    return await proxyApiRepository.delete(api.id);
  }

  async enableApi(uid: string) {
    return await this.updateApi(uid, { isActive: true });
  }

  async disableApi(uid: string) {
    return await this.updateApi(uid, { isActive: false });
  }
}

export const proxyApiService = new ProxyApiService();
