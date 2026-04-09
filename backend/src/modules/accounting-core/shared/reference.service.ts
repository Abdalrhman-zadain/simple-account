import { Injectable } from '@nestjs/common';

@Injectable()
export class ReferenceService {
  generateJournalEntryReference(at: Date = new Date()): string {
    const compactDate = at.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

    return `JE-${compactDate}-${randomSuffix}`;
  }
}
