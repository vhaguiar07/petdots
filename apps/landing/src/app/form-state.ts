/**
 * O estado que a Server Action devolve ao formulário.
 *
 * Vive fora de `actions.ts` porque um módulo `'use server'` só pode exportar
 * funções assíncronas — tipos e constantes precisam de um arquivo próprio.
 */
export type FormStatus = 'idle' | 'success' | 'already_listed' | 'invalid' | 'unavailable';

export interface FormState {
  status: FormStatus;
  /** Mensagem por campo, na chave do contrato (`phone`, `postalCode`, ...). */
  fieldErrors: Record<string, string>;
  /**
   * O que a pessoa digitou. O React 19 reseta o formulário depois que a action
   * termina, então sem devolver os valores um erro de CEP apagaria também o
   * nome, o telefone e o bairro já preenchidos.
   */
  values: Record<string, string>;
  consent: boolean;
}

export const INITIAL_STATE: FormState = {
  status: 'idle',
  fieldErrors: {},
  values: {},
  consent: false,
};
