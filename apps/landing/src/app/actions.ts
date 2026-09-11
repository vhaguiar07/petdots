'use server';

import { createWaitlistEntrySchema } from '@petdots/contracts';

import type { FormState } from './form-state';

/**
 * A API é chamada pelo servidor da landing, nunca pelo navegador (pd-09, A6):
 * não há CORS a configurar, a URL interna não vai para o cliente, e o honeypot
 * é checado antes de qualquer requisição sair. Em desenvolvimento o default
 * basta; no deploy a plataforma injeta a variável.
 */
const API_URL = process.env.PETDOTS_API_URL ?? 'http://localhost:3001';

/** Os campos de texto do formulário, na ordem em que aparecem na tela. */
const TEXT_FIELDS = ['name', 'phone', 'neighborhood', 'postalCode', 'petFoodDeclared'] as const;

interface ErrorEnvelope {
  error?: { details?: { field?: string; message?: string }[] };
}

export async function joinWaitlist(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(TEXT_FIELDS.map((field) => [field, text(formData, field)]));
  const consent = formData.get('consent') === 'on';

  // Honeypot: o campo fica fora do fluxo visual e do tab order, então só um bot
  // o preenche. Fingir sucesso — em vez de recusar — evita ensinar ao robô o
  // que ele precisa mudar. É mitigação fraca por desenho (A18): rate limit é
  // decisão do deploy público.
  if (text(formData, 'website')) {
    return success();
  }

  const parsed = createWaitlistEntrySchema.safeParse({
    ...values,
    petFoodDeclared: values.petFoodDeclared || undefined,
    source: 'CAMPAIGN',
    consent: consent ? true : undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path.join('.');
      fieldErrors[field] ??= issue.message;
    }

    return { status: 'invalid', fieldErrors, values, consent };
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/waitlist-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });

    if (response.status === 201) {
      return success();
    }

    if (response.status === 409) {
      return { status: 'already_listed', fieldErrors: {}, values, consent };
    }

    if (response.status === 422) {
      return { status: 'invalid', fieldErrors: await fieldErrorsFrom(response), values, consent };
    }

    return { status: 'unavailable', fieldErrors: {}, values, consent };
  } catch {
    // Rede fora, API derrubada, DNS: o visitante recebe a mesma mensagem
    // genérica. Detalhe técnico não atravessa a fronteira (SECURITY).
    return { status: 'unavailable', fieldErrors: {}, values, consent };
  }
}

/** Sucesso não devolve o que foi digitado: a tela troca pela confirmação. */
function success(): FormState {
  return { status: 'success', fieldErrors: {}, values: {}, consent: false };
}

/** Traduz o `details[]` do ERROR_MODEL para erro por campo do formulário. */
async function fieldErrorsFrom(response: Response): Promise<Record<string, string>> {
  const fieldErrors: Record<string, string> = {};

  try {
    const body = (await response.json()) as ErrorEnvelope;

    for (const detail of body.error?.details ?? []) {
      if (detail.field && detail.message) {
        fieldErrors[detail.field] ??= detail.message;
      }
    }
  } catch {
    // Corpo ilegível: o formulário mostra o estado sem detalhe por campo.
  }

  return fieldErrors;
}

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}
