import { postalCodeAddressSchema } from '@petdots/contracts';

import { type HttpClient } from './http';

/**
 * O endereço por trás de um CEP, ou `null` quando não dá para saber.
 *
 * 🔴 **Nenhuma falha vira exceção aqui**, e é deliberado: isto é conveniência.
 * O formulário funciona digitado à mão, e a busca nunca pode ser o motivo de a
 * pessoa não conseguir salvar o endereço. CEP inexistente (`404`), diretório
 * fora do ar (`503`), rede caída — todos viram "não consegui", e a tela segue
 * como se a busca não existisse.
 */
export function findAddressByPostalCode(
  http: HttpClient,
  postalCode: string,
  signal?: AbortSignal,
) {
  return http
    .getJson(`/postal-codes/${postalCode}`, undefined, { auth: true, signal })
    .then((body) => postalCodeAddressSchema.parse(body))
    .catch(() => null);
}
