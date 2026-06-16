import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@petdots/shared';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Modal Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Entrar</ThemedText>
        </View>

        {/* Scrollable White Body Panel */}
        <ScrollView
          style={styles.contentBody}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Representation */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logo-big.png')}
              style={styles.logo}
            />
          </View>

          <ThemedText style={styles.titleText}>Que bom ver você de volta!</ThemedText>
          <ThemedText style={styles.subtitleText}>
            Acesse sua conta para gerenciar seus pedidos ou sua loja.
          </ThemedText>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Email Field */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>E-mail</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#B37A5C" style={styles.fieldIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="exemplo@gmail.com"
                  placeholderTextColor="#B37A5C"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Senha</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#B37A5C" style={styles.fieldIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#B37A5C"
                  style={styles.input}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#B37A5C"
                  />
                </Pressable>
              </View>
            </View>

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.rememberRow}>
              <Pressable
                onPress={() => setRememberMe(!rememberMe)}
                style={styles.checkboxPressable}
              >
                <View style={[styles.checkbox, rememberMe && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                  {rememberMe && <Ionicons name="checkmark" size={10} color="#ffffff" />}
                </View>
                <ThemedText style={styles.rememberText}>Lembrar-me</ThemedText>
              </Pressable>
              
              <Pressable onPress={() => Alert.alert('Aviso', 'A recuperação de senha estará disponível em breve!')}>
                <ThemedText style={[styles.forgotLink, { color: theme.primary }]}>
                  Esqueci minha senha
                </ThemedText>
              </Pressable>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#991B1B" />
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {/* Submit Button */}
            <Pressable onPress={handleSubmit} disabled={isSubmitting}>
              <View style={[styles.submitButton, { backgroundColor: theme.primary }]}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>Entrar</ThemedText>
                )}
              </View>
            </Pressable>

            {/* Social Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>ou continue com</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Button */}
            <Pressable onPress={() => Alert.alert('Google Login', 'O login social com Google estará disponível em breve!')}>
              <View style={styles.socialButton}>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <ThemedText style={styles.socialButtonText}>Google</ThemedText>
              </View>
            </Pressable>

            {/* Footer Links */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>Não tem conta? </ThemedText>
              <Link href="/register" replace>
                <ThemedText style={[styles.footerLink, { color: theme.primary }]}>
                  Criar conta
                </ThemedText>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  backButton: {
    padding: Spacing.one,
    marginRight: Spacing.two,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },
  logo: {
    width: 180,
    height: 48,
    resizeMode: 'contain',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: Spacing.one,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 13,
    color: '#B37A5C',
    marginTop: Spacing.one,
    lineHeight: 18,
    textAlign: 'center',
  },
  formContainer: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEAD9',
    borderRadius: 16,
    backgroundColor: '#FFF9F5',
    paddingHorizontal: Spacing.three,
    height: 48,
  },
  fieldIcon: {
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#000000',
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: Spacing.one,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.one,
  },
  checkboxPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFEAD9',
    backgroundColor: '#FFF9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: 'bold',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: Spacing.one,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  submitButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.two,
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FFEAD9',
  },
  dividerText: {
    fontSize: 10,
    color: '#B37A5C',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#FFF9F5',
    gap: Spacing.two,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  footerText: {
    fontSize: 13,
    color: '#B37A5C',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
