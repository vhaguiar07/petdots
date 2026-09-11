'use client';

import { useActionState } from 'react';

import { NEIGHBORHOODS } from '../content/neighborhoods';
import { joinWaitlist } from './actions';
import { INITIAL_STATE } from './form-state';
import { CheckIcon, InfoIcon } from './icons';
import styles from './waitlist-form.module.css';

const NEIGHBORHOOD_LIST_ID = 'bairros-do-eixo';

const NOTICE = {
  already_listed: 'Esse telefone já está na lista — pode deixar com a gente.',
  unavailable: 'Não conseguimos salvar agora. Tente de novo em alguns minutos.',
} as const;

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL_STATE);

  const errorOf = (field: string): string | undefined => state.fieldErrors[field];
  const describedBy = (field: string): string | undefined =>
    errorOf(field) ? `${field}-error` : undefined;

  // `key` amarrado ao estado força a remontagem dos campos a cada resposta, que
  // é o que faz o `defaultValue` reaplicar o que a pessoa digitou.
  const attempt = JSON.stringify(state.values);

  if (state.status === 'success') {
    return (
      <div className={styles.success} role="status">
        <span className={styles.successIcon} aria-hidden="true">
          <CheckIcon />
        </span>
        <p className={styles.successTitle}>Pronto! Você está na lista.</p>
        <p className={styles.successText}>Avisamos você quando chegarmos ao seu bairro.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} action={formAction} noValidate key={attempt}>
      <Field
        name="name"
        label="Nome"
        autoComplete="name"
        placeholder="Como podemos te chamar?"
        defaultValue={state.values.name}
        error={errorOf('name')}
        describedBy={describedBy('name')}
      />

      <Field
        name="phone"
        label="Celular"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(21) 99999-9999"
        defaultValue={state.values.phone}
        error={errorOf('phone')}
        describedBy={describedBy('phone')}
      />

      <Field
        name="neighborhood"
        label="Bairro"
        autoComplete="address-level3"
        placeholder="Ex.: Engenho Novo"
        list={NEIGHBORHOOD_LIST_ID}
        defaultValue={state.values.neighborhood}
        error={errorOf('neighborhood')}
        describedBy={describedBy('neighborhood')}
      />
      <datalist id={NEIGHBORHOOD_LIST_ID}>
        {NEIGHBORHOODS.map((neighborhood) => (
          <option key={neighborhood} value={neighborhood} />
        ))}
      </datalist>

      <Field
        name="postalCode"
        label="CEP"
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="20720-000"
        defaultValue={state.values.postalCode}
        error={errorOf('postalCode')}
        describedBy={describedBy('postalCode')}
      />

      <Field
        name="petFoodDeclared"
        label="Qual ração seu pet come?"
        optional
        autoComplete="off"
        placeholder="Marca e linha, se lembrar"
        defaultValue={state.values.petFoodDeclared}
        error={errorOf('petFoodDeclared')}
        describedBy={describedBy('petFoodDeclared')}
      />

      {/* Honeypot: fora do tab order e escondido de leitores de tela, então só
          um robô o preenche. Preenchido, a action finge sucesso (A18). */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <input type="hidden" name="source" value="CAMPAIGN" />

      <div className={styles.field}>
        <label className={styles.consent} htmlFor="consent">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            defaultChecked={state.consent}
            aria-describedby={describedBy('consent')}
          />
          <span>
            Autorizo o PetDots a guardar meu nome, celular e CEP para me avisar quando o serviço
            chegar ao meu bairro.
          </span>
        </label>
        {errorOf('consent') ? (
          <p className={styles.error} id="consent-error">
            {errorOf('consent')}
          </p>
        ) : null}
      </div>

      {state.status === 'already_listed' || state.status === 'unavailable' ? (
        <p className={`${styles.status} ${styles.statusNotice}`} role="status">
          <InfoIcon className={styles.statusIcon} aria-hidden="true" />
          <span>{NOTICE[state.status]}</span>
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Enviando…' : 'Quero ser avisado'}
      </button>

      <p className={styles.fineprint}>Sem spam. Um aviso só, quando chegarmos.</p>
    </form>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  inputMode?: 'tel' | 'numeric';
  autoComplete?: string;
  placeholder?: string;
  list?: string;
  defaultValue?: string;
  optional?: boolean;
  error?: string;
  describedBy?: string;
}

function Field({ name, label, optional, error, describedBy, ...input }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>
        {label}
        {optional ? <span className={styles.optional}> (opcional)</span> : null}
      </label>
      <input
        {...input}
        className={error ? `${styles.input} ${styles.inputInvalid}` : styles.input}
        id={name}
        name={name}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <p className={styles.error} id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
