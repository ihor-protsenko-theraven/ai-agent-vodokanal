import { describe, expect, it } from 'vitest';
import { UnclosedTicketSummary } from '@/shared/types';
import { DuplicateFinder } from '@/features/tickets/domain/DuplicateFinder';

describe('DuplicateFinder', () => {
  const tickets: UnclosedTicketSummary[] = [
    { id: 11, title: 'Аварія: вул. Хрещатик, 15', addressText: 'м. Київ, вул. Хрещатик, 15', coordinates: '50.4501, 30.5234', logId: 'log-11', metaId: 27772 },
    { id: 12, title: 'Заявка № [AUTO] (AI-агент)', addressText: 'м. Київ, вул. Сагайдачного, 2', coordinates: '50.4600, 30.5200', logId: 'log-12', metaId: 27772 },
    { id: 13, title: 'Аварія: вул. Хрещатик, 16', addressText: 'м. Київ, вул. Хрещатик, 16', coordinates: '50.4600, 30.5200', logId: 'log-13', metaId: 27772 }
  ];

  it('returns only a title-based candidate with the safe edit handle', () => {
    const candidates = new DuplicateFinder().findPotentialDuplicates({
      addressText: 'м. Київ, вул. Хрещатик, 15',
      coordinates: '50.4501, 30.5234',
      searchText: 'м. Київ, вул. Хрещатик, 15',
      appealType: 'Витік води'
    }, tickets);

    expect(candidates).toEqual([{
      ticketId: '11',
      matchReason: 'COORDINATES_MATCH',
      ticketTitle: 'Аварія: вул. Хрещатик, 15',
      addressText: 'м. Київ, вул. Хрещатик, 15',
      coordinates: '50.4501, 30.5234',
      logId: 'log-11',
      metaId: 27772,
      appealType: 'Витік води'
    }]);
  });

  it('uses a conservative address fallback when coordinates are absent', () => {
    const candidates = new DuplicateFinder().findPotentialDuplicates({
      addressText: 'м. Київ, вул. Хрещатик, 15',
      coordinates: '',
      searchText: 'м. Київ, вул. Хрещатик, 15',
      appealType: 'Витік води'
    }, tickets);

    expect(candidates.map((candidate) => candidate.ticketId)).toEqual(['11']);
    expect(candidates[0].matchReason).toBe('ADDRESS_MATCH');
  });

  it('does not flag different Kyiv streets that happen to share a house number', () => {
    const candidates = new DuplicateFinder().findPotentialDuplicates({
      addressText: 'м. Київ, вул. Науки, 27',
      coordinates: '50.396871, 30.531880',
      searchText: 'м. Київ, вул. Науки, 27',
      appealType: 'Витік води'
    }, [{
      id: 339306,
      title: 'Заявка № 12261 [17.08.2026]',
      addressText: 'м. Київ, вул. Перемоги, 27',
      coordinates: '50.4504, 30.5235',
      metaId: 27772
    }]);

    expect(candidates).toEqual([]);
  });
});
