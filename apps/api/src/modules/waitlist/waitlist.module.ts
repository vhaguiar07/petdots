import { Module } from '@nestjs/common';

import { JoinWaitlistUseCase } from './application/join-waitlist.use-case.js';
import { WAITLIST_ENTRY_REPOSITORY } from './domain/iwaitlist-entry.repository.js';
import { PrismaWaitlistEntryRepository } from './infra/prisma-waitlist-entry.repository.js';
import { WaitlistController } from './waitlist.controller.js';

@Module({
  controllers: [WaitlistController],
  providers: [
    JoinWaitlistUseCase,
    { provide: WAITLIST_ENTRY_REPOSITORY, useClass: PrismaWaitlistEntryRepository },
  ],
})
export class WaitlistModule {}
