import { createWaitlistEntrySchema, waitlistEntrySchema } from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateWaitlistEntryDto extends createZodDto(createWaitlistEntrySchema) {}
export class WaitlistEntryDto extends createZodDto(waitlistEntrySchema) {}
