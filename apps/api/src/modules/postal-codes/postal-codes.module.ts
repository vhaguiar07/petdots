import { Module } from '@nestjs/common';

import { FindPostalCodeUseCase } from './application/find-postal-code.use-case.js';
import { POSTAL_CODE_GATEWAY } from './domain/ipostal-code.gateway.js';
import { ViaCepPostalCodeGateway } from './infra/viacep-postal-code.gateway.js';
import { PostalCodesController } from './postal-codes.controller.js';

/**
 * O único módulo sem tabela: ele não é dono de dado, é dono de uma **fronteira**
 * — a que separa o PetDots do diretório de CEPs de terceiro (ADR-0016).
 *
 * Trocar de provedor é trocar a classe registrada em `POSTAL_CODE_GATEWAY`.
 */
@Module({
  controllers: [PostalCodesController],
  providers: [
    FindPostalCodeUseCase,
    { provide: POSTAL_CODE_GATEWAY, useClass: ViaCepPostalCodeGateway },
  ],
})
export class PostalCodesModule {}
