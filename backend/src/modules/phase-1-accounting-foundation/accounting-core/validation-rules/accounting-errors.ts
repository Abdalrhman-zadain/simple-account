import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

export class AccountNotFoundException extends NotFoundException {
  constructor(accountId: string) {
    super(`Account ${accountId} was not found.`);
  }
}

export class JournalEntryNotFoundException extends NotFoundException {
  constructor(entryId: string) {
    super(`Journal entry ${entryId} was not found.`);
  }
}

export class JournalEntryAlreadyPostedException extends ConflictException {
  constructor(entryId: string) {
    super(`Journal entry ${entryId} has already been posted.`);
  }
}

export class JournalEntryNotPostedException extends ConflictException {
  constructor(entryId: string) {
    super(`Journal entry ${entryId} has not been posted yet.`);
  }
}

export class JournalEntryAlreadyReversedException extends ConflictException {
  constructor(entryId: string) {
    super(`Journal entry ${entryId} has already been reversed.`);
  }
}

export class InvalidJournalEntryException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}
