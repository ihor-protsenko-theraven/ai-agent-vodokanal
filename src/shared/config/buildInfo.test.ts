import { describe, expect, it } from 'vitest';
import { BuildInfo, getBuildBadgeLabel, getBuildDetails } from './buildInfo';

const productionBuild: BuildInfo = {
  version: '2.4.0',
  revision: '6a18928',
  environment: 'production',
  deploymentId: 'dpl_example123',
  builtAt: '2026-08-18T09:00:00.000Z'
};

describe('build metadata', () => {
  it('creates a compact version and revision badge', () => {
    expect(getBuildBadgeLabel(productionBuild)).toBe('v2.4.0 · 6a18928');
  });

  it('keeps the deployment identity available in the extended details', () => {
    const details = getBuildDetails(productionBuild);

    expect(details).toContain('Version: v2.4.0');
    expect(details).toContain('Revision: 6a18928');
    expect(details).toContain('Environment: production');
    expect(details).toContain('Vercel deployment: dpl_example123');
  });
});
