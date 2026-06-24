import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Store, Product, Category, PetType, Address } from '@petdots/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { formatCurrency, getEffectiveUnitPrice, hasActiveDiscount } from '@/lib/pricing';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - Spacing.three * 2;

const CAROUSEL_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop',
    title: 'Tudo para o seu Pet',
    description: 'Brinquedos, rações premium e acessórios exclusivos.',
  },
  {
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=600&auto=format&fit=crop',
    title: 'Acessórios & Conforto',
    description: 'Encontre camas aconchegantes e brinquedos interativos.',
  },
  {
    image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=600&auto=format&fit=crop',
    title: 'Entrega no Mesmo Dia',
    description: 'Receba tudo em poucas horas na sua residência.',
  },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  'Rações': '🥩',
  'Brinquedos': '🧸',
  'Acessórios': '👕',
  'Higiene': '🧼',
  'Saúde': '💊',
  'Serviços': '✂️',
  'Medicamentos': '💊',
  'Camas': '🛏️',
  'Petiscos': '🍖',
  'Gatos': '🐱',
  'Cães': '🐶',
};

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();

  // Primary states
  const [stores, setStores] = useState<Store[] | null>(null);
  const [allProducts, setAllProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [petTypes, setPetTypes] = useState<PetType[] | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPetType, setSelectedPetType] = useState('');

  // UI state
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [filteredStores, setFilteredStores] = useState<Store[] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const bannerFlatListRef = useRef<FlatList>(null);

  const hasActiveFilter = !!(debouncedSearch || selectedCategory || selectedPetType);

  // Load initial dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storesData, productsRes, categoriesData, petTypesData] = await Promise.all([
          apiClient.listStores(),
          apiClient.listProducts({ pageSize: 100 }),
          apiClient.listCategories(),
          apiClient.listPetTypes(),
        ]);
        setStores(storesData);
        setAllProducts(productsRes.items);
        setCategories(categoriesData);
        setPetTypes(petTypesData);
      } catch {
        setError('Não foi possível carregar as informações do marketplace.');
      }
    };
    loadData();
  }, []);

  // Fetch addresses when user logs in
  useEffect(() => {
    if (user) {
      apiClient.listAddresses()
        .then((data) => {
          setAddresses(data);
          const def = data.find((a) => a.isDefault) || data[0] || null;
          setDefaultAddress(def);
        })
        .catch(() => {});
    } else {
      // Wrap in a Promise to avoid synchronous setState inside render effect warning
      Promise.resolve().then(() => {
        setAddresses((prev) => prev.length > 0 ? [] : prev);
        setDefaultAddress((prev) => prev !== null ? null : prev);
      });
    }
  }, [user]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle auto slide for promotions banner
  useEffect(() => {
    if (hasActiveFilter) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % CAROUSEL_SLIDES.length;
        bannerFlatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [debouncedSearch, selectedCategory, selectedPetType, hasActiveFilter]);

  // Search effect
  useEffect(() => {
    if (!hasActiveFilter) {
      // Wrap in a Promise to avoid synchronous setState inside render effect warning
      Promise.resolve().then(() => {
        setSearchResults((prev) => prev !== null ? null : prev);
        setFilteredStores((prev) => prev !== null ? null : prev);
      });
      return;
    }

    Promise.resolve().then(() => {
      setIsSearching((prev) => !prev ? true : prev);
    });
    const fetchFilteredData = async () => {
      try {
        const queryParams: any = {};
        if (debouncedSearch) queryParams.search = debouncedSearch;
        if (selectedCategory) queryParams.categoryId = selectedCategory;
        if (selectedPetType) queryParams.petTypeId = selectedPetType;

        const [productsRes, storesData] = await Promise.all([
          apiClient.listProducts({ ...queryParams, pageSize: 100 }),
          apiClient.listStores(),
        ]);

        setSearchResults(productsRes.items);

        if (debouncedSearch) {
          const term = debouncedSearch.toLowerCase();
          setFilteredStores(
            storesData.filter(
              (s) =>
                s.name.toLowerCase().includes(term) ||
                (s.description && s.description.toLowerCase().includes(term))
            )
          );
        } else {
          setFilteredStores(storesData);
        }
      } catch {
        setError('Não foi possível realizar a busca no momento.');
      } finally {
        setIsSearching(false);
      }
    };

    fetchFilteredData();
  }, [debouncedSearch, selectedCategory, selectedPetType, hasActiveFilter]);

  const handleAddToCart = async (product: Product) => {
    const storeName = product.store?.name || 'Petshop';
    const added = await addItem(product, { id: product.storeId, name: storeName });
    if (added) {
      setFeedback(`"${product.name}" adicionado!`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleLocationPress = () => {
    if (!user) {
      Alert.alert('Entrar', 'Faça login para gerenciar seus endereços de entrega.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (addresses.length === 0) {
      Alert.alert('Nenhum endereço', 'Você não tem endereços cadastrados. Acesse a versão web para adicionar.');
      return;
    }

    Alert.alert(
      'Seus Endereços',
      'Endereço atual selecionado para entrega:\n\n' +
        (defaultAddress
          ? `${defaultAddress.street}, ${defaultAddress.number} - ${defaultAddress.neighborhood}`
          : 'Nenhum endereço selecionado.'),
      [{ text: 'OK' }]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('');
    setSelectedPetType('');
  };

  // Memoized filters for the dashboard view
  const productsOnSale = useMemo(() => {
    if (!allProducts) return [];
    return allProducts.filter((p) => hasActiveDiscount(p)).slice(0, 8);
  }, [allProducts]);

  const productsFeatured = useMemo(() => {
    if (!allProducts) return [];
    return [...allProducts]
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 6);
  }, [allProducts]);

  return (
    <ThemedView type="primary" style={styles.container}>
      {/* Toast Feedback */}
      {feedback && (
        <View style={[styles.feedbackToast, { backgroundColor: '#802E00' }]}>
          <ThemedText style={styles.feedbackText}>{feedback}</ThemedText>
        </View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <ThemedText style={[styles.headerGreeting, { color: '#ffffff' }]}>
              {user ? `Olá, ${user.name.split(' ')[0]}! 🐾` : 'Seja bem-vindo! 🐾'}
            </ThemedText>
            <Pressable onPress={handleLocationPress} style={styles.headerLocation}>
              <Ionicons name="location" size={14} color={theme.primary} />
              <ThemedText style={[styles.locationText, { color: theme.primary }]} numberOfLines={1}>
                {defaultAddress
                  ? `${defaultAddress.street}, ${defaultAddress.number}`
                  : 'Selecionar endereço...'}
              </ThemedText>
              <Ionicons name="chevron-down" size={12} color={theme.primary} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/account')}
            style={[styles.avatarButton, { backgroundColor: '#ffffff' }]}
          >
            <ThemedText style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>
              {user ? user.name.charAt(0).toUpperCase() : '👤'}
            </ThemedText>
          </Pressable>
        </View>

        {/* White Content Body Panel */}
        <View style={styles.contentBody}>
          {/* Search Bar Container */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: '#FFF3EB', borderColor: '#FFEAD9', borderWidth: 1 }]}>
              <Ionicons name="search" size={20} color={theme.primary} />
              <TextInput
                placeholder="Buscar petshops, ração, brinquedos..."
                placeholderTextColor="#B37A5C"
                style={[styles.searchInput, { color: '#802E00' }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#B37A5C" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Error Alert Container */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: '#FFEAD9', borderColor: '#FFEAD9', borderWidth: 1 }]}>
              <ThemedText style={{ color: theme.danger, fontSize: 12, fontWeight: 'bold', flex: 1 }}>{error}</ThemedText>
              <Pressable onPress={() => setError(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={16} color={theme.danger} />
              </Pressable>
            </View>
          )}

          {/* MAIN SCROLL AREA */}
          {hasActiveFilter ? (
            /* SEARCH RESULTS VIEW */
            <ScrollView contentContainerStyle={{ paddingBottom: Spacing.five }}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionTitleIndicator, { backgroundColor: theme.primary }]} />
                  <View>
                    <ThemedText style={styles.sectionTitle}>Resultados da Busca</ThemedText>
                    <ThemedText type="small" style={{ color: '#B37A5C', fontSize: 11 }}>
                      Filtros ativos:{selectedCategory && ` ${categories?.find(c => c.id === selectedCategory)?.name}`}
                      {selectedPetType && ` ${petTypes?.find(p => p.id === selectedPetType)?.name}`}
                      {debouncedSearch && ` • "${debouncedSearch}"`}
                    </ThemedText>
                  </View>
                </View>
                <Pressable onPress={clearFilters}>
                  <ThemedText style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, textDecorationLine: 'underline' }}>
                    Limpar
                  </ThemedText>
                </Pressable>
              </View>

              {isSearching ? (
                <View style={{ paddingVertical: Spacing.five }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : (
                <View style={{ gap: Spacing.four }}>
                  {/* Products Result */}
                  <View>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <View style={[styles.sectionTitleIndicator, { backgroundColor: theme.primary }]} />
                        <ThemedText style={[styles.sectionTitle, { fontSize: 15 }]}>Produtos Encontrados</ThemedText>
                      </View>
                    </View>
                    {!searchResults || searchResults.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <ThemedText style={styles.emptyTitle}>Nenhum produto</ThemedText>
                        <ThemedText style={[styles.emptyText, { color: '#B37A5C', fontSize: 11, textAlign: 'center', marginTop: 4 }]}>
                          Não encontramos produtos para os termos buscados.
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={styles.gridContainer}>
                        {searchResults.map((product) => (
                          <View
                            key={product.id}
                            style={styles.gridCard}
                          >
                            <Pressable onPress={() => router.push(`/products/${product.id}` as any)}>
                              {product.images && product.images[0]?.url ? (
                                <Image source={{ uri: product.images[0].url }} style={styles.gridImage} />
                              ) : (
                                <View style={[styles.gridImageFallback, { backgroundColor: '#FFEAD9' }]}>
                                  <ThemedText style={{ fontSize: 24 }}>🐾</ThemedText>
                                </View>
                              )}
                            </Pressable>

                            {hasActiveDiscount(product) && (
                              <View style={styles.discountBadge}>
                                <ThemedText style={styles.discountText}>% OFF</ThemedText>
                              </View>
                            )}

                            <ThemedText style={[styles.productTitle, { color: '#802E00' }]} numberOfLines={1}>
                              {product.name}
                            </ThemedText>
                            {product.store && (
                              <ThemedText style={[styles.productStore, { color: '#B37A5C' }]} numberOfLines={1}>
                                {product.store.name}
                              </ThemedText>
                            )}

                            <View style={styles.priceRow}>
                              <View style={styles.priceContainer}>
                                {hasActiveDiscount(product) && (
                                  <ThemedText style={[styles.originalPrice, { color: '#B37A5C' }]}>
                                    {formatCurrency(Number(product.price))}
                                  </ThemedText>
                                )}
                                <ThemedText style={[styles.promoPrice, { color: theme.primary }]}>
                                  {formatCurrency(getEffectiveUnitPrice(product))}
                                </ThemedText>
                              </View>
                              <Pressable
                                onPress={() => handleAddToCart(product)}
                                style={[styles.addButton, { backgroundColor: theme.primary }]}
                              >
                                <Ionicons name="add" size={18} color="#ffffff" />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Stores Result */}
                  <View style={{ marginBottom: Spacing.four }}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <View style={[styles.sectionTitleIndicator, { backgroundColor: theme.primary }]} />
                        <ThemedText style={[styles.sectionTitle, { fontSize: 15 }]}>Petshops Encontrados</ThemedText>
                      </View>
                    </View>
                    {!filteredStores || filteredStores.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <ThemedText style={styles.emptyTitle}>Nenhum petshop</ThemedText>
                        <ThemedText style={[styles.emptyText, { color: '#B37A5C', fontSize: 11, textAlign: 'center', marginTop: 4 }]}>
                          Nenhum petshop corresponde ao termo digitado.
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={{ paddingHorizontal: Spacing.three, gap: Spacing.two }}>
                        {filteredStores.map((store) => (
                          <Pressable key={store.id} onPress={() => router.push(`/stores/${store.id}`)}>
                            <View style={styles.storeRowCard}>
                              {store.logoUrl ? (
                                <Image source={{ uri: store.logoUrl }} style={styles.storeLogo} />
                              ) : (
                                <View style={[styles.storeLogoFallback, { backgroundColor: theme.primaryMuted }]}>
                                  <ThemedText style={{ fontSize: 18 }}>🐾</ThemedText>
                                </View>
                              )}
                              <View style={styles.storeInfo}>
                                <ThemedText style={[styles.storeName, { color: '#802E00' }]}>{store.name}</ThemedText>
                                <View style={[styles.storeRating, { backgroundColor: theme.primaryMuted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 }]}>
                                  <Ionicons name="star" size={12} color="#fbbf24" />
                                  <ThemedText style={[styles.storeRatingText, { color: theme.primary, fontWeight: 'bold' }]}>
                                    {store.avgRating.toFixed(1)} ({store.reviewCount} avaliações)
                                  </ThemedText>
                                </View>
                                {store.distanceKm !== undefined && (
                                  <ThemedText style={[styles.storeDistance, { color: '#802E00' }]} type="smallBold">
                                    {store.distanceKm.toFixed(1)} km de você
                                  </ThemedText>
                                )}
                              </View>
                              <Ionicons name="chevron-forward" size={18} color="#802E00" />
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            /* STANDARD DASHBOARD VIEW */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.five }}>
              {/* Promo Banner Slider */}
              <View style={styles.bannerContainer}>
                <FlatList
                  ref={bannerFlatListRef}
                  data={CAROUSEL_SLIDES}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: BANNER_WIDTH, offset: BANNER_WIDTH * index, index })}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setActiveBannerIndex(index);
                  }}
                  renderItem={({ item }) => (
                    <View style={[styles.bannerWrapper, { width: BANNER_WIDTH }]}>
                      <Image source={{ uri: item.image }} style={styles.bannerImage} />
                      <View style={styles.bannerOverlay}>
                        <ThemedText style={styles.bannerTitle}>{item.title}</ThemedText>
                        <ThemedText style={styles.bannerDesc}>{item.description}</ThemedText>
                      </View>
                    </View>
                  )}
                  keyExtractor={(_, index) => index.toString()}
                />
                <View style={styles.dotContainer}>
                  {CAROUSEL_SLIDES.map((_, index) => {
                    const isActive = index === activeBannerIndex;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          {
                            width: isActive ? 16 : 6,
                            backgroundColor: isActive ? theme.primary : 'rgba(255, 107, 0, 0.3)',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Dynamic Categories Section */}
              <View style={styles.categoriesContainer}>
                <View style={{ marginBottom: Spacing.two }}>
                  <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: '#000000' }}>Categorias</ThemedText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Pressable
                    onPress={() => setSelectedCategory('')}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: selectedCategory === '' ? theme.primary : '#FFF3EB',
                        borderColor: selectedCategory === '' ? theme.primary : '#FFEAD9',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <ThemedText style={styles.categoryEmoji}>🐾</ThemedText>
                    <ThemedText style={[styles.categoryText, { color: selectedCategory === '' ? '#ffffff' : '#802E00' }]} numberOfLines={1}>
                      Todas
                    </ThemedText>
                  </Pressable>

                  {categories?.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const emoji = CATEGORY_EMOJIS[cat.name] || '🐾';
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategory(cat.id)}
                        style={[
                          styles.categoryCard,
                          {
                            backgroundColor: isSelected ? theme.primary : '#FFF3EB',
                            borderColor: isSelected ? theme.primary : '#FFEAD9',
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <ThemedText style={styles.categoryEmoji}>{emoji}</ThemedText>
                        <ThemedText style={[styles.categoryText, { color: isSelected ? '#ffffff' : '#802E00' }]} numberOfLines={1}>
                          {cat.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Pet Types Filter Section */}
              {petTypes && petTypes.length > 0 && (
                <View style={styles.categoriesContainer}>
                  <View style={{ marginBottom: Spacing.two }}>
                    <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: '#000000' }}>Por Pet</ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Pressable
                      onPress={() => setSelectedPetType('')}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: selectedPetType === '' ? theme.primary : '#FFF3EB',
                          borderColor: selectedPetType === '' ? theme.primary : '#FFEAD9',
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <ThemedText style={[styles.categoryText, { color: selectedPetType === '' ? '#ffffff' : '#802E00' }]} numberOfLines={1}>
                        Todos
                      </ThemedText>
                    </Pressable>

                    {petTypes.map((pt) => {
                      const isSelected = selectedPetType === pt.id;
                      return (
                        <Pressable
                          key={pt.id}
                          onPress={() => setSelectedPetType(pt.id)}
                          style={[
                            styles.categoryCard,
                            {
                              backgroundColor: isSelected ? theme.primary : '#FFF3EB',
                              borderColor: isSelected ? theme.primary : '#FFEAD9',
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <ThemedText style={[styles.categoryText, { color: isSelected ? '#ffffff' : '#802E00' }]} numberOfLines={1}>
                            {pt.name}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Featured Stores Section */}
              <View>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionTitleIndicator, { backgroundColor: theme.primary }]} />
                    <ThemedText style={styles.sectionTitle}>Petshops em Destaque</ThemedText>
                  </View>
                  <Pressable onPress={() => router.push('/stores/[id]' as any)}>
                    <ThemedText style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                      Ver mais
                    </ThemedText>
                  </Pressable>
                </View>
                {stores === null ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: Spacing.three }} />
                ) : stores.length === 0 ? (
                  <ThemedText style={{ paddingLeft: Spacing.three, color: '#802E00' }}>
                    Nenhuma loja disponível.
                  </ThemedText>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  >
                    {stores.map((store) => (
                      <Pressable key={store.id} onPress={() => router.push(`/stores/${store.id}`)}>
                        <View style={styles.storeCard}>
                          {store.logoUrl ? (
                            <Image source={{ uri: store.logoUrl }} style={styles.storeLogo} />
                          ) : (
                            <View style={[styles.storeLogoFallback, { backgroundColor: theme.primaryMuted }]}>
                              <ThemedText style={{ fontSize: 18 }}>🐾</ThemedText>
                            </View>
                          )}
                          <View style={styles.storeInfo}>
                            <ThemedText style={[styles.storeName, { color: '#802E00' }]} numberOfLines={1}>{store.name}</ThemedText>
                            <View style={[styles.storeRating, { backgroundColor: theme.primaryMuted + '25', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 }]}>
                              <Ionicons name="star" size={12} color="#fbbf24" />
                              <ThemedText style={[styles.storeRatingText, { color: theme.primary, fontWeight: 'bold' }]}>
                                {store.avgRating.toFixed(1)}
                              </ThemedText>
                            </View>
                            {store.distanceKm !== undefined && (
                              <ThemedText style={[styles.storeDistance, { color: '#B37A5C' }]}>
                                {store.distanceKm.toFixed(1)} km
                              </ThemedText>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Special Offers Section */}
              {productsOnSale.length > 0 && (
                <View>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <View style={[styles.sectionTitleIndicator, { backgroundColor: theme.primary }]} />
                      <ThemedText style={styles.sectionTitle}>🔥 Ofertas Imperdíveis</ThemedText>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  >
                    {productsOnSale.map((product) => (
                      <View
                        key={product.id}
                        style={styles.productCard}
                      >
                        <Pressable onPress={() => router.push(`/products/${product.id}` as any)}>
                          {product.images && product.images[0]?.url ? (
                            <Image source={{ uri: product.images[0].url }} style={styles.productImage} />
                          ) : (
                            <View style={[styles.productImageFallback, { backgroundColor: '#f0f0f0' }]}>
                              <ThemedText style={{ fontSize: 20 }}>🐾</ThemedText>
                            </View>
                          )}
                        </Pressable>

                        <View style={styles.discountBadge}>
                          <ThemedText style={styles.discountText}>% OFF</ThemedText>
                        </View>

                        <ThemedText style={[styles.productTitle, { color: '#802E00' }]} numberOfLines={1}>
                          {product.name}
                        </ThemedText>
                        {product.store && (
                          <ThemedText style={[styles.productStore, { color: '#B37A5C' }]} numberOfLines={1}>
                            {product.store.name}
                          </ThemedText>
                        )}

                        <View style={styles.priceRow}>
                          <View style={styles.priceContainer}>
                            <ThemedText style={[styles.originalPrice, { color: '#B37A5C' }]}>
                              {formatCurrency(Number(product.price))}
                            </ThemedText>
                            <ThemedText style={[styles.promoPrice, { color: theme.primary }]}>
                              {formatCurrency(getEffectiveUnitPrice(product))}
                            </ThemedText>
                          </View>
                          <Pressable
                            onPress={() => handleAddToCart(product)}
                            style={[styles.addButton, { backgroundColor: theme.primary }]}
                          >
                            <Ionicons name="add" size={16} color="#ffffff" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Featured Products Section (Grid) */}
              {productsFeatured.length > 0 && (
                <View>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <View style={[styles.sectionTitleIndicator, { backgroundColor: theme.primary }]} />
                      <ThemedText style={styles.sectionTitle}>Produtos Populares</ThemedText>
                    </View>
                  </View>
                  <View style={styles.gridContainer}>
                    {productsFeatured.map((product) => (
                      <View
                        key={product.id}
                        style={styles.gridCard}
                      >
                        <Pressable onPress={() => router.push(`/products/${product.id}` as any)}>
                          {product.images && product.images[0]?.url ? (
                            <Image source={{ uri: product.images[0].url }} style={styles.gridImage} />
                          ) : (
                            <View style={[styles.gridImageFallback, { backgroundColor: '#f0f0f0' }]}>
                              <ThemedText style={{ fontSize: 24 }}>🐾</ThemedText>
                            </View>
                          )}
                        </Pressable>

                        {hasActiveDiscount(product) && (
                          <View style={styles.discountBadge}>
                            <ThemedText style={styles.discountText}>% OFF</ThemedText>
                          </View>
                        )}

                        <ThemedText style={[styles.productTitle, { color: '#802E00' }]} numberOfLines={1}>
                          {product.name}
                        </ThemedText>
                        {product.store && (
                          <ThemedText style={[styles.productStore, { color: '#B37A5C' }]} numberOfLines={1}>
                            {product.store.name}
                          </ThemedText>
                        )}

                        <View style={styles.priceRow}>
                          <View style={styles.priceContainer}>
                            {hasActiveDiscount(product) && (
                              <ThemedText style={[styles.originalPrice, { color: '#B37A5C' }]}>
                                {formatCurrency(Number(product.price))}
                              </ThemedText>
                            )}
                            <ThemedText style={[styles.promoPrice, { color: theme.primary }]}>
                              {formatCurrency(getEffectiveUnitPrice(product))}
                            </ThemedText>
                          </View>
                          <Pressable
                            onPress={() => handleAddToCart(product)}
                            style={[styles.addButton, { backgroundColor: theme.primary }]}
                          >
                            <Ionicons name="add" size={16} color="#ffffff" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerGreeting: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 2,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  locationText: {
    fontSize: 13,
    fontWeight: 'bold',
    maxWidth: 220,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  searchContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: Spacing.three,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: Spacing.two,
    fontSize: 14,
    paddingVertical: 0,
  },
  petChipsContainer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  petChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    marginRight: Spacing.two,
  },
  petChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  categoryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
    borderRadius: 16,
    marginRight: Spacing.two,
    width: 76,
    height: 76,
  },
  categoryEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  bannerContainer: {
    marginVertical: Spacing.two,
  },
  bannerWrapper: {
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: Spacing.three,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: Spacing.three,
    justifyContent: 'center',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bannerDesc: {
    color: '#e0e0e0',
    fontSize: 11,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitleIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  horizontalList: {
    paddingLeft: Spacing.three,
    paddingBottom: Spacing.two,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: Spacing.three,
    marginRight: Spacing.three,
    width: 220,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.two,
  },
  storeLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  storeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  storeRatingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  storeDistance: {
    fontSize: 10,
    marginTop: 2,
  },
  storeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: Spacing.three,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  productCard: {
    borderRadius: 16,
    padding: Spacing.two,
    marginRight: Spacing.three,
    width: 140,
    position: 'relative',
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
  },
  productImageFallback: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: '#dc2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    zIndex: 10,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  productTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: Spacing.one,
  },
  productStore: {
    fontSize: 9,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  priceContainer: {
    flex: 1,
  },
  originalPrice: {
    fontSize: 9,
    textDecorationLine: 'line-through',
  },
  promoPrice: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  gridCard: {
    borderRadius: 16,
    padding: Spacing.two,
    width: '48%',
    marginBottom: Spacing.two,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  gridImage: {
    width: '100%',
    height: 110,
    borderRadius: 12,
  },
  gridImageFallback: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackToast: {
    position: 'absolute',
    top: 50,
    left: Spacing.four,
    right: Spacing.four,
    padding: Spacing.two,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  feedbackText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    borderRadius: 16,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#802E00',
  },
  emptyText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
});
