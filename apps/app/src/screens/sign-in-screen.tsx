import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Body, Button, Card, Field } from '../ui/primitives';
import { Colors, Spacing } from '../ui/theme';

/**
 * The sign-in screen.
 *
 * 🔴 A failed sign-in shows **the API's own message**, not one written here.
 * `401` always answers "E-mail ou senha inválidos." — deliberately identical
 * for a wrong password and for an address nobody registered (ADR-0011, C3).
 * Rewriting it on the client as "e-mail não encontrado" would undo in the
 * browser exactly what the API goes out of its way to protect (ADR-0012, A17).
 */
export function SignInScreen() {
  const router = useRouter();
  const { state, signIn } = useSession();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Someone already signed in has no business on this screen. Redirecting
  // rather than showing the form is what makes "Entrar" disappear from the
  // header and the URL agree with each other.
  if (state.kind === 'signedIn') {
    return <Redirect href="/conta" />;
  }

  // Sem `next`, o destino é `/conta`: quem clicou "Entrar" quer ver que entrou.
  // Mandar para o comparador deixaria a pessoa na mesma tela de antes, com a
  // única diferença sendo um link no topo — e o critério C6 pede a conta.
  // `next` só é aceito se for caminho interno: um valor vindo da URL não pode
  // virar redirecionamento para fora do app.
  const destination = typeof next === 'string' && next.startsWith('/') ? next : '/conta';

  async function submit(): Promise<void> {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setFailure(null);
    setFieldErrors({});

    try {
      await signIn(email.trim(), password);
      router.replace(destination);
    } catch (error) {
      if (error instanceof ApiUnavailableError) {
        setFailure('Não conseguimos falar com o servidor. Tente de novo.');
      } else if (error instanceof ApiError && error.status === 422) {
        // A 422 knows which field is wrong; showing it next to the field is
        // the whole reason `details` exists (ERROR_MODEL).
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
    <AppShell title="Entrar" subtitle="Acesse sua conta do PetDots.">
      {state.kind === 'signedOut' && state.reason === 'expired' ? (
        <Body style={styles.notice} role="alert">
          Sua sessão expirou. Entre de novo.
        </Body>
      ) : null}

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
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
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
            label={submitting ? 'Entrando…' : 'Entrar'}
            tone="primary"
            disabled={submitting}
            onPress={() => void submit()}
          />
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: { maxWidth: 420 },
  form: { gap: Spacing.lg },
  notice: { color: Colors.warning },
  failure: { color: Colors.danger },
});
