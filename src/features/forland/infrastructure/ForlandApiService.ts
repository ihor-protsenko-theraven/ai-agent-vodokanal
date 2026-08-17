/**
 * Forland API Service
 * Handles authentication and repository data retrieval from Forland API
 *
 * Requests go through a same-origin proxy to avoid CORS:
 * - Vite:       Vite dev-server proxy (/forland -> https://wsn1.forland-solution.com)
 * - Vercel:     serverless function (/api/forland), in production and `vercel dev`
 */

import { apiConfig } from '@/shared/config';
import {
  CreateNewUnitRequest,
  CreateNewUnitResponse,
  GetListParams,
  GetListResponse,
  LoginRequest,
  RepositoryResponse,
  SaveRequest,
  SaveResponse,
  UnclosedTicketSummary,
  Unit,
  ValueItem
} from '@/shared/types';
import { toUnclosedTicketSummary } from '@/features/forland/domain/forlandTicketSummary';

class ForlandApiService {
  private baseUrl: string = apiConfig.FORLAND.PROXY_BASE_PATH;
  private authToken: string | null = null;

  /**
   * Login to Forland API
   */
  async login(login: string, password: string): Promise<boolean> {
    try {
      const request: LoginRequest = { login, p: password };
      const formData = new FormData();
      formData.append('request', JSON.stringify(request));

      const response = await fetch(`${this.baseUrl}${apiConfig.FORLAND.LOGIN_PATH}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        // Extract auth token from response if available
        const authHeader = response.headers.get('Authorization');
        if (authHeader) {
          this.authToken = authHeader;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  /**
   * Logout from Forland API
   */
  async logout(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${apiConfig.FORLAND.LOGOUT_PATH}`, {
        method: 'GET',
        credentials: 'include'
      });

      this.authToken = null;

      return response.ok;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Get repository data
   */
  async getRepository(): Promise<RepositoryResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}${apiConfig.FORLAND.REPOSITORY_PATH}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data as RepositoryResponse;
      }

      return null;
    } catch (error) {
      console.error('GetRepository error:', error);
      return null;
    }
  }

  /**
   * Get dropdown options by system type ID
   */
  async getDropdownOptionsBySystemType(systemTypeId: number): Promise<ValueItem[] | null> {
    try {
      const repository = await this.getRepository();
      const metaClasses = repository?.logical?.metaClasses;
      if (!metaClasses) return null;

      // Find the system type by ID in systemType section
      const systemTypes = metaClasses.systemType?.Childs ?? [];
      const targetSystemType = systemTypes.find((item) => item.ID === systemTypeId);

      if (!targetSystemType || !targetSystemType.ValueIDs) {
        return null;
      }

      // Get values by ValueIDs from systemTypeValue section
      const values: ValueItem[] = [];
      const systemTypeValues = metaClasses.systemTypeValue?.Childs ?? [];
      for (const valueId of targetSystemType.ValueIDs) {
        const found = systemTypeValues.find((item) => item.ID === valueId);
        if (found && found.Title) {
          values.push({
            ID: found.ID,
            Value: found.Title
          });
        }
      }

      return values;
    } catch (error) {
      console.error('GetDropdownOptionsBySystemType error:', error);
      return null;
    }
  }

  /**
   * Get objects list by kindUnitID (class code).
   * kindUnitID is required; stateID and logID are optional filters.
   * Returns a flat list of { ID, Value: Title } suitable for dropdowns.
   */
  async getList(params: GetListParams): Promise<ValueItem[] | null> {
    try {
      const query = new URLSearchParams();
      query.set('kindUnitID', String(params.kindUnitID));
      if (params.stateID != null) {
        query.set('stateID', String(params.stateID));
      }
      if (params.logID != null) {
        query.set('logID', String(params.logID));
      }

      const response = await fetch(`${this.baseUrl}${apiConfig.FORLAND.GET_LIST_PATH}?${query.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        return null;
      }

      return (data as GetListResponse)
        .filter((item) => item && item.ID != null && item.Title)
        .map((item) => ({
          ID: item.ID,
          Value: String(item.Title).trim()
        }));
    } catch (error) {
      console.error('GetList error:', error);
      return null;
    }
  }

  /**
   * Get all unclosed tickets by kindUnitID with multiple stateIDs.
   * This helps to avoid duplicates by checking all active ticket states.
   */
  async getUnclosedTickets(kindUnitID: number, stateIDs: readonly number[]): Promise<UnclosedTicketSummary[] | null> {
    try {
      const query = new URLSearchParams();
      query.set('kindUnitID', String(kindUnitID));
      
      // Add multiple stateID parameters
      stateIDs.forEach(stateID => {
        query.append('stateID', String(stateID));
      });

      const response = await fetch(`${this.baseUrl}${apiConfig.FORLAND.GET_LIST_PATH}?${query.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        return null;
      }

      return (data as GetListResponse)
        .filter((item) => item && item.ID != null)
        .map(toUnclosedTicketSummary);
    } catch (error) {
      console.error('GetUnclosedTickets error:', error);
      return null;
    }
  }

  /**
   * Create a new unit template for the specified kindUnitID.
   * Returns an initialized unit structure that can be used for creating new tickets.
   */
  async createNewUnit(kindUnitID: number): Promise<CreateNewUnitResponse | null> {
    try {
      const request: CreateNewUnitRequest = { KindUnitID: kindUnitID };
      const formData = new FormData();
      formData.append('request', JSON.stringify(request));

      const response = await fetch(`${this.baseUrl}${apiConfig.FORLAND.CREATE_NEW_UNIT_PATH}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data as CreateNewUnitResponse;
    } catch (error) {
      console.error('CreateNewUnit error:', error);
      return null;
    }
  }

  /**
   * Save a ticket (create new or update existing).
   * Handles both creation (negative ID) and update (positive ID) scenarios.
   */
  async saveTicket(request: SaveRequest): Promise<SaveResponse | null> {
    try {
      const formData = new FormData();
      formData.append('request', JSON.stringify(request));

      const response = await fetch(`${this.baseUrl}${apiConfig.FORLAND.SAVE_PATH}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as SaveResponse;
      return { ...data, transportStatus: response.status };
    } catch (error) {
      console.error('SaveTicket error:', error);
      return null;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null;
  }
}

export const forlandApiService = new ForlandApiService();
export type { 
  CreateNewUnitRequest, 
  CreateNewUnitResponse, 
  GetListParams, 
  GetListResponse, 
  LoginRequest, 
  RepositoryResponse, 
  SaveRequest, 
  SaveResponse, 
  UnclosedTicketSummary,
  Unit, 
  ValueItem 
};
