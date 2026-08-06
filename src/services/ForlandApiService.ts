/**
 * Forland API Service
 * Handles authentication and repository data retrieval from Forland API
 *
 * Requests go through a same-origin proxy to avoid CORS:
 * - Dev:  Vite dev server proxy (/forland -> https://zhytomyr.forland-solution.com)
 * - Prod: Vercel serverless function (/api/forland)
 */

interface LoginRequest {
  login: string;
  p: string;
}

interface RepositoryChild {
  ID: number;
  Title?: string;
  Value?: string;
  ValueIDs?: number[];
}

interface RepositoryMetaClasses {
  systemType?: { Childs?: RepositoryChild[] };
  systemTypeValue?: { Childs?: RepositoryChild[] };
}

interface RepositoryResponse {
  logical?: {
    metaClasses?: RepositoryMetaClasses;
  };
}

interface ValueItem {
  ID: number;
  Value: string;
}

class ForlandApiService {
  private baseUrl: string = import.meta.env.DEV ? '/forland' : '/api/forland';
  private authToken: string | null = null;

  /**
   * Login to Forland API
   */
  async login(login: string, password: string): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('request', JSON.stringify({ login, p: password }));

      const response = await fetch(`${this.baseUrl}/Account/login`, {
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
      const response = await fetch(`${this.baseUrl}/Account/logout`, {
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
      const response = await fetch(`${this.baseUrl}/Meta/GetRepository`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data;
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
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null;
  }
}

export const forlandApiService = new ForlandApiService();
export type { LoginRequest, RepositoryChild, RepositoryResponse, ValueItem };
