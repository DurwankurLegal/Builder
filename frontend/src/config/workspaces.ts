/**
 * Single source of truth for the workspaces (tenants) the UI offers.
 *
 * These must match the tenant rows provisioned in the database. Listing a
 * workspace here that does not exist server-side produces a dropdown entry
 * that fails on selection, so keep the two in step when tenants are added or
 * removed.
 */
export interface Workspace {
  id: string;
  name: string;
}

export const WORKSPACES: Workspace[] = [
  { id: 'tenant-1', name: 'Prestige Group' },
  { id: 'tenant-2', name: 'DLF Limited' },
  { id: 'tenant-3', name: 'LODHA Group' },
  { id: 'tenant-4', name: 'Sobha Developers' },
  { id: 'tenant-5', name: 'Godrej Properties' },
];

export const DEFAULT_WORKSPACE = WORKSPACES[0];

export const WORKSPACE_NAMES: Record<string, string> = Object.fromEntries(
  WORKSPACES.map(w => [w.id, w.name])
);

/** Falls back to the default when a stored/selected workspace no longer exists. */
export const resolveWorkspace = (id: string | null): Workspace =>
  WORKSPACES.find(w => w.id === id) || DEFAULT_WORKSPACE;
