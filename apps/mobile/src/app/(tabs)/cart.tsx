import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, DiscountType, type Address, type Promotion } from '@petdots/shared';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/pricing';
import { formatCep, FIXED_CITY, FIXED_STATE } from '@/lib/masks';

const EMPTY_ADDRESS_FORM = {
  label: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: FIXED_CITY,
  state: FIXED_STATE,
  zipCode: '',
};

export default function CartScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { cart, subtotal, updateQuantity, removeItem, clear } = useCart();
  const theme = useTheme();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Coupon States
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Promotion | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient
      .listAddresses()
      .then((data) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) ?? data[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => setError('Não foi possível carregar seus endereços.'));
  }, [user]);

  const handleSaveAddress = async () => {
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood || !addressForm.zipCode) {
      setError('Por favor, preencha todos os campos obrigatórios do endereço.');
      return;
    }
    setError(null);
    setIsSavingAddress(true);
    try {
      const address = await apiClient.createAddress({
        label: addressForm.label || undefined,
        street: addressForm.street,
        number: addressForm.number,
        complement: addressForm.complement || undefined,
        neighborhood: addressForm.neighborhood,
        city: addressForm.city,
        state: addressForm.state,
        zipCode: addressForm.zipCode,
        isDefault: false,
      });
      setAddresses((prev) => [...(prev ?? []), address]);
      setSelectedAddressId(address.id);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setShowAddressForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o endereço.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
    if (!cart || !selectedAddressId) return;
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.createOrder({
        storeId: cart.storeId,
        addressId: selectedAddressId,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        couponCode: appliedCoupon?.code ?? undefined,
      });
      clear();
      Alert.alert('Pedido realizado!', 'Acompanhe o status em "Pedidos".');
      router.replace('/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!cart || !couponInput.trim()) return;
    setCouponError(null);
    setIsApplyingCoupon(true);

    try {
      const promotion = await apiClient.validateCoupon(cart.storeId, couponInput.trim());
      setAppliedCoupon(promotion);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof ApiError ? err.message : 'Cupom inválido ou expirado.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const estimatedCouponDiscount = (() => {
    if (!appliedCoupon || !cart) return 0;
    let total = 0;
    for (const item of cart.items) {
      if (appliedCoupon.productId !== null && appliedCoupon.productId !== item.productId) continue;
      const discountPerUnit =
        appliedCoupon.discountType === DiscountType.PERCENTAGE
          ? item.unitPrice * (Number(appliedCoupon.value) / 100)
          : Number(appliedCoupon.value);
      total += Math.min(discountPerUnit, item.unitPrice) * item.quantity;
    }
    return total;
  })();

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Seu Carrinho</ThemedText>
          </View>
          <View style={styles.contentBody}>
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Logged-out state
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Seu Carrinho</ThemedText>
          </View>

          <View style={styles.contentBody}>
            <View style={styles.centered}>
              <Ionicons name="cart-outline" size={64} color={theme.primary} />
              <ThemedText style={styles.emptyTitle}>Seu carrinho</ThemedText>
              <ThemedText style={styles.emptyText}>
                Você precisa entrar para ver o carrinho e finalizar um pedido.
              </ThemedText>

              <View style={styles.actions}>
                <Pressable onPress={() => router.push('/login')}>
                  <View style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                    <ThemedText style={{ color: '#ffffff', fontWeight: 'bold' }}>
                      Entrar
                    </ThemedText>
                  </View>
                </Pressable>

                <Pressable onPress={() => router.push('/')}>
                  <View style={[styles.secondaryButton, { borderColor: theme.primary }]}>
                    <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>
                      Ver lojas
                    </ThemedText>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Empty Cart state
  if (!cart || cart.items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Seu Carrinho</ThemedText>
          </View>

          <View style={styles.contentBody}>
            <View style={styles.centered}>
              <Ionicons name="cart-outline" size={64} color="#B37A5C" />
              <ThemedText style={styles.emptyTitle}>Seu carrinho está vazio</ThemedText>
              <ThemedText style={styles.emptyText}>
                Adicione produtos de uma loja parceira para começar suas compras.
              </ThemedText>

              <View style={styles.actions}>
                <Pressable onPress={() => router.push('/')}>
                  <View style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                    <ThemedText style={{ color: '#ffffff', fontWeight: 'bold' }}>
                      Ver lojas
                    </ThemedText>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Seu Carrinho</ThemedText>
        </View>

        <View style={styles.contentBody}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Store Header */}
            <View style={styles.storeHeader}>
              <Ionicons name="storefront-outline" size={16} color={theme.primary} />
              <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }}>
                Loja: {cart.storeName}
              </ThemedText>
            </View>

            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {cart.items.map((item) => (
                <View key={item.productId} style={styles.itemCard}>
                  {/* Product Image */}
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImageFallback, { backgroundColor: '#FFF3EB' }]}>
                      <ThemedText style={{ fontSize: 18 }}>🐾</ThemedText>
                    </View>
                  )}

                  {/* Product Details */}
                  <View style={styles.itemDetailsCol}>
                    <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: '#B37A5C', fontSize: 11, marginTop: 2 }}>
                      {formatCurrency(item.unitPrice)}
                    </ThemedText>
                  </View>

                  {/* Quantity Controls */}
                  <View style={styles.qtyRow}>
                    <Pressable
                      onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                      style={styles.qtyButton}
                    >
                      <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 14 }}>−</ThemedText>
                    </Pressable>
                    <ThemedText type="smallBold" style={styles.qtyValue}>
                      {item.quantity}
                    </ThemedText>
                    <Pressable
                      onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      style={[styles.qtyButton, item.quantity >= item.stock && styles.qtyButtonDisabled]}
                    >
                      <ThemedText type="smallBold" style={{ color: item.quantity >= item.stock ? '#B37A5C' : theme.primary, fontSize: 14 }}>+</ThemedText>
                    </Pressable>
                  </View>

                  {/* Remove Button */}
                  <Pressable onPress={() => removeItem(item.productId)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Delivery Address Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    Endereço de entrega
                  </ThemedText>
                </View>
                <Pressable onPress={() => setShowAddressForm(!showAddressForm)}>
                  <View
                    style={[
                      styles.toggleFormBtn,
                      {
                        backgroundColor: showAddressForm ? '#FEE2E2' : '#FFF3EB',
                        borderColor: showAddressForm ? '#FCA5A5' : '#FFEAD9',
                      },
                    ]}
                  >
                    <ThemedText style={{ color: showAddressForm ? '#991B1B' : theme.primary, fontSize: 11, fontWeight: 'bold' }}>
                      {showAddressForm ? 'Cancelar' : 'Novo'}
                    </ThemedText>
                  </View>
                </Pressable>
              </View>

              {/* Inline Address Form */}
              {showAddressForm && (
                <View style={styles.addressFormBox}>
                  <View style={styles.field}>
                    <ThemedText style={styles.fieldLabel}>Identificação (opcional)</ThemedText>
                    <TextInput
                      value={addressForm.label}
                      onChangeText={(t) => setAddressForm((f) => ({ ...f, label: t }))}
                      placeholder="Ex: Casa, Trabalho"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.rowFields}>
                    <View style={[styles.field, { flex: 2 }]}>
                      <ThemedText style={styles.fieldLabel}>Rua</ThemedText>
                      <TextInput
                        value={addressForm.street}
                        onChangeText={(t) => setAddressForm((f) => ({ ...f, street: t }))}
                        placeholder="Nome da rua"
                        placeholderTextColor="#B37A5C"
                        style={styles.input}
                      />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <ThemedText style={styles.fieldLabel}>Número</ThemedText>
                      <TextInput
                        value={addressForm.number}
                        onChangeText={(t) => setAddressForm((f) => ({ ...f, number: t }))}
                        placeholder="Nº"
                        placeholderTextColor="#B37A5C"
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.fieldLabel}>Complemento (opcional)</ThemedText>
                    <TextInput
                      value={addressForm.complement}
                      onChangeText={(t) => setAddressForm((f) => ({ ...f, complement: t }))}
                      placeholder="Ex: Apto 101, Bloco B"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.fieldLabel}>Bairro</ThemedText>
                    <TextInput
                      value={addressForm.neighborhood}
                      onChangeText={(t) => setAddressForm((f) => ({ ...f, neighborhood: t }))}
                      placeholder="Nome do bairro"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.rowFields}>
                    <View style={[styles.field, { flex: 2 }]}>
                      <ThemedText style={styles.fieldLabel}>Cidade</ThemedText>
                      <TextInput
                        value={addressForm.city}
                        editable={false}
                        style={[styles.input, styles.disabledInput]}
                      />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <ThemedText style={styles.fieldLabel}>Estado</ThemedText>
                      <TextInput
                        value={addressForm.state}
                        editable={false}
                        style={[styles.input, styles.disabledInput]}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.fieldLabel}>CEP</ThemedText>
                    <TextInput
                      value={addressForm.zipCode}
                      onChangeText={(t) => setAddressForm((f) => ({ ...f, zipCode: formatCep(t) }))}
                      maxLength={9}
                      keyboardType="numeric"
                      placeholder="00000-000"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                  </View>

                  <Pressable onPress={handleSaveAddress} disabled={isSavingAddress}>
                    <View style={[styles.saveAddressBtn, { backgroundColor: theme.primary }]}>
                      {isSavingAddress ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <ThemedText style={styles.saveAddressBtnText}>Salvar Endereço</ThemedText>
                      )}
                    </View>
                  </Pressable>
                </View>
              )}

              {/* List of existing addresses */}
              {!showAddressForm && (
                <View style={styles.addressesList}>
                  {addresses === null && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 8 }} />}
                  
                  {addresses?.length === 0 && (
                    <View style={styles.emptyAddressesBox}>
                      <Ionicons name="location-outline" size={24} color="#B37A5C" />
                      <ThemedText style={{ color: '#000000', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                        Nenhum endereço cadastrado
                      </ThemedText>
                      <ThemedText style={{ color: '#B37A5C', fontSize: 10, textAlign: 'center', marginTop: 2 }}>
                        {'Cadastre um endereço tocando em "Novo" acima para poder finalizar seu pedido.'}
                      </ThemedText>
                    </View>
                  )}

                  {addresses?.map((address) => {
                    const isSelected = selectedAddressId === address.id;
                    return (
                      <Pressable key={address.id} onPress={() => setSelectedAddressId(address.id)}>
                        <View style={[styles.addressItemCard, isSelected && { borderColor: theme.primary, borderWidth: 1.5 }]}>
                          <View style={styles.addressSelectRow}>
                            <Ionicons
                              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                              size={18}
                              color={isSelected ? theme.primary : '#B37A5C'}
                            />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 12 }}>
                                  {address.label ?? 'Endereço'}
                                </ThemedText>
                                {address.isDefault && (
                                  <View style={[styles.defaultBadge, { backgroundColor: '#FFE4D1' }]}>
                                    <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 8 }}>
                                      PADRÃO
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                              <ThemedText style={styles.addressText}>
                                {address.street}, {address.number}
                                {address.complement ? ` - ${address.complement}` : ''}
                                {`\n`}{address.neighborhood} — {address.city}/{address.state} — {address.zipCode}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Coupon Section */}
            <View style={styles.sectionCard}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Cupom de desconto
              </ThemedText>

              {appliedCoupon ? (
                <View style={styles.appliedCouponCard}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: '#065F46', fontSize: 12 }}>
                      Cupom {appliedCoupon.code} aplicado!
                    </ThemedText>
                    <ThemedText style={{ color: '#047857', fontSize: 10, marginTop: 2 }}>
                      Desconto de {appliedCoupon.discountType === DiscountType.PERCENTAGE ? `${appliedCoupon.value}%` : formatCurrency(Number(appliedCoupon.value))}
                    </ThemedText>
                  </View>
                  <Pressable onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
                    <ThemedText style={{ color: '#DC2626', fontSize: 11, fontWeight: 'bold' }}>Remover</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.couponInputRow}>
                  <TextInput
                    value={couponInput}
                    onChangeText={(t) => setCouponInput(t.toUpperCase())}
                    placeholder="Digite o código do cupom"
                    placeholderTextColor="#B37A5C"
                    autoCapitalize="characters"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <Pressable
                    onPress={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponInput.trim()}
                    style={styles.applyCouponBtn}
                  >
                    {isApplyingCoupon ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <ThemedText style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>
                        Aplicar
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              )}

              {couponError && <ThemedText style={styles.errorText}>{couponError}</ThemedText>}
            </View>

            {/* Order Summary Block */}
            <View style={styles.sectionCard}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Resumo do pedido
              </ThemedText>

              <View style={styles.summaryList}>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
                  <ThemedText style={styles.summaryValue}>{formatCurrency(subtotal)}</ThemedText>
                </View>

                {appliedCoupon && (
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>Desconto (Cupom)</ThemedText>
                    <ThemedText style={[styles.summaryValue, { color: '#059669', fontWeight: 'bold' }]}>
                      -{formatCurrency(estimatedCouponDiscount)}
                    </ThemedText>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <ThemedText type="smallBold" style={[styles.summaryLabel, { fontSize: 14, color: '#000000' }]}>
                    Total Estimado
                  </ThemedText>
                  <ThemedText type="subtitle" style={{ color: theme.primary, fontSize: 18, fontWeight: 'bold' }}>
                    {formatCurrency(subtotal - estimatedCouponDiscount)}
                  </ThemedText>
                </View>

                {appliedCoupon && (
                  <ThemedText style={styles.disclaimerText}>
                    O valor final do desconto é confirmado no fechamento do pedido.
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Checkout Action */}
            {error && <ThemedText style={styles.checkoutErrorText}>{error}</ThemedText>}

            <Pressable onPress={handleCheckout} disabled={isSubmitting || !selectedAddressId}>
              <View style={[styles.checkoutBtn, { backgroundColor: theme.primary }, (isSubmitting || !selectedAddressId) && styles.checkoutBtnDisabled]}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText style={styles.checkoutBtnText}>Finalizar pedido</ThemedText>
                )}
              </View>
            </Pressable>
          </ScrollView>
        </View>
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
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
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#B37A5C',
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  itemsList: {
    gap: Spacing.two,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    gap: Spacing.two,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  itemImageFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetailsCol: {
    flex: 1,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyValue: {
    fontSize: 12,
    color: '#000000',
    minWidth: 18,
    textAlign: 'center',
  },
  sectionCard: {
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  toggleFormBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  addressFormBox: {
    gap: Spacing.two,
    marginTop: 4,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  input: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#000000',
    fontSize: 13,
  },
  rowFields: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  disabledInput: {
    backgroundColor: '#FFF3EB',
    color: '#B37A5C',
  },
  saveAddressBtn: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveAddressBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  addressesList: {
    gap: Spacing.two,
    marginTop: 4,
  },
  emptyAddressesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
  },
  addressItemCard: {
    backgroundColor: '#ffffff',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
  },
  addressSelectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  defaultBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  addressText: {
    fontSize: 11,
    color: '#B37A5C',
    lineHeight: 15,
    marginTop: 4,
  },
  appliedCouponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
  },
  removeCouponBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#ffffff',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  applyCouponBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryList: {
    gap: Spacing.one,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#B37A5C',
  },
  summaryValue: {
    fontSize: 12,
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#FFEAD9',
    marginVertical: 6,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#B37A5C',
    fontStyle: 'italic',
    marginTop: 4,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  checkoutErrorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
  },
  checkoutBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginTop: 8,
  },
  checkoutBtnDisabled: {
    opacity: 0.55,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
