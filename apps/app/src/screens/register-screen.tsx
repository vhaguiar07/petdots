import { MIN_PASSWORD_LENGTH } from '@petdots/domain';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Body, Button, Card, Field } from '../ui/primitives';
import { Colors, Spacing } from '../ui/theme';

/**
 * O aviso de privacidade vive na landing, não aqui: é uma página pública que
 * precisa de SEO e de existir para quem nunca instalou o app (ADR-0004 #13).
 * Por isso o link é externo e abre no navegador.
 *
 * Endereço fixo, e não uma variável de ambiente, porque o domínio da landing é
 * decisão de produto registrada em ADR (ADR-0020, E6) e não muda por ambiente:
 * em desenvolvimento o link continua apontando para a produção, que é onde o
 * texto publicado está.
 */
const PRIVACY_NOTICE_URL = 'https://petdots.com.br/privacidade';

/**
 * Creating an account — the screen pd-13 deliberately left out, so that until
 * now the only way in was `curl` (ADR-0012, A10).
 *
 * It asks for an e-mail and a password and nothing else: registration creates a
 * `User` and nothing else (ADR-0011, A10). The name, the phone and the address
 * are the next step, and the onboarding goes there straight after.
 *
 * 🔴 The `409` shows **the API's own message**. Unlike sign-in — where a
 * distinct answer for "unknown e-mail" would be an oracle — the person here is
 * telling us the address, so "this one is taken" is the useful truth and costs
 * nothing they did not already know.
 */
export function RegisterScreen() {
  const router = useRouter();
  const { state, signUp } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Someone already signed in has no business on this screen, same as `/entrar`.
  if (state.kind === 'signedIn') {
    return <Redirect href="/conta" />;
  }

  async function submit(): Promise<void> {
    if (submitting) {
      return;
    }

    setFailure(null);
    setFieldErrors({});

    // Checked here first so a password everyone knows is too short does not
    // cost a round trip — the same rule the comparator applies to a malformed
    // CEP. The message is the contract's, so the two cannot drift apart.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({
        password: `A senha precisa ter ao menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`,
      });
      return;
    }

    setSubmitting(true);

    try {
      await signUp(email.trim(), password);
      // Straight into the onboarding: the account exists, the profile does not.
      router.replace('/conta/endereco?onboarding=1');
    } catch (error) {
      if (error instanceof ApiUnavailableError) {
        setFailure('Não conseguimos falar com o servidor. Tente de novo.');
      } else if (error instanceof ApiError && error.status === 422) {
        setFieldErrors(
          Object.fromEntries(error.details.map((detail) => [detail.field, detail.message])),
        );
      } else if (error instanceof ApiError) {
        setFailure(error.message);
      } else {
        setFailure('Não conseguimos falar com o servidor. Tente de novo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Criar conta" subtitle="Comece a comparar preços no seu bairro.">
      <Card style={styles.card}>
        <View style={styles.form}>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@exemplo.com.br"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={255}
            error={fieldErrors.email}
          />

          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            hint={`Mínimo de ${String(MIN_PASSWORD_LENGTH)} caracteres.`}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={fieldErrors.password}
          />

          {failure ? (
            <Body style={styles.failure} role="alert">
              {failure}
            </Body>
          ) : null}

          <Button
            label={submitting ? 'Criando…' : 'Criar conta'}
            tone="primary"
            disabled={submitting}
            onPress={() => void submit()}
          />

          {/*
            No consent checkbox: the legal basis for having an account is
            performing the contract, not consent — the waitlist has one because
            *there* the later contact is what needs consenting to (ADR-0015,
            D10). The sentence points at the notice instead.

            🔴 "aceita", not "concorda com" — deliberately (pd-19). "Concordar"
            reads as a consent this screen does not ask for and must not ask
            for: making the account depend on agreeing would misdescribe the
            legal basis to the very person it protects.
          */}
          <Body muted>
            Ao criar a conta você aceita o{' '}
            <Link href={PRIVACY_NOTICE_URL} target="_blank" style={styles.inlineLink}>
              aviso de privacidade
            </Link>{' '}
            do PetDots.
          </Body>

          <Link href="/entrar" style={styles.link}>
            Já tenho conta
          </Link>
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: 420 },
  form: { gap: Spacing.lg },
  failure: { color: Colors.danger },
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  // Dentro de um parágrafo, e não um botão: herda o tamanho do texto ao redor
  // e se distingue pela cor e pelo sublinhado.
  inlineLink: { color: Colors.accent, fontWeight: '600', textDecorationLine: 'underline' },
});
