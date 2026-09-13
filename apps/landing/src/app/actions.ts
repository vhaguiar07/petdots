'use server';

import { createWaitlistEntrySchema } from '@petdots/contracts';
import { headers } from 'next/headers';

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
      headers: { 'content-type': 'application/json', ...(await forwardedFor()) },
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

    // 429 entra aqui: para quem está na tela, "tente de novo em instantes" e
    // "não conseguimos agora" são a mesma coisa, e um texto próprio ensinaria
    // ao robô que ele encontrou o limite.
    return { status: 'unavailable', fieldErrors: {}, values, consent };
  } catch {
    // Rede fora, API derrubada, DNS: o visitante recebe a mesma mensagem
    // genérica. Detalhe técnico não atravessa a fronteira (SECURITY).
    return { status: 'unavailable', fieldErrors: {}, values, consent };
  }
}

/**
 * O endereço de quem preencheu o formulário, para a API poder contá-lo.
 *
 * 🔴 Sem isto o rate limit da captura seria inútil: a landing chama a API pelo
 * servidor, então **todo lead do mundo chegaria com o IP do container da
 * landing** e os cinco por dez minutos seriam cinco no planeta inteiro.
 *
 * 🔴 **A última entrada da cadeia, nunca a primeira.** Um proxy *acrescenta* o
 * endereço que observou ao fim de `x-forwarded-for`, então o valor à direita é
 * o que a borda do Railway viu e os da esquerda são o que o chamador escreveu.
 * Ler a primeira entrega o controle do limite a quem quiser burlá-lo: bastaria
 * mandar um `X-Forwarded-For` novo a cada requisição. É a mesma conta que o
 * `trust proxy` numérico faz do outro lado (`apps/api/src/main.ts`), e um
 * salto de proxy a mais aqui — o Cloudflare em modo proxied, por exemplo —
 * mudaria as duas pontas juntas.
 *
 * Sem cabeçalho nenhum (desenvolvimento local), nada é enviado e a API usa o IP
 * da conexão.
 */
async function forwardedFor(): Promise<Record<string, string>> {
  const incoming = await headers();
  const chain = incoming.get('x-forwarded-for');
  const visitor = chain
    ? (chain.split(',').at(-1)?.trim() ?? '')
    : (incoming.get('x-real-ip')?.trim() ?? '');

  return visitor ? { 'x-forwarded-for': visitor } : {};
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
