export type DeploymentEnvironment = 'development' | 'preview' | 'production' | 'local';

export interface BuildInfo {
  /** Semantic version read from package.json during the Vite build. */
  version: string;
  /** Short Git SHA of the source revision, or "local" outside CI. */
  revision: string;
  environment: DeploymentEnvironment;
  /** Vercel deployment identifier; absent for a local build. */
  deploymentId: string | null;
  /** ISO-8601 timestamp generated once for the complete browser bundle. */
  builtAt: string;
}

const localBuildInfo: BuildInfo = {
  version: '0.0.0',
  revision: 'local',
  environment: 'local',
  deploymentId: null,
  builtAt: 'unknown'
};

export const buildInfo: BuildInfo = typeof __BUILD_INFO__ === 'undefined'
  ? localBuildInfo
  : __BUILD_INFO__;

export function getBuildBadgeLabel(info: BuildInfo = buildInfo): string {
  return `v${info.version} · ${info.revision}`;
}

export function getBuildDetails(info: BuildInfo = buildInfo): string {
  const builtAt = info.builtAt === 'unknown'
    ? 'unknown'
    : new Intl.DateTimeFormat('uk-UA', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(new Date(info.builtAt));

  return [
    `Version: v${info.version}`,
    `Revision: ${info.revision}`,
    `Environment: ${info.environment}`,
    `Built: ${builtAt}`,
    ...(info.deploymentId ? [`Vercel deployment: ${info.deploymentId}`] : [])
  ].join('\n');
}
