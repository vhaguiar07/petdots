import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, type UserRole } from '@petdots/shared';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';

type RegisterRole = Extract<UserRole, 'CUSTOMER' | 'STORE_OWNER'>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [role, setRole] = useState<RegisterRole>('CUSTOMER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!name || !email || !password || !passwordConfirmation) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError(
        'A senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.'
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setError('A confirmação de senha não corresponde à senha informada.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        passwordConfirmation,
        phone: phone || undefined,
        role,
      });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a conta.');
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
          <ThemedText style={styles.headerTitle}>Criar Conta</ThemedText>
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

          <ThemedText style={styles.titleText}>Criar sua conta</ThemedText>
          <ThemedText style={styles.subtitleText}>
            Preencha os campos abaixo para fazer parte do PetDots.
          </ThemedText>

          {/* Role selector tabs */}
          <View style={styles.roleTabsContainer}>
            <Pressable
              onPress={() => setRole('CUSTOMER')}
              style={[
                styles.roleTab,
                role === 'CUSTOMER'
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: '#FFF3EB', borderColor: '#FFEAD9' },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  color: role === 'CUSTOMER' ? '#ffffff' : '#802E00',
                  textAlign: 'center',
                }}
              >
                Quero comprar
              </ThemedText>
              <ThemedText
                style={{
                  color: role === 'CUSTOMER' ? 'rgba(255,255,255,0.8)' : '#B37A5C',
                  fontSize: 10,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                Buscar petshops
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setRole('STORE_OWNER')}
              style={[
                styles.roleTab,
                role === 'STORE_OWNER'
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: '#FFF3EB', borderColor: '#FFEAD9' },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  color: role === 'STORE_OWNER' ? '#ffffff' : '#802E00',
                  textAlign: 'center',
                }}
              >
                Tenho petshop
              </ThemedText>
              <ThemedText
                style={{
                  color: role === 'STORE_OWNER' ? 'rgba(255,255,255,0.8)' : '#B37A5C',
                  fontSize: 10,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                Vender e gerenciar
              </ThemedText>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Name Field */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Nome Completo</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="#B37A5C" style={styles.fieldIcon} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu nome completo"
                  placeholderTextColor="#B37A5C"
                  style={styles.input}
                />
              </View>
            </View>

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

            {/* Phone Field */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Telefone (opcional)</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color="#B37A5C" style={styles.fieldIcon} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="(21) 98765-4321"
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
                  placeholder="Mínimo 8 caracteres"
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
              <ThemedText style={styles.fieldHint}>
                A senha deve conter maiúscula, minúscula, número e caractere especial.
              </ThemedText>
            </View>

            {/* Password Confirmation Field */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Confirmar Senha</ThemedText>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color="#B37A5C" style={styles.fieldIcon} />
                <TextInput
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                  secureTextEntry={!showPassword}
                  placeholder="Repita a senha"
                  placeholderTextColor="#B37A5C"
                  style={styles.input}
                />
              </View>
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
                  <ThemedText style={styles.submitButtonText}>Criar conta</ThemedText>
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
            <Pressable onPress={() => Alert.alert('Google Signup', 'O cadastro social com Google estará disponível em breve!')}>
              <View style={styles.socialButton}>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <ThemedText style={styles.socialButtonText}>Google</ThemedText>
              </View>
            </Pressable>

            {/* Footer Link */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>Já tem conta? </ThemedText>
              <Link href="/login" replace>
                <ThemedText style={[styles.footerLink, { color: theme.primary }]}>
                  Entrar
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
    paddingBottom: Spacing.five,
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
  roleTabsContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  roleTab: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
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
  fieldHint: {
    fontSize: 10,
    color: '#B37A5C',
    lineHeight: 14,
    marginTop: 2,
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
