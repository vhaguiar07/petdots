import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, ActivityIndicator, TextInput, ScrollView, Alert, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ApiError,
  DeliveryProviderType,
  type Address,
  type Store,
  type StoreStats,
  type Product,
  type Order,
  type StoreReview,
  type Category,
  type PetType,
  type BusinessHours,
} from '@petdots/shared';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { formatCep, FIXED_CITY, FIXED_STATE } from '@/lib/masks';
import { PASSWORD_REQUIREMENTS_HINT, getPasswordStrengthError } from '@/lib/password';
import { lookupCep } from '@/lib/viacep';
import { TIME_OPTIONS, BUSINESS_HOURS_GROUPS } from '@/lib/business-hours';
import { formatCurrency } from '@/lib/pricing';

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  STORE_OWNER: 'Lojista',
  ADMIN: 'Administrador',
};

const EMPTY_BUSINESS_HOURS = {
  weekdays: null,
  saturday: null,
  sunday: null,
};

const DEFAULT_DAY_SCHEDULE = { open: '08:00', close: '18:00' };

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparação',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CONFIRMED: '#10B981',
  PREPARING: '#2563EB',
  OUT_FOR_DELIVERY: '#7C3AED',
  DELIVERED: '#059669',
  CANCELLED: '#DC2626',
};


export default function AccountScreen() {
  const { user, isLoading, logout, updateLocalUser } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  // Customer Navigation State
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'addresses'>('personal');

  // Lojista Navigation State
  const [activeSubView, setActiveSubView] = useState<'personal' | 'security' | 'my-store' | 'products' | 'store-orders' | 'analytics' | 'reviews' | null>(null);

  // Profile Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalSuccess, setPersonalSuccess] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Addresses Management States
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: FIXED_CITY,
    state: FIXED_STATE,
    zipCode: '',
    isDefault: false,
  });
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Lojista Specific States
  const [store, setStore] = useState<Store | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeOrders, setStoreOrders] = useState<Order[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [loadingStoreData, setLoadingStoreData] = useState(false);

  // Store Form Fields
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeDeliveryProvider, setStoreDeliveryProvider] = useState<DeliveryProviderType>(DeliveryProviderType.SELF);
  const [storePhone, setStorePhone] = useState('');
  const [storeWhatsapp, setStoreWhatsapp] = useState('');
  const [storeInstagram, setStoreInstagram] = useState('');
  const [storeZipCode, setStoreZipCode] = useState('');
  const [storeStreet, setStoreStreet] = useState('');
  const [storeNumber, setStoreNumber] = useState('');
  const [storeNeighborhood, setStoreNeighborhood] = useState('');
  const [storeCity] = useState(FIXED_CITY);
  const [storeState] = useState(FIXED_STATE);
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeCoverUrl, setStoreCoverUrl] = useState('');
  const [storeBusinessHours, setStoreBusinessHours] = useState<BusinessHours>(EMPTY_BUSINESS_HOURS);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);

  // Modal selector targets for Lojista
  const [timePickerTarget, setTimePickerTarget] = useState<{ day: keyof BusinessHours; type: 'open' | 'close' } | null>(null);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);

  // Product Form Fields
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productPetTypeId, setProductPetTypeId] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPetTypePicker, setShowPetTypePicker] = useState(false);

  // Review reply states
  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [isSubmittingReply, setIsSubmittingReply] = useState<Record<string, boolean>>({});

  const loadAddresses = () => {
    apiClient
      .listAddresses()
      .then(setAddresses)
      .catch(() => setAddressError('Não foi possível carregar seus endereços.'));
  };

  const loadStoreOwnerData = async () => {
    setLoadingStoreData(true);
    try {
      const myStore = await apiClient.getMyStore();
      if (myStore) {
        setStore(myStore);
        setStoreName(myStore.name);
        setStoreDescription(myStore.description ?? '');
        setStoreDeliveryProvider(myStore.deliveryProvider);
        setStorePhone(myStore.phone ?? '');
        setStoreWhatsapp(myStore.whatsapp ?? '');
        setStoreInstagram(myStore.instagram ?? '');
        setStoreZipCode(myStore.zipCode ?? '');
        setStoreStreet(myStore.street ?? '');
        setStoreNumber(myStore.number ?? '');
        setStoreNeighborhood(myStore.neighborhood ?? '');
        setStoreLogoUrl(myStore.logoUrl ?? '');
        setStoreCoverUrl(myStore.coverUrl ?? '');
        setStoreBusinessHours(myStore.businessHours ?? EMPTY_BUSINESS_HOURS);

        const [statsData, productsData, ordersData, reviewsData, categoriesData, petTypesData] = await Promise.all([
          apiClient.getStoreStats(myStore.id).catch(() => null),
          apiClient.listMyProducts(myStore.id).catch(() => []),
          apiClient.listOrders({ storeId: myStore.id }).catch(() => []),
          apiClient.listStoreReviews(myStore.id).catch(() => []),
          apiClient.listCategories().catch(() => []),
          apiClient.listPetTypes().catch(() => []),
        ]);

        if (statsData) setStoreStats(statsData);
        setStoreProducts(productsData);
        setStoreOrders(ordersData);
        setStoreReviews(reviewsData);
        setCategories(categoriesData);
        setPetTypes(petTypesData);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStoreData(false);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        setName(user.name);
        setEmail(user.email);
        if (user.role === 'STORE_OWNER') {
          loadStoreOwnerData();
        } else {
          loadAddresses();
        }
      });
    }
  }, [user]);

  const handlePersonalSubmit = async () => {
    if (!name || !email) {
      setPersonalError('Por favor, preencha todos os campos.');
      return;
    }
    setPersonalError(null);
    setPersonalSuccess(false);
    setIsSavingPersonal(true);

    try {
      updateLocalUser({ name, email });
      setPersonalSuccess(true);
      setTimeout(() => setPersonalSuccess(false), 3000);
    } catch (err) {
      setPersonalError(err instanceof ApiError ? err.message : 'Erro ao atualizar dados.');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSecuritySubmit = async () => {
    setSecurityError(null);
    setSecuritySuccess(false);

    const passwordStrengthErr = getPasswordStrengthError(newPassword);
    if (passwordStrengthErr) {
      setSecurityError(passwordStrengthErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('A confirmação de nova senha não confere.');
      return;
    }

    setIsSavingSecurity(true);
    try {
      await apiClient.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirmation: confirmPassword,
      });
      setSecuritySuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSecuritySuccess(false), 3000);
    } catch (err) {
      setSecurityError(err instanceof ApiError ? err.message : 'Erro ao atualizar senha.');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood || !addressForm.zipCode) {
      setAddressFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setAddressFormError(null);
    setIsSavingAddress(true);

    try {
      await apiClient.createAddress({
        label: addressForm.label || undefined,
        street: addressForm.street,
        number: addressForm.number,
        complement: addressForm.complement || undefined,
        neighborhood: addressForm.neighborhood,
        city: addressForm.city,
        state: addressForm.state,
        zipCode: addressForm.zipCode,
        isDefault: addressForm.isDefault,
      });
      setAddressForm({
        label: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: FIXED_CITY,
        state: FIXED_STATE,
        zipCode: '',
        isDefault: false,
      });
      setShowAddressForm(false);
      loadAddresses();
    } catch (err) {
      setAddressFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar o endereço.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await apiClient.updateAddress(id, { isDefault: true });
      loadAddresses();
    } catch {
      Alert.alert('Erro', 'Não foi possível definir o endereço como padrão.');
    }
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert('Remover endereço', 'Tem certeza que deseja remover este endereço?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.deleteAddress(id);
            loadAddresses();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover o endereço.');
          }
        },
      },
    ]);
  };

  // Lojista actions
  const handleZipCodeBlur = async () => {
    const cleanCep = storeZipCode.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await lookupCep(cleanCep);
        if (res) {
          setStoreStreet(res.street || '');
          setStoreNeighborhood(res.neighborhood || '');
        } else {
          Alert.alert('Aviso', 'CEP não encontrado.');
        }
      } catch {
        // Silently catch
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleUpdateStore = async () => {
    if (!storeName || !storeZipCode || !storeStreet || !storeNumber || !storeNeighborhood) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setIsSubmittingStore(true);
    try {
      const updated = await apiClient.updateStore(store!.id, {
        name: storeName,
        description: storeDescription || undefined,
        deliveryProvider: storeDeliveryProvider,
        street: storeStreet,
        number: storeNumber,
        neighborhood: storeNeighborhood,
        city: storeCity,
        state: storeState,
        zipCode: storeZipCode,
        logoUrl: storeLogoUrl || undefined,
        coverUrl: storeCoverUrl || undefined,
        phone: storePhone || undefined,
        whatsapp: storeWhatsapp || undefined,
        instagram: storeInstagram || undefined,
        businessHours: storeBusinessHours,
      });
      setStore(updated);
      Alert.alert('Sucesso', 'Configurações da loja atualizadas!');
      setActiveSubView(null);
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível atualizar a loja.');
    } finally {
      setIsSubmittingStore(false);
    }
  };

  const handleToggleProductActive = async (product: Product) => {
    try {
      const updated = await apiClient.updateProduct(product.id, { isActive: !product.isActive });
      setStoreProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível atualizar o produto.');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert('Remover produto', 'Deseja realmente excluir este produto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.deleteProduct(productId);
            setStoreProducts((prev) => prev.filter((p) => p.id !== productId));
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o produto.');
          }
        },
      },
    ]);
  };

  const openNewProductForm = () => {
    setEditingProduct(null);
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductStock('');
    setProductCategoryId('');
    setProductPetTypeId('');
    setProductImages([]);
    setShowProductForm(true);
  };

  const openEditProductForm = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductDescription(product.description ?? '');
    setProductPrice(product.price);
    setProductStock(String(product.stock));
    setProductCategoryId(product.categoryId ?? '');
    setProductPetTypeId(product.petTypeId ?? '');
    setProductImages(product.images.map((img) => img.url));
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
    if (!productName || !productPrice || !productStock) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setIsSavingProduct(true);
    try {
      if (editingProduct) {
        const updated = await apiClient.updateProduct(editingProduct.id, {
          name: productName,
          description: productDescription || undefined,
          price: Number(productPrice),
          stock: Number(productStock),
          categoryId: productCategoryId || undefined,
          petTypeId: productPetTypeId || undefined,
          images: productImages,
        });
        setStoreProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        Alert.alert('Sucesso', 'Produto atualizado!');
      } else {
        const created = await apiClient.createProduct({
          storeId: store!.id,
          name: productName,
          description: productDescription || undefined,
          price: Number(productPrice),
          stock: Number(productStock),
          categoryId: productCategoryId || undefined,
          petTypeId: productPetTypeId || undefined,
          images: productImages,
        });
        setStoreProducts((prev) => [...prev, created]);
        Alert.alert('Sucesso', 'Produto criado!');
      }
      setShowProductForm(false);
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível salvar o produto.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updated = await apiClient.updateOrderStatus(orderId, { status: newStatus as any });
      setStoreOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      Alert.alert('Sucesso', 'Status do pedido atualizado!');
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível atualizar o status do pedido.');
    }
  };

  const handleReplyToReview = async (reviewId: string) => {
    const text = replyInput[reviewId];
    if (!text || !text.trim()) return;

    setIsSubmittingReply((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const updated = await apiClient.replyToStoreReview(store!.id, reviewId, { reply: text.trim() });
      setStoreReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyInput((prev) => ({ ...prev, [reviewId]: '' }));
      Alert.alert('Sucesso', 'Resposta enviada!');
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Não foi possível enviar a resposta.');
    } finally {
      setIsSubmittingReply((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  // Rendering Helper Methods for Lojista Panel
  const renderLojistaDashboard = () => {
    if (loadingStoreData) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={{ marginTop: 12, color: '#B37A5C' }}>Carregando dados da loja...</ThemedText>
        </View>
      );
    }

    if (!store) {
      return (
        <View style={styles.centered}>
          <Ionicons name="storefront-outline" size={64} color="#B37A5C" />
          <ThemedText style={styles.emptyTitle}>Nenhuma loja vinculada</ThemedText>
          <ThemedText style={styles.emptyText}>
            Não encontramos um estabelecimento vinculado a esta conta de Lojista. Por favor, acesse o painel web para criar sua loja.
          </ThemedText>
          <Pressable onPress={() => logout()} style={{ marginTop: 24, width: '100%' }}>
            <View style={styles.logoutButton}>
              <ThemedText style={{ color: theme.danger, fontWeight: 'bold' }}>Sair da Conta</ThemedText>
            </View>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Lojista Card */}
        <View style={styles.card}>
          {store.logoUrl ? (
            <Image source={{ uri: store.logoUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
          ) : (
            <View style={styles.userIconWrapper}>
              <Ionicons name="storefront" size={24} color={theme.primary} />
            </View>
          )}
          <View style={styles.userInfoCol}>
            <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 16 }}>
              {store.name}
            </ThemedText>
            <ThemedText style={{ color: '#B37A5C', fontSize: 12, marginTop: 2 }}>
              Dono: {user?.name}
            </ThemedText>
            <View style={[styles.roleTag, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 9 }}>
                LOJISTA
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Dashboard Grid Menu */}
        <View style={styles.gridMenu}>
          <Pressable onPress={() => setActiveSubView('my-store')} style={styles.gridBtn}>
            <Ionicons name="storefront-outline" size={24} color={theme.primary} />
            <ThemedText type="smallBold" style={styles.gridBtnLabel}>Minha Loja</ThemedText>
          </Pressable>

          <Pressable onPress={() => setActiveSubView('products')} style={styles.gridBtn}>
            <Ionicons name="grid-outline" size={24} color={theme.primary} />
            <ThemedText type="smallBold" style={styles.gridBtnLabel}>Produtos</ThemedText>
          </Pressable>

          <Pressable onPress={() => setActiveSubView('store-orders')} style={styles.gridBtn}>
            <Ionicons name="receipt-outline" size={24} color={theme.primary} />
            <ThemedText type="smallBold" style={styles.gridBtnLabel}>Pedidos</ThemedText>
          </Pressable>

          <Pressable onPress={() => setActiveSubView('analytics')} style={styles.gridBtn}>
            <Ionicons name="bar-chart-outline" size={24} color={theme.primary} />
            <ThemedText type="smallBold" style={styles.gridBtnLabel}>Analytics</ThemedText>
          </Pressable>

          <Pressable onPress={() => setActiveSubView('reviews')} style={styles.gridBtn}>
            <Ionicons name="star-outline" size={24} color={theme.primary} />
            <ThemedText type="smallBold" style={styles.gridBtnLabel}>Avaliações</ThemedText>
          </Pressable>

          <Pressable onPress={() => setActiveSubView('personal')} style={styles.gridBtn}>
            <Ionicons name="person-outline" size={24} color={theme.primary} />
            <ThemedText type="smallBold" style={styles.gridBtnLabel}>Perfil</ThemedText>
          </Pressable>

          <Pressable onPress={() => setActiveSubView('security')} style={styles.gridBtn}>
            <Ionicons name="lock-closed-outline" size={24} color={theme.primary} />
            <ThemedText type="smallBold" style={styles.gridBtnLabel}>Segurança</ThemedText>
          </Pressable>
        </View>

        {/* Logout */}
        <Pressable onPress={() => logout()} style={{ marginTop: Spacing.four }}>
          <View style={[styles.logoutButton, { borderColor: theme.danger }]}>
            <ThemedText style={{ color: theme.danger, fontWeight: 'bold', fontSize: 14 }}>
              Sair da Conta
            </ThemedText>
          </View>
        </Pressable>
      </ScrollView>
    );
  };

  const renderSubViewHeader = (title: string) => (
    <View style={styles.subViewHeader}>
      <Pressable onPress={() => { setActiveSubView(null); setShowProductForm(false); }} style={{ padding: 4 }}>
        <Ionicons name="arrow-back" size={24} color="#000000" />
      </Pressable>
      <ThemedText type="smallBold" style={styles.subViewTitle}>{title}</ThemedText>
    </View>
  );

  const renderMyStoreView = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderSubViewHeader('Configurações da Loja')}

        <View style={styles.formGroup}>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Nome da Loja</ThemedText>
            <TextInput value={storeName} onChangeText={setStoreName} style={styles.input} />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Descrição</ThemedText>
            <TextInput
              value={storeDescription}
              onChangeText={setStoreDescription}
              multiline
              numberOfLines={3}
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Provedor de Entrega</ThemedText>
            <Pressable onPress={() => setShowDeliveryPicker(true)} style={styles.dropdownTrigger}>
              <ThemedText style={{ color: '#000000', fontSize: 13 }}>
                {storeDeliveryProvider === DeliveryProviderType.SELF ? 'Entrega própria' : 'Entrega externa'}
              </ThemedText>
              <Ionicons name="chevron-down" size={16} color="#B37A5C" />
            </Pressable>
          </View>

          {/* Social and contacts */}
          <ThemedText type="smallBold" style={styles.sectionHeaderTitle}>Contato e Redes Sociais</ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Telefone / WhatsApp</ThemedText>
            <TextInput value={storePhone} onChangeText={setStorePhone} placeholder="(21) 98765-4321" placeholderTextColor="#B37A5C" style={styles.input} />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>WhatsApp Link (Opcional)</ThemedText>
            <TextInput value={storeWhatsapp} onChangeText={setStoreWhatsapp} placeholder="https://wa.me/55..." placeholderTextColor="#B37A5C" style={styles.input} />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Instagram Comercial</ThemedText>
            <TextInput value={storeInstagram} onChangeText={setStoreInstagram} placeholder="@meupetshop" placeholderTextColor="#B37A5C" style={styles.input} />
          </View>

          {/* Address */}
          <ThemedText type="smallBold" style={styles.sectionHeaderTitle}>Endereço Comercial</ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>CEP</ThemedText>
            <TextInput
              value={storeZipCode}
              onChangeText={(t) => setStoreZipCode(formatCep(t))}
              onBlur={handleZipCodeBlur}
              maxLength={9}
              keyboardType="numeric"
              placeholder="00000-000"
              placeholderTextColor="#B37A5C"
              style={[styles.input, isSearchingCep && styles.disabledInput]}
              editable={!isSearchingCep}
            />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 2 }]}>
              <ThemedText style={styles.label}>Rua</ThemedText>
              <TextInput value={storeStreet} onChangeText={setStoreStreet} style={styles.input} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText style={styles.label}>Número</ThemedText>
              <TextInput value={storeNumber} onChangeText={setStoreNumber} style={styles.input} />
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Bairro</ThemedText>
            <TextInput value={storeNeighborhood} onChangeText={setStoreNeighborhood} style={styles.input} />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.field, { flex: 2 }]}>
              <ThemedText style={styles.label}>Cidade</ThemedText>
              <TextInput value={storeCity} editable={false} style={[styles.input, styles.disabledInput]} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText style={styles.label}>Estado</ThemedText>
              <TextInput value={storeState} editable={false} style={[styles.input, styles.disabledInput]} />
            </View>
          </View>

          {/* Business Hours */}
          <ThemedText type="smallBold" style={styles.sectionHeaderTitle}>Horários de Funcionamento</ThemedText>

          {BUSINESS_HOURS_GROUPS.map(({ key, label }) => {
            const sched = storeBusinessHours[key];
            const isOpen = sched !== null;
            return (
              <View key={key} style={styles.businessHoursRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }}>{label}</ThemedText>
                  <Pressable
                    onPress={() =>
                      setStoreBusinessHours((prev) => ({
                        ...prev,
                        [key]: isOpen ? null : DEFAULT_DAY_SCHEDULE,
                      }))
                    }
                    style={styles.checkboxWrapper}
                  >
                    <View style={[styles.checkbox, isOpen && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                      {isOpen && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                    </View>
                    <ThemedText style={styles.checkboxLabel}>Aberto</ThemedText>
                  </Pressable>
                </View>

                {isOpen && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ width: 80 }}>
                      <ThemedText style={styles.label}>Abre</ThemedText>
                      <Pressable onPress={() => setTimePickerTarget({ day: key, type: 'open' })} style={styles.dropdownTriggerSmall}>
                        <ThemedText style={{ fontSize: 12 }}>{sched.open}</ThemedText>
                      </Pressable>
                    </View>
                    <View style={{ width: 80 }}>
                      <ThemedText style={styles.label}>Fecha</ThemedText>
                      <Pressable onPress={() => setTimePickerTarget({ day: key, type: 'close' })} style={styles.dropdownTriggerSmall}>
                        <ThemedText style={{ fontSize: 12 }}>{sched.close}</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          <Pressable onPress={handleUpdateStore} disabled={isSubmittingStore} style={{ marginTop: 8 }}>
            <View style={[styles.submitBtn, { backgroundColor: theme.primary }]}>
              {isSubmittingStore ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.submitBtnText}>Salvar Alterações</ThemedText>}
            </View>
          </Pressable>
        </View>

        {/* Modal Pickers */}
        <Modal visible={timePickerTarget !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText type="smallBold" style={styles.modalTitle}>Selecionar Horário</ThemedText>
              <ScrollView style={{ maxHeight: 260 }}>
                {TIME_OPTIONS.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      if (timePickerTarget) {
                        const { day, type } = timePickerTarget;
                        setStoreBusinessHours((prev) => ({
                          ...prev,
                          [day]: { ...(prev[day] ?? DEFAULT_DAY_SCHEDULE), [type]: t },
                        }));
                      }
                      setTimePickerTarget(null);
                    }}
                    style={styles.timeOptionBtn}
                  >
                    <ThemedText style={{ color: '#000000', fontSize: 13 }}>{t}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={() => setTimePickerTarget(null)} style={styles.modalCloseBtn}>
                <ThemedText style={{ color: theme.danger, fontWeight: 'bold' }}>Cancelar</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showDeliveryPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText type="smallBold" style={styles.modalTitle}>Provedor de Entrega</ThemedText>
              <Pressable
                onPress={() => {
                  setStoreDeliveryProvider(DeliveryProviderType.SELF);
                  setShowDeliveryPicker(false);
                }}
                style={styles.timeOptionBtn}
              >
                <ThemedText style={{ color: '#000000', fontSize: 13 }}>Entrega própria</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStoreDeliveryProvider(DeliveryProviderType.EXTERNAL);
                  setShowDeliveryPicker(false);
                }}
                style={styles.timeOptionBtn}
              >
                <ThemedText style={{ color: '#000000', fontSize: 13 }}>Entrega externa</ThemedText>
              </Pressable>
              <Pressable onPress={() => setShowDeliveryPicker(false)} style={styles.modalCloseBtn}>
                <ThemedText style={{ color: theme.danger, fontWeight: 'bold' }}>Cancelar</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  const renderProductsView = () => {
    if (showProductForm) {
      return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {renderSubViewHeader(editingProduct ? 'Editar Produto' : 'Novo Produto')}

          <View style={styles.formGroup}>
            <View style={styles.field}>
              <ThemedText style={styles.label}>Nome do Produto</ThemedText>
              <TextInput value={productName} onChangeText={setProductName} placeholder="Ex: Ração Golden Adulto 15kg" placeholderTextColor="#B37A5C" style={styles.input} />
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Descrição</ThemedText>
              <TextInput
                value={productDescription}
                onChangeText={setProductDescription}
                multiline
                numberOfLines={3}
                placeholder="Fale um pouco sobre o produto..."
                placeholderTextColor="#B37A5C"
                style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 8 }]}
              />
            </View>

            <View style={styles.rowFields}>
              <View style={[styles.field, { flex: 1 }]}>
                <ThemedText style={styles.label}>Preço (R$)</ThemedText>
                <TextInput value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#B37A5C" style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <ThemedText style={styles.label}>Estoque</ThemedText>
                <TextInput value={productStock} onChangeText={setProductStock} keyboardType="numeric" placeholder="0" placeholderTextColor="#B37A5C" style={styles.input} />
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Categoria</ThemedText>
              <Pressable onPress={() => setShowCategoryPicker(true)} style={styles.dropdownTrigger}>
                <ThemedText style={{ color: '#000000', fontSize: 13 }}>
                  {categories.find((c) => c.id === productCategoryId)?.name ?? 'Sem Categoria'}
                </ThemedText>
                <Ionicons name="chevron-down" size={16} color="#B37A5C" />
              </Pressable>
            </View>

            {petTypes.length > 0 && (
              <View style={styles.field}>
                <ThemedText style={styles.label}>Tipo de Pet (opcional)</ThemedText>
                <Pressable onPress={() => setShowPetTypePicker(true)} style={styles.dropdownTrigger}>
                  <ThemedText style={{ color: '#000000', fontSize: 13 }}>
                    {petTypes.find((p) => p.id === productPetTypeId)?.name ?? 'Nenhum'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={16} color="#B37A5C" />
                </Pressable>
              </View>
            )}

            <Pressable onPress={handleSaveProduct} disabled={isSavingProduct} style={{ marginTop: 8 }}>
              <View style={[styles.submitBtn, { backgroundColor: theme.primary }]}>
                {isSavingProduct ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.submitBtnText}>Salvar Produto</ThemedText>}
              </View>
            </Pressable>
          </View>

          {/* Modal Pickers */}
          <Modal visible={showCategoryPicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ThemedText type="smallBold" style={styles.modalTitle}>Selecionar Categoria</ThemedText>
                <ScrollView style={{ maxHeight: 260 }}>
                  {categories.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setProductCategoryId(c.id);
                        setShowCategoryPicker(false);
                      }}
                      style={styles.timeOptionBtn}
                    >
                      <ThemedText style={{ color: '#000000', fontSize: 13 }}>{c.name}</ThemedText>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => { setProductCategoryId(''); setShowCategoryPicker(false); }} style={styles.timeOptionBtn}>
                    <ThemedText style={{ color: '#B37A5C', fontSize: 13 }}>Sem Categoria</ThemedText>
                  </Pressable>
                </ScrollView>
                <Pressable onPress={() => setShowCategoryPicker(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={{ color: theme.danger, fontWeight: 'bold' }}>Cancelar</ThemedText>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Modal visible={showPetTypePicker} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ThemedText type="smallBold" style={styles.modalTitle}>Selecionar Tipo de Pet</ThemedText>
                <ScrollView style={{ maxHeight: 260 }}>
                  <Pressable onPress={() => { setProductPetTypeId(''); setShowPetTypePicker(false); }} style={styles.timeOptionBtn}>
                    <ThemedText style={{ color: '#B37A5C', fontSize: 13 }}>Nenhum</ThemedText>
                  </Pressable>
                  {petTypes.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setProductPetTypeId(p.id);
                        setShowPetTypePicker(false);
                      }}
                      style={styles.timeOptionBtn}
                    >
                      <ThemedText style={{ color: '#000000', fontSize: 13 }}>{p.name}</ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable onPress={() => setShowPetTypePicker(false)} style={styles.modalCloseBtn}>
                  <ThemedText style={{ color: theme.danger, fontWeight: 'bold' }}>Cancelar</ThemedText>
                </Pressable>
              </View>
            </View>
          </Modal>

        </ScrollView>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderSubViewHeader('Gerenciar Produtos')}

        <Pressable onPress={openNewProductForm} style={{ marginBottom: 12 }}>
          <View style={[styles.submitBtn, { backgroundColor: theme.primary, borderRadius: 12 }]}>
            <ThemedText style={styles.submitBtnText}>+ Novo Produto</ThemedText>
          </View>
        </Pressable>

        {storeProducts.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="grid-outline" size={32} color="#B37A5C" />
            <ThemedText style={{ fontWeight: 'bold', marginTop: 8 }}>Nenhum produto cadastrado</ThemedText>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {storeProducts.map((p) => {
            const isOutOfStock = p.stock === 0;
            const isLowStock = p.stock > 0 && p.stock < 5;
            return (
              <View key={p.id} style={styles.itemCard}>
                {p.images && p.images[0]?.url ? (
                  <Image source={{ uri: p.images[0].url }} style={styles.productThumb} />
                ) : (
                  <View style={[styles.productThumb, styles.productThumbFallback]}>
                    <ThemedText style={{ fontSize: 18 }}>🐾</ThemedText>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={{ color: '#000000' }} numberOfLines={1}>{p.name}</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <ThemedText style={{ color: theme.primary, fontWeight: 'bold', fontSize: 12 }}>
                      {formatCurrency(Number(p.price))}
                    </ThemedText>
                    <ThemedText style={{ color: '#B37A5C', fontSize: 10 }}>•</ThemedText>
                    {isOutOfStock ? (
                      <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                        <ThemedText style={{ color: '#991B1B', fontSize: 9, fontWeight: 'bold' }}>Sem estoque</ThemedText>
                      </View>
                    ) : isLowStock ? (
                      <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                        <ThemedText style={{ color: '#D97706', fontSize: 9, fontWeight: 'bold' }}>Baixo ({p.stock})</ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={{ color: '#B37A5C', fontSize: 11 }}>Qtd: {p.stock}</ThemedText>
                    )}
                  </View>
                </View>

                {/* Edit and Toggle Active */}
                <View style={{ gap: 6, alignItems: 'flex-end' }}>
                  <Pressable onPress={() => openEditProductForm(p)} style={styles.actionBtn}>
                    <ThemedText style={[styles.actionBtnText, { color: theme.primary }]}>Editar</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => handleToggleProductActive(p)} style={[styles.actionBtn, { borderColor: p.isActive ? '#FCA5A5' : '#A7F3D0' }]}>
                    <ThemedText style={[styles.actionBtnText, { color: p.isActive ? '#DC2626' : '#059669' }]}>
                      {p.isActive ? 'Desativar' : 'Ativar'}
                    </ThemedText>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteProduct(p.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderStoreOrdersView = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderSubViewHeader('Pedidos Recebidos')}

        {storeOrders.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color="#B37A5C" />
            <ThemedText style={{ fontWeight: 'bold', marginTop: 8 }}>Nenhum pedido recebido</ThemedText>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {storeOrders.map((o) => {
            const statusLabel = ORDER_STATUS_LABELS[o.status] ?? o.status;
            const statusColor = ORDER_STATUS_COLORS[o.status] ?? '#000000';
            return (
              <View key={o.id} style={styles.itemCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText type="smallBold" style={{ color: '#000000' }}>
                      Pedido #{o.id.slice(-5).toUpperCase()}
                    </ThemedText>
                    <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
                      <ThemedText style={{ color: statusColor, fontSize: 9, fontWeight: 'bold' }}>
                        {statusLabel.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={{ marginVertical: 6, gap: 2 }}>
                    {o.items.map((item) => (
                      <ThemedText key={item.id} style={{ fontSize: 11, color: '#000000' }}>
                        {item.quantity}x {item.product?.name ?? 'Produto'}
                      </ThemedText>
                    ))}
                  </View>

                  <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 13 }}>
                    Total: {formatCurrency(Number(o.total))}
                  </ThemedText>
                </View>

                {/* Order Status Transition Actions */}
                <View style={{ gap: 6, justifyContent: 'center', marginLeft: 8 }}>
                  {o.status === 'PENDING' && (
                    <Pressable onPress={() => handleUpdateOrderStatus(o.id, 'CONFIRMED')}>
                      <View style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        <ThemedText style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>Confirmar</ThemedText>
                      </View>
                    </Pressable>
                  )}
                  {o.status === 'CONFIRMED' && (
                    <Pressable onPress={() => handleUpdateOrderStatus(o.id, 'PREPARING')}>
                      <View style={[styles.actionBtn, { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}>
                        <ThemedText style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>Preparar</ThemedText>
                      </View>
                    </Pressable>
                  )}
                  {o.status === 'PREPARING' && (
                    <Pressable onPress={() => handleUpdateOrderStatus(o.id, 'OUT_FOR_DELIVERY')}>
                      <View style={[styles.actionBtn, { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]}>
                        <ThemedText style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>Despachar</ThemedText>
                      </View>
                    </Pressable>
                  )}
                  {o.status === 'OUT_FOR_DELIVERY' && (
                    <Pressable onPress={() => handleUpdateOrderStatus(o.id, 'DELIVERED')}>
                      <View style={[styles.actionBtn, { backgroundColor: '#059669', borderColor: '#059669' }]}>
                        <ThemedText style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>Entregar</ThemedText>
                      </View>
                    </Pressable>
                  )}
                  {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                    <Pressable onPress={() => handleUpdateOrderStatus(o.id, 'CANCELLED')}>
                      <View style={[styles.actionBtn, { borderColor: theme.danger }]}>
                        <ThemedText style={{ color: theme.danger, fontSize: 10, fontWeight: 'bold' }}>Cancelar</ThemedText>
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderAnalyticsView = () => {
    if (!storeStats) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderSubViewHeader('Desempenho da Loja')}

        <View style={{ gap: 12 }}>
          {/* Revenue Delivered */}
          <View style={[styles.statCard, { borderTopColor: theme.primary, borderTopWidth: 4 }]}>
            <ThemedText style={styles.statLabel}>Faturamento Total</ThemedText>
            <ThemedText type="title" style={{ fontSize: 24, fontWeight: 'bold', color: '#000000', marginTop: 4 }}>
              {formatCurrency(storeStats.revenueDelivered)}
            </ThemedText>
            <ThemedText style={{ fontSize: 10, color: '#B37A5C', marginTop: 4 }}>
              Receita consolidada de pedidos entregues
            </ThemedText>
          </View>

          {/* Revenue in progress */}
          <View style={[styles.statCard, { borderTopColor: '#60A5FA', borderTopWidth: 4 }]}>
            <ThemedText style={styles.statLabel}>Em Andamento</ThemedText>
            <ThemedText type="title" style={{ fontSize: 24, fontWeight: 'bold', color: '#000000', marginTop: 4 }}>
              {formatCurrency(storeStats.revenueInProgress)}
            </ThemedText>
            <ThemedText style={{ fontSize: 10, color: '#B37A5C', marginTop: 4 }}>
              Ganhos potenciais de pedidos não entregues
            </ThemedText>
          </View>

          <View style={styles.rowFields}>
            {/* Orders count */}
            <View style={[styles.statCard, { flex: 1, borderTopColor: '#000000', borderTopWidth: 4 }]}>
              <ThemedText style={styles.statLabel}>Pedidos Totais</ThemedText>
              <ThemedText type="title" style={{ fontSize: 24, fontWeight: 'bold', color: '#000000', marginTop: 4 }}>
                {storeStats.ordersCount}
              </ThemedText>
            </View>

            {/* Active products */}
            <View style={[styles.statCard, { flex: 1, borderTopColor: theme.primary, borderTopWidth: 4 }]}>
              <ThemedText style={styles.statLabel}>Produtos Ativos</ThemedText>
              <ThemedText type="title" style={{ fontSize: 24, fontWeight: 'bold', color: '#000000', marginTop: 4 }}>
                {storeStats.activeProductsCount}
              </ThemedText>
            </View>
          </View>

          {/* Top products */}
          <View style={styles.sectionCard}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>Produtos Mais Vendidos</ThemedText>
            {storeStats.topProducts.length === 0 ? (
              <ThemedText style={{ fontSize: 11, color: '#B37A5C', fontStyle: 'italic' }}>Nenhum produto entregue ainda.</ThemedText>
            ) : (
              <View style={{ gap: 8, marginTop: 4 }}>
                {storeStats.topProducts.map((p, idx) => (
                  <View key={p.productId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ThemedText style={{ fontSize: 12, color: '#000000', flex: 1 }}>
                      {idx + 1}. {p.name}
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      {formatCurrency(Number(p.revenue))}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderReviewsView = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderSubViewHeader('Avaliações da Loja')}

        {storeReviews.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="star-outline" size={32} color="#B37A5C" />
            <ThemedText style={{ fontWeight: 'bold', marginTop: 8 }}>Nenhuma avaliação recebida</ThemedText>
          </View>
        )}

        <View style={{ gap: 12 }}>
          {storeReviews.map((r) => (
            <View key={r.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText type="smallBold" style={{ color: '#000000' }}>
                    {r.customer?.name ?? 'Cliente'}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <ThemedText type="smallBold" style={{ color: '#FBBF24', fontSize: 12 }}>
                      {r.rating.toFixed(1)}
                    </ThemedText>
                  </View>
                </View>

                {r.comment ? (
                  <ThemedText style={{ fontSize: 12, color: '#000000', marginTop: 6, fontStyle: 'italic' }}>
                    {"\"" + r.comment + "\""}
                  </ThemedText>
                ) : null}

                {/* Owner Reply */}
                {r.ownerReply ? (
                  <View style={styles.replyBox}>
                    <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 11 }}>Sua resposta:</ThemedText>
                    <ThemedText style={{ fontSize: 11, color: '#B37A5C', marginTop: 2 }}>{"\"" + r.ownerReply + "\""}</ThemedText>
                  </View>
                ) : (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    <TextInput
                      value={replyInput[r.id] ?? ''}
                      onChangeText={(t) => setReplyInput((prev) => ({ ...prev, [r.id]: t }))}
                      placeholder="Responda a esta avaliação..."
                      placeholderTextColor="#B37A5C"
                      style={styles.replyInput}
                    />
                    <Pressable
                      onPress={() => handleReplyToReview(r.id)}
                      disabled={isSubmittingReply[r.id] || !replyInput[r.id]?.trim()}
                      style={[styles.actionBtn, { alignSelf: 'flex-start', backgroundColor: theme.primary, borderColor: theme.primary }]}
                    >
                      {isSubmittingReply[r.id] ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <ThemedText style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>Responder</ThemedText>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Sua Conta</ThemedText>
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

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Sua Conta</ThemedText>
          </View>

          <View style={styles.contentBody}>
            <View style={styles.centered}>
              <Ionicons name="person-circle-outline" size={64} color={theme.primary} />
              <ThemedText style={styles.emptyTitle}>Sua conta</ThemedText>
              <ThemedText style={styles.emptyText}>
                Entre ou crie uma conta para comprar, acompanhar pedidos e muito mais.
              </ThemedText>

              <View style={styles.actions}>
                <Pressable onPress={() => router.push('/login')}>
                  <View style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
                    <ThemedText style={{ color: '#ffffff', fontWeight: 'bold' }}>
                      Entrar
                    </ThemedText>
                  </View>
                </Pressable>

                <Pressable onPress={() => router.push('/register')}>
                  <View style={[styles.secondaryButton, { borderColor: theme.primary }]}>
                    <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>
                      Criar conta
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

  // STORE OWNER (Lojista) Layout
  if (user.role === 'STORE_OWNER') {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>
              {activeSubView === null ? 'Painel do Lojista' : 'Sua Conta'}
            </ThemedText>
          </View>

          <View style={styles.contentBody}>
            {activeSubView === null && renderLojistaDashboard()}
            {activeSubView === 'personal' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {renderSubViewHeader('Dados Pessoais')}
                <View style={styles.formGroup}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Nome completo</ThemedText>
                    <TextInput value={name} onChangeText={setName} style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>E-mail</ThemedText>
                    <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} />
                  </View>
                  {personalError && <ThemedText style={styles.errorText}>{personalError}</ThemedText>}
                  {personalSuccess && (
                    <View style={styles.successBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                      <ThemedText style={styles.successText}>Perfil atualizado com sucesso.</ThemedText>
                    </View>
                  )}
                  <Pressable onPress={handlePersonalSubmit} disabled={isSavingPersonal}>
                    <View style={[styles.submitBtn, { backgroundColor: theme.primary }]}>
                      {isSavingPersonal ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.submitBtnText}>Salvar Alterações</ThemedText>}
                    </View>
                  </Pressable>
                </View>
              </ScrollView>
            )}
            {activeSubView === 'security' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {renderSubViewHeader('Segurança')}
                <View style={styles.formGroup}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Senha atual</ThemedText>
                    <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" placeholderTextColor="#B37A5C" style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Nova senha</ThemedText>
                    <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Mínimo 8 caracteres" placeholderTextColor="#B37A5C" style={styles.input} />
                    <ThemedText style={styles.inputHint}>{PASSWORD_REQUIREMENTS_HINT}</ThemedText>
                  </View>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Confirmar nova senha</ThemedText>
                    <TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Confirme sua nova senha" placeholderTextColor="#B37A5C" style={styles.input} />
                  </View>
                  {securityError && <ThemedText style={styles.errorText}>{securityError}</ThemedText>}
                  {securitySuccess && (
                    <View style={styles.successBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                      <ThemedText style={styles.successText}>Senha atualizada com sucesso.</ThemedText>
                    </View>
                  )}
                  <Pressable onPress={handleSecuritySubmit} disabled={isSavingSecurity}>
                    <View style={[styles.submitBtn, { backgroundColor: theme.primary }]}>
                      {isSavingSecurity ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.submitBtnText}>Atualizar Senha</ThemedText>}
                    </View>
                  </Pressable>
                </View>
              </ScrollView>
            )}
            {activeSubView === 'my-store' && renderMyStoreView()}
            {activeSubView === 'products' && renderProductsView()}
            {activeSubView === 'store-orders' && renderStoreOrdersView()}
            {activeSubView === 'analytics' && renderAnalyticsView()}
            {activeSubView === 'reviews' && renderReviewsView()}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // CUSTOMER (Cliente) Layout
  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header area */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Sua Conta</ThemedText>
        </View>

        {/* White Content Body Panel */}
        <View style={styles.contentBody}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* User Profile Summary Card */}
            <View style={styles.card}>
              <View style={styles.userIconWrapper}>
                <Ionicons name="person" size={24} color={theme.primary} />
              </View>
              <View style={styles.userInfoCol}>
                <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 16 }}>
                  {user.name}
                </ThemedText>
                <ThemedText style={{ color: '#B37A5C', fontSize: 13, marginTop: 2 }}>
                  {user.email}
                </ThemedText>
                <View style={[styles.roleTag, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 9 }}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Inner Dashboard Tabs Selector */}
            <View style={styles.tabSelector}>
              <Pressable
                onPress={() => setActiveTab('personal')}
                style={[styles.tabBtn, activeTab === 'personal' && { borderBottomColor: theme.primary }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: activeTab === 'personal' ? theme.primary : '#B37A5C', fontSize: 12 }}
                >
                  Dados Pessoais
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('security')}
                style={[styles.tabBtn, activeTab === 'security' && { borderBottomColor: theme.primary }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: activeTab === 'security' ? theme.primary : '#B37A5C', fontSize: 12 }}
                >
                  Segurança
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('addresses')}
                style={[styles.tabBtn, activeTab === 'addresses' && { borderBottomColor: theme.primary }]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: activeTab === 'addresses' ? theme.primary : '#B37A5C', fontSize: 12 }}
                >
                  Endereços
                </ThemedText>
              </Pressable>
            </View>

            {/* TAB CONTENT AREAS */}

            {/* Tab 1: Personal Data Form */}
            {activeTab === 'personal' && (
              <View style={styles.tabContainer}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    Dados Pessoais
                  </ThemedText>
                  <ThemedText style={styles.sectionDesc}>
                    Atualize seu nome de exibição e seu endereço de e-mail.
                  </ThemedText>
                </View>

                {/* Form fields */}
                <View style={styles.formGroup}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Nome completo</ThemedText>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Seu nome completo"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.label}>E-mail</ThemedText>
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

                {personalError && <ThemedText style={styles.errorText}>{personalError}</ThemedText>}
                {personalSuccess && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                    <ThemedText style={styles.successText}>Perfil atualizado com sucesso.</ThemedText>
                  </View>
                )}

                <Pressable onPress={handlePersonalSubmit} disabled={isSavingPersonal}>
                  <View style={[styles.submitBtn, { backgroundColor: theme.primary }]}>
                    {isSavingPersonal ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <ThemedText style={styles.submitBtnText}>Salvar Alterações</ThemedText>
                    )}
                  </View>
                </Pressable>
              </View>
            )}

            {/* Tab 2: Security Password Update */}
            {activeTab === 'security' && (
              <View style={styles.tabContainer}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    Segurança
                  </ThemedText>
                  <ThemedText style={styles.sectionDesc}>
                    Altere sua senha de acesso de forma segura.
                  </ThemedText>
                </View>

                {/* Form fields */}
                <View style={styles.formGroup}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Senha atual</ThemedText>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      placeholder="••••••••"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Nova senha</ThemedText>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      placeholder="Mínimo 8 caracteres"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                    <ThemedText style={styles.inputHint}>{PASSWORD_REQUIREMENTS_HINT}</ThemedText>
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Confirmar nova senha</ThemedText>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      placeholder="Confirme sua senha"
                      placeholderTextColor="#B37A5C"
                      style={styles.input}
                    />
                  </View>
                </View>

                {securityError && <ThemedText style={styles.errorText}>{securityError}</ThemedText>}
                {securitySuccess && (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                    <ThemedText style={styles.successText}>Senha atualizada com sucesso.</ThemedText>
                  </View>
                )}

                <Pressable onPress={handleSecuritySubmit} disabled={isSavingSecurity}>
                  <View style={[styles.submitBtn, { backgroundColor: theme.primary }]}>
                    {isSavingSecurity ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <ThemedText style={styles.submitBtnText}>Atualizar Senha</ThemedText>
                    )}
                  </View>
                </Pressable>
              </View>
            )}

            {/* Tab 3: Saved Addresses */}
            {activeTab === 'addresses' && (
              <View style={styles.tabContainer}>
                {/* Header with New Address Button */}
                <View style={styles.addressesHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={styles.sectionTitle}>
                      Endereços Salvos
                    </ThemedText>
                    <ThemedText style={styles.sectionDesc}>Cadastre seus locais de entrega padrão.</ThemedText>
                  </View>
                  <Pressable onPress={() => setShowAddressForm(!showAddressForm)}>
                    <View
                      style={[
                        styles.toggleFormBtn,
                        { backgroundColor: showAddressForm ? '#FEE2E2' : '#FFF3EB', borderColor: showAddressForm ? '#FCA5A5' : '#FFEAD9' },
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
                      <ThemedText style={styles.label}>Identificação (opcional)</ThemedText>
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
                        <ThemedText style={styles.label}>Rua</ThemedText>
                        <TextInput
                          value={addressForm.street}
                          onChangeText={(t) => setAddressForm((f) => ({ ...f, street: t }))}
                          placeholder="Nome da rua"
                          placeholderTextColor="#B37A5C"
                          style={styles.input}
                        />
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <ThemedText style={styles.label}>Número</ThemedText>
                        <TextInput
                          value={addressForm.number}
                          onChangeText={(t) => setAddressForm((f) => ({ ...f, number: t }))}
                          placeholder="Número"
                          placeholderTextColor="#B37A5C"
                          style={styles.input}
                        />
                      </View>
                    </View>

                    <View style={styles.field}>
                      <ThemedText style={styles.label}>Complemento (opcional)</ThemedText>
                      <TextInput
                        value={addressForm.complement}
                        onChangeText={(t) => setAddressForm((f) => ({ ...f, complement: t }))}
                        placeholder="Ex: Apto 101, Bloco B"
                        placeholderTextColor="#B37A5C"
                        style={styles.input}
                      />
                    </View>

                    <View style={styles.field}>
                      <ThemedText style={styles.label}>Bairro</ThemedText>
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
                        <ThemedText style={styles.label}>Cidade</ThemedText>
                        <TextInput
                          value={addressForm.city}
                          editable={false}
                          style={[styles.input, styles.disabledInput]}
                        />
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <ThemedText style={styles.label}>Estado</ThemedText>
                        <TextInput
                          value={addressForm.state}
                          editable={false}
                          style={[styles.input, styles.disabledInput]}
                        />
                      </View>
                    </View>

                    <View style={styles.field}>
                      <ThemedText style={styles.label}>CEP</ThemedText>
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

                    <Pressable
                      onPress={() => setAddressForm((f) => ({ ...f, isDefault: !f.isDefault }))}
                      style={styles.checkboxWrapper}
                    >
                      <View style={[styles.checkbox, addressForm.isDefault && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                        {addressForm.isDefault && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                      </View>
                      <ThemedText style={styles.checkboxLabel}>Definir como padrão</ThemedText>
                    </Pressable>

                    {addressFormError && <ThemedText style={styles.errorText}>{addressFormError}</ThemedText>}

                    <Pressable onPress={handleAddressSubmit} disabled={isSavingAddress}>
                      <View style={[styles.submitBtn, { backgroundColor: theme.primary }]}>
                        {isSavingAddress ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <ThemedText style={styles.submitBtnText}>Salvar Endereço</ThemedText>
                        )}
                      </View>
                    </Pressable>
                  </View>
                )}

                {/* Addresses List */}
                <View style={styles.addressesList}>
                  {addressError && <ThemedText style={styles.errorText}>{addressError}</ThemedText>}
                  {addresses === null && <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />}
                  {addresses?.length === 0 && (
                    <View style={styles.emptyCard}>
                      <Ionicons name="location-outline" size={24} color="#B37A5C" />
                      <ThemedText style={{ color: '#000000', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>
                        Nenhum endereço cadastrado
                      </ThemedText>
                      <ThemedText style={{ color: '#B37A5C', fontSize: 10, textAlign: 'center', marginTop: 2 }}>
                        Cadastre seus locais de entrega padrão tocando no botão Novo acima.
                      </ThemedText>
                    </View>
                  )}

                  {addresses?.map((address) => (
                    <View key={address.id} style={styles.addressItemCard}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }}>
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
                        <ThemedText style={styles.addressDetails}>
                          {address.street}, {address.number}
                          {address.complement ? ` - ${address.complement}` : ''}
                          {`\n`}{address.neighborhood} — {address.city}/{address.state} — {address.zipCode}
                        </ThemedText>
                      </View>

                      {/* Address Action buttons */}
                      <View style={styles.addressActions}>
                        {!address.isDefault && (
                          <Pressable onPress={() => handleSetDefaultAddress(address.id)} style={styles.actionBtn}>
                            <ThemedText style={[styles.actionBtnText, { color: theme.primary }]}>
                              Tornar padrão
                            </ThemedText>
                          </Pressable>
                        )}
                        <Pressable onPress={() => handleDeleteAddress(address.id)} style={[styles.actionBtn, { borderColor: '#FCA5A5' }]}>
                          <ThemedText style={[styles.actionBtnText, { color: theme.danger }]}>
                            Remover
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Logout Button */}
            <Pressable onPress={() => logout()}>
              <View style={[styles.logoutButton, { borderColor: theme.danger, marginTop: Spacing.four }]}>
                <ThemedText style={{ color: theme.danger, fontWeight: 'bold', fontSize: 14 }}>
                  Sair da Conta
                </ThemedText>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  userIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEAD9',
  },
  userInfoCol: {
    flex: 1,
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
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
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAD9',
    marginBottom: Spacing.three,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContainer: {
    gap: Spacing.three,
  },
  sectionHeader: {
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionDesc: {
    fontSize: 11,
    color: '#B37A5C',
    marginTop: 2,
  },
  formGroup: {
    gap: Spacing.three,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#FFF9F5',
    paddingHorizontal: Spacing.three,
    color: '#000000',
    fontSize: 13,
  },
  inputHint: {
    fontSize: 10,
    color: '#B37A5C',
    lineHeight: 14,
    marginTop: 2,
  },
  disabledInput: {
    backgroundColor: '#FFF3EB',
    color: '#B37A5C',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
  },
  successText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addressesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  toggleFormBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressFormBox: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rowFields: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFEAD9',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
  },
  addressesList: {
    gap: Spacing.two,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
  },
  addressItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  addressDetails: {
    fontSize: 11,
    color: '#B37A5C',
    lineHeight: 16,
    marginTop: 6,
  },
  addressActions: {
    flexDirection: 'column',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#ffffff',
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    width: '100%',
  },

  // Lojista Specific Styles
  gridMenu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  gridBtn: {
    width: '48%',
    height: 96,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  gridBtnLabel: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
  },
  subViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAD9',
    marginBottom: Spacing.three,
  },
  subViewTitle: {
    fontSize: 16,
    color: '#000000',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    color: '#FF6B00',
    marginTop: Spacing.three,
    marginBottom: Spacing.half,
  },
  dropdownTrigger: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#FFF9F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  dropdownTriggerSmall: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#FFF9F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  businessHoursRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  modalTitle: {
    fontSize: 15,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeOptionBtn: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAD9',
    alignItems: 'center',
  },
  modalCloseBtn: {
    marginTop: Spacing.two,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3EB',
    borderRadius: 10,
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  productThumbFallback: {
    backgroundColor: '#FFF3EB',
    alignItems: 'center',
    justifyContent: 'center',
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
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  replyBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3EB',
    borderRadius: 8,
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  replyInput: {
    height: 36,
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  statCard: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
  },
  statLabel: {
    fontSize: 11,
    color: '#B37A5C',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
