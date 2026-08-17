/**
 * Forland API domain types
 */

export interface LoginRequest {
  login: string;
  p: string;
}

export interface RepositoryChild {
  ID: number;
  Title?: string;
  Value?: string;
  ValueIDs?: number[];
}

export interface RepositoryMetaClasses {
  systemType?: { Childs?: RepositoryChild[] };
  systemTypeValue?: { Childs?: RepositoryChild[] };
}

export interface RepositoryResponse {
  logical?: {
    metaClasses?: RepositoryMetaClasses;
  };
}

export interface ValueItem {
  ID: number;
  Value: string;
}

export interface GetListParams {
  kindUnitID: number;
  stateID?: number | null;
  logID?: number | string | null;
}

export interface GetListItem {
  ID: number;
  Title?: string;
  MetaID?: number;
  LogID?: string | number;
  Init?: {
    StateID?: number;
    Properties?: Record<string, unknown>;
  };
}

export type GetListResponse = GetListItem[];

export interface CreateNewUnitRequest {
  KindUnitID: number;
}

export interface CreateNewUnitResponse {
  ID?: number;
  Title?: string;
  MetaID?: number;
  LogID?: string;
  Init?: {
    StateID?: number;
    Properties?: Record<string, unknown>;
  };
  Edit?: {
    Properties?: Record<string, unknown>;
    StateID?: number;
  };
}

export interface Unit {
  ID: number;
  Title?: string;
  MetaID?: number;
  LogID?: string;
  Init?: {
    StateID?: number;
    Properties?: Record<string, unknown>;
  };
  Edit?: {
    Properties?: Record<string, unknown>;
    StateID?: number;
  };
}

export interface SaveRequest {
  units: Unit[];
  onlyAllSave?: boolean;
}

export interface SaveResponse {
  success?: boolean;
  ID?: number;
  error?: string;
  HttpStatus?: number;
  ErrorID?: string;
  Title?: string;
  Error?: string;
  InnerExceptions?: string;
  ErrorMessage?: string;
}
