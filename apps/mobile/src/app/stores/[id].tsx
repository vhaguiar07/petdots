import { useEffect, useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { Product, Store, Promotion, StoreReview } from '@petdots/shared';
import { ApiError } from '@petdots/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, getEffectiveUnitPrice, hasActiveDiscount } from '@/lib/pricing';
import { BUSINESS_HOURS_GROUPS, formatDaySchedule } from '@/lib/business-hours';

export default function StoreCatalogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { addItem } = useCart();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [highlightedCoupon, setHighlightedCoupon] = useState<Promotion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'about'>('products');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedLocalCategory, setSelectedLocalCategory] = useState('all');

  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittedReview, setSubmittedReview] = useState<string | null>(null);

  // Copy Coupon State
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.getStore(id),
      apiClient.listProducts({ storeId: id, pageSize: 100 }),
      apiClient.listStoreReviews(id),
      apiClient.getHighlightedCoupon(id).catch(() => null),
    ])
      .then(([storeData, productsData, reviewsData, couponData]) => {
        setStore(storeData);
        setProducts(productsData.items);
        setReviews(reviewsData);
        setHighlightedCoupon(couponData);
      })
      .catch(() => setError('Não foi possível carregar os detalhes deste petshop.'));
  }, [id]);

  const handleAddToCart = async (product: Product) => {
    if (!store) return;
    const added = await addItem(product, { id: store.id, name: store.name });
    if (added) {
      setFeedback(`"${product.name}" adicionado!`);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const copyCoupon = async () => {
    if (!highlightedCoupon?.code) return;
    await Clipboard.setStringAsync(highlightedCoupon.code);
    setCopied(true);
    setFeedback('Cupom copiado!');
    setTimeout(() => {
      setCopied(false);
      setFeedback(null);
    }, 2000);
  };

  const isStoreOpen = useMemo(() => {
    if (!store?.businessHours) return false;
    const now = new Date();
    const day = now.getDay(); // 0 Sunday, 1-5 weekdays, 6 Saturday
    let schedule = null;
    if (day === 0) {
      schedule = store.businessHours.sunday;
    } else if (day === 6) {
      schedule = store.businessHours.saturday;
    } else {
      schedule = store.businessHours.weekdays;
    }
    if (!schedule) return false;

    const [openH, openM] = schedule.open.split(':').map(Number);
    const [closeH, closeM] = schedule.close.split(':').map(Number);

    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    const currentTime = currentH * 60 + currentM;

    return currentTime >= openTime && currentTime <= closeTime;
  }, [store]);

  const myReview = useMemo(() => {
    if (!user || !reviews) return null;
    return reviews.find((r) => r.customerId === user.id) ?? null;
  }, [user, reviews]);

  const handleOpenReviewModal = () => {
    setRating(myReview?.rating ?? 5);
    setComment(myReview?.comment ?? '');
    setReviewError(null);
    setSubmittedReview(null);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async () => {
    setReviewError(null);
    setIsSubmittingReview(true);
    try {
      const updated = await apiClient.upsertStoreReview(id, { rating, comment: comment || undefined });
      setReviews((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)]);
      const refreshedStore = await apiClient.getStore(id);
      setStore(refreshedStore);
      setSubmittedReview('Sua avaliação foi enviada com sucesso!');
      setTimeout(() => {
        setShowReviewModal(false);
        setSubmittedReview(null);
      }, 2000);
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : 'Não foi possível enviar sua avaliação.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const representedCategories = useMemo(() => {
    if (!products) return [];
    const map = new Map();
    products.forEach((p) => {
      if (p.category) {
        map.set(p.category.id, p.category);
      }
    });
    return Array.from(map.values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(localSearch.toLowerCase()));
      const matchesCategory =
        selectedLocalCategory === 'all' || p.categoryId === selectedLocalCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, localSearch, selectedLocalCategory]);

  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: { name: string; list: Product[] } } = {};
    filteredProducts.forEach((p) => {
      const catId = p.categoryId || 'uncategorized';
      const catName = p.category?.name || 'Sem Categoria';
      if (!groups[catId]) {
        groups[catId] = { name: catName, list: [] };
      }
      groups[catId].list.push(p);
    });
    return groups;
  }, [filteredProducts]);

  if (error) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ThemedText style={{ color: theme.danger, textAlign: 'center', paddingHorizontal: Spacing.four }}>
          {error}
        </ThemedText>
        <Pressable onPress={() => router.back()} style={[styles.backTextButton, { borderColor: theme.primary }]}>
          <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>Voltar</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!store || !products) {
    return (
      <ThemedView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ color: '#802E00', marginTop: Spacing.three }}>Carregando petshop...</ThemedText>
      </ThemedView>
    );
  }

  const coverBanner = store.coverUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=600&auto=format&fit=crop';
  const profileAvatar = store.logoUrl || '';

  return (
    <View style={styles.container}>
      {/* Toast Feedback */}
      {feedback && (
        <View style={styles.feedbackToast}>
          <ThemedText style={styles.feedbackText}>{feedback}</ThemedText>
        </View>
      )}

      {/* 1. Floating Back Button (Fixed at the top) */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.floatingBackButton, { top: Math.max(insets.top, 12) }]}
      >
        <Ionicons name="arrow-back" size={22} color={theme.primary} />
      </Pressable>

      {/* 2. Scrollable Body Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover Photo inside ScrollView */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: coverBanner }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.coverOverlay} />
        </View>

        {/* Identity & Main Info Card (overlapping the cover) */}
        <View style={styles.identityCard}>
          {/* Avatar Container */}
          <View style={styles.avatarWrapper}>
            {profileAvatar ? (
              <Image source={{ uri: profileAvatar }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: '#FFEAD9' }]}>
                <ThemedText style={{ fontSize: 32 }}>🐾</ThemedText>
              </View>
            )}
          </View>

          {/* Name & Quick Metadata */}
          <ThemedText style={styles.storeNameText}>{store.name}</ThemedText>

          {/* Status Badges & Rating */}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isStoreOpen ? '#D1FAE5' : '#FEE2E2' },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: isStoreOpen ? '#065F46' : '#991B1B', fontSize: 10 }}
              >
                {isStoreOpen ? 'ABERTO AGORA' : 'FECHADO'}
              </ThemedText>
            </View>

            {store.deliveryProvider === 'SELF' && (
              <View style={[styles.statusBadge, { backgroundColor: '#FFE4D1' }]}>
                <ThemedText type="smallBold" style={{ color: '#802E00', fontSize: 10 }}>
                  🚚 ENTREGA RÁPIDA
                </ThemedText>
              </View>
            )}

            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 12 }}>
                {store.avgRating.toFixed(1)} ({store.reviewCount})
              </ThemedText>
            </View>
          </View>
        </View>

        {/* White Main Panel */}
        <View style={styles.mainWhitePanel}>
          {/* Premium Tab Bar Selector */}
          <View style={styles.tabSelectorRow}>
            {(['products', 'reviews', 'about'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const labels = {
                products: `Produtos (${products.length})`,
                reviews: `Avaliações (${store.reviewCount})`,
                about: 'Sobre a Loja',
              };
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabButton,
                    isActive && { borderBottomColor: theme.primary },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: isActive ? theme.primary : '#B37A5C',
                      fontSize: 13,
                    }}
                  >
                    {labels[tab]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Tab 1: Products */}
          {activeTab === 'products' && (
            <View style={styles.tabContentContainer}>
              {/* Coupon Highlight */}
              {highlightedCoupon && (
                <Pressable onPress={copyCoupon} style={styles.couponContainer}>
                  <View style={styles.couponTextCol}>
                    <View style={styles.couponTag}>
                      <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 8 }}>
                        CUPOM DISPONÍVEL
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" style={{ color: '#802E00', marginTop: 4 }}>
                      {highlightedCoupon.name}
                    </ThemedText>
                    <ThemedText style={{ color: '#B37A5C', fontSize: 10, marginTop: 2 }}>
                      Toque para copiar e aplicar no carrinho
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.couponCodePill,
                      {
                        backgroundColor: copied ? '#D1FAE5' : '#FFEAD9',
                        borderColor: copied ? '#065F46' : '#FF6B00',
                      },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: copied ? '#065F46' : '#FF6B00', fontSize: 12 }}
                    >
                      {copied ? 'Copiado!' : highlightedCoupon.code}
                    </ThemedText>
                  </View>
                </Pressable>
              )}

              {/* Local Search */}
              <View style={[styles.searchBar, { backgroundColor: '#FFF3EB', borderColor: '#FFEAD9' }]}>
                <Ionicons name="search" size={18} color={theme.primary} />
                <TextInput
                  placeholder="Pesquisar nos produtos desta loja..."
                  placeholderTextColor="#B37A5C"
                  style={[styles.searchInput, { color: '#802E00' }]}
                  value={localSearch}
                  onChangeText={setLocalSearch}
                  autoCorrect={false}
                />
                {localSearch.length > 0 && (
                  <Pressable onPress={() => setLocalSearch('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={18} color="#B37A5C" />
                  </Pressable>
                )}
              </View>

              {/* Category Pills */}
              {representedCategories.length > 0 && (
                <View style={styles.categoryPillsWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Pressable
                      onPress={() => setSelectedLocalCategory('all')}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: selectedLocalCategory === 'all' ? theme.primary : '#FFF3EB',
                          borderColor: selectedLocalCategory === 'all' ? theme.primary : '#FFEAD9',
                        },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: selectedLocalCategory === 'all' ? '#ffffff' : '#802E00',
                          fontSize: 11,
                        }}
                      >
                        Todos
                      </ThemedText>
                    </Pressable>
                    {representedCategories.map((cat) => (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedLocalCategory(cat.id)}
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: selectedLocalCategory === cat.id ? theme.primary : '#FFF3EB',
                            borderColor: selectedLocalCategory === cat.id ? theme.primary : '#FFEAD9',
                          },
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: selectedLocalCategory === cat.id ? '#ffffff' : '#802E00',
                            fontSize: 11,
                          }}
                        >
                          {cat.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Product List */}
              {filteredProducts.length === 0 ? (
                <View style={styles.emptyResultsWrapper}>
                  <Ionicons name="basket-outline" size={44} color="#B37A5C" />
                  <ThemedText style={{ color: '#802E00', fontWeight: 'bold', marginTop: Spacing.two }}>
                    Nenhum produto correspondente
                  </ThemedText>
                  <ThemedText style={{ color: '#B37A5C', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    Tente digitar outro termo ou limpar os filtros de busca.
                  </ThemedText>
                </View>
              ) : (
                <View style={{ gap: Spacing.four }}>
                  {selectedLocalCategory === 'all' ? (
                    // Grouped listing
                    Object.keys(groupedProducts).map((catId) => {
                      const group = groupedProducts[catId];
                      return (
                        <View key={catId} style={styles.categoryGroupContainer}>
                          <View style={styles.groupHeaderRow}>
                            <View style={[styles.headerIndicator, { backgroundColor: theme.primary }]} />
                            <ThemedText style={styles.groupHeaderTitle}>{group.name}</ThemedText>
                            <View style={styles.groupCountBadge}>
                              <ThemedText style={{ color: '#802E00', fontSize: 9, fontWeight: 'bold' }}>
                                {group.list.length}
                              </ThemedText>
                            </View>
                          </View>

                          <View style={{ gap: Spacing.two }}>
                            {group.list.map((product) => (
                              <ProductRowCard
                                key={product.id}
                                product={product}
                                theme={theme}
                                onAdd={() => handleAddToCart(product)}
                              />
                            ))}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    // Plain grid/list
                    <View style={{ gap: Spacing.two }}>
                      {filteredProducts.map((product) => (
                        <ProductRowCard
                          key={product.id}
                          product={product}
                          theme={theme}
                          onAdd={() => handleAddToCart(product)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Tab 2: Reviews */}
          {activeTab === 'reviews' && (
            <View style={styles.tabContentContainer}>
              {/* Rating Distribution Card */}
              <View style={styles.distributionCard}>
                <View style={styles.averageColumn}>
                  <ThemedText style={styles.hugeRatingText}>{store.avgRating.toFixed(1)}</ThemedText>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= Math.round(store.avgRating) ? 'star' : 'star-outline'}
                        size={14}
                        color="#fbbf24"
                      />
                    ))}
                  </View>
                  <ThemedText style={{ color: '#B37A5C', fontSize: 9, marginTop: 4 }}>
                    DE 5.0 ESTRELAS
                  </ThemedText>
                </View>

                <View style={styles.barsColumn}>
                  {[5, 4, 3, 2, 1].map((starVal) => {
                    const count = reviews.filter((r) => r.rating === starVal).length;
                    const pct = reviews.length > 0 ? count / reviews.length : 0;
                    return (
                      <View key={starVal} style={styles.barItemRow}>
                        <ThemedText style={{ color: '#802E00', fontSize: 10, width: 8 }}>{starVal}</ThemedText>
                        <View style={styles.barBackground}>
                          <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
                        </View>
                        <ThemedText style={{ color: '#B37A5C', fontSize: 9, width: 14, textAlign: 'right' }}>
                          {count}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Add/Edit Review Button */}
              {user?.role === 'CUSTOMER' && (
                <Pressable onPress={handleOpenReviewModal} style={styles.submitReviewBtn}>
                  <Ionicons name="star" size={16} color="#ffffff" />
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    {myReview ? 'Editar Minha Avaliação' : 'Avaliar este Petshop'}
                  </ThemedText>
                </Pressable>
              )}

              {/* Reviews Stream List */}
              {reviews.length === 0 ? (
                <View style={styles.emptyReviews}>
                  <ThemedText style={{ color: '#B37A5C', fontSize: 12, fontStyle: 'italic' }}>
                    Este petshop ainda não recebeu avaliações.
                  </ThemedText>
                </View>
              ) : (
                <View style={{ gap: Spacing.three }}>
                  {reviews.map((rev) => (
                    <View key={rev.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeaderRow}>
                        <View>
                          <ThemedText type="smallBold" style={{ color: '#000000' }}>
                            {rev.customer?.name ?? 'Cliente'}
                          </ThemedText>
                          <View style={styles.reviewStarsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= rev.rating ? 'star' : 'star-outline'}
                                size={12}
                                color="#fbbf24"
                              />
                            ))}
                          </View>
                        </View>
                        <ThemedText style={{ color: '#B37A5C', fontSize: 10 }}>
                          {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                        </ThemedText>
                      </View>

                      {rev.comment && (
                        <ThemedText style={styles.reviewCommentText}>
                          {rev.comment}
                        </ThemedText>
                      )}

                      {rev.ownerReply && (
                        <View style={styles.replyBox}>
                          <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 10 }}>
                            RESPOSTA DO PETSHOP:
                          </ThemedText>
                          <ThemedText style={styles.replyText}>
                            {rev.ownerReply}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Tab 3: About */}
          {activeTab === 'about' && (
            <View style={styles.tabContentContainer}>
              {/* Bio description */}
              <View style={styles.aboutCard}>
                <ThemedText type="smallBold" style={{ color: '#802E00' }}>
                  SOBRE O PETSHOP
                </ThemedText>
                <ThemedText style={styles.aboutBioText}>
                  {store.description ||
                    'Bem-vindo ao nosso petshop parceiro no PetDots! Aqui você encontra os melhores produtos com entrega expressa e toda a atenção que o seu pet merece.'}
                </ThemedText>
              </View>

              {/* Location & Details */}
              <View style={styles.aboutCard}>
                <ThemedText type="smallBold" style={{ color: '#802E00', marginBottom: Spacing.two }}>
                  CONTATO & LOCALIZAÇÃO
                </ThemedText>

                {/* Phone */}
                <Pressable
                  onPress={() => store.phone && Linking.openURL(`tel:${store.phone.replace(/\D/g, '')}`)}
                  style={styles.aboutDetailRow}
                >
                  <Ionicons name="call" size={18} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }}>
                      Telefone / WhatsApp
                    </ThemedText>
                    <ThemedText style={{ color: '#B37A5C', fontSize: 12, marginTop: 1 }}>
                      {store.phone || '(21) 98765-4321'}
                    </ThemedText>
                  </View>
                </Pressable>

                {/* Address */}
                <View style={styles.aboutDetailRow}>
                  <Ionicons name="location" size={18} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }}>
                      Endereço de Entrega
                    </ThemedText>
                    <ThemedText style={{ color: '#B37A5C', fontSize: 12, marginTop: 1 }}>
                      {store.street ? `${store.street}, ${store.number}` : 'Av. das Américas, 1500'}
                      {store.neighborhood ? ` - ${store.neighborhood}` : ' - Barra da Tijuca'}
                      {store.city ? `\n${store.city} - ${store.state}` : '\nRio de Janeiro - RJ'}
                    </ThemedText>
                  </View>
                </View>

                {/* Business Hours */}
                <View style={[styles.aboutDetailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Ionicons name="time" size={18} color={theme.primary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }}>
                      Horários de Atendimento
                    </ThemedText>
                    {store.businessHours ? (
                      BUSINESS_HOURS_GROUPS.map(({ key, label }) => (
                        <ThemedText key={key} style={{ color: '#B37A5C', fontSize: 12, marginTop: 2 }}>
                          {label}: {formatDaySchedule(store.businessHours?.[key])}
                        </ThemedText>
                      ))
                    ) : (
                      <>
                        <ThemedText style={{ color: '#B37A5C', fontSize: 12, marginTop: 2 }}>
                          Segunda a Sábado: 08:00 às 19:00
                        </ThemedText>
                        <ThemedText style={{ color: '#B37A5C', fontSize: 12 }}>
                          Domingos: Fechado
                        </ThemedText>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Social buttons */}
              <View style={styles.socialButtonsRow}>
                {store.instagram && (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        store.instagram!.startsWith('http')
                          ? store.instagram!
                          : `https://instagram.com/${store.instagram!.replace('@', '')}`
                      )
                    }
                    style={styles.socialButton}
                  >
                    <Ionicons name="logo-instagram" size={16} color="#ffffff" />
                    <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 12 }}>
                      Instagram
                    </ThemedText>
                  </Pressable>
                )}

                {store.whatsapp && (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(
                        store.whatsapp!.startsWith('http')
                          ? store.whatsapp!
                          : `https://wa.me/${store.whatsapp!.replace(/\D/g, '')}`
                      )
                    }
                    style={[styles.socialButton, { backgroundColor: '#10B981' }]}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
                    <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 12 }}>
                      WhatsApp
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 3. Review Submission Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !isSubmittingReview && setShowReviewModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Close */}
            <Pressable
              onPress={() => setShowReviewModal(false)}
              disabled={isSubmittingReview}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={22} color="#B37A5C" />
            </Pressable>

            {submittedReview ? (
              <View style={styles.modalSuccessWrapper}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <ThemedText style={{ color: '#000000', fontWeight: 'bold', marginTop: Spacing.two }}>
                  Avaliação Enviada!
                </ThemedText>
                <ThemedText style={{ color: '#B37A5C', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  {submittedReview}
                </ThemedText>
              </View>
            ) : (
              <View style={{ gap: Spacing.three }}>
                <View>
                  <ThemedText style={styles.modalTitleText}>
                    {myReview ? 'Editar Avaliação' : 'Avaliar Petshop'}
                  </ThemedText>
                  <ThemedText style={styles.modalSubTitleText}>
                    Dê sua nota e comente sobre o atendimento de {store.name}.
                  </ThemedText>
                </View>

                {reviewError && (
                  <View style={styles.modalErrorContainer}>
                    <ThemedText style={{ color: '#991B1B', fontSize: 11, fontWeight: 'bold' }}>
                      {reviewError}
                    </ThemedText>
                  </View>
                )}

                {/* Rating selection */}
                <View style={styles.modalRatingRow}>
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isActive = starValue <= rating;
                    return (
                      <Pressable key={starValue} onPress={() => setRating(starValue)}>
                        <Ionicons
                          name={isActive ? 'star' : 'star-outline'}
                          size={32}
                          color="#fbbf24"
                          style={{ marginHorizontal: 2 }}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Comment area */}
                <View style={styles.modalCommentWrapper}>
                  <TextInput
                    placeholder="Escreva seu comentário aqui (opcional)..."
                    placeholderTextColor="#B37A5C"
                    multiline
                    numberOfLines={4}
                    style={styles.modalCommentInput}
                    value={comment}
                    onChangeText={setComment}
                  />
                </View>

                {/* Submit button */}
                <Pressable
                  onPress={handleReviewSubmit}
                  disabled={isSubmittingReview}
                  style={[styles.modalSubmitButton, { backgroundColor: theme.primary }]}
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                      Enviar Avaliação
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Product row design component helper
function ProductRowCard({
  product,
  theme,
  onAdd,
}: {
  product: Product;
  theme: any;
  onAdd: () => void;
}) {
  const effectivePrice = getEffectiveUnitPrice(product);
  const discounted = hasActiveDiscount(product);
  const outOfStock = product.stock <= 0;

  return (
    <View style={styles.productCard}>
      {/* Product Image */}
      <View style={styles.productImageWrapper}>
        {product.images && product.images[0]?.url ? (
          <Image source={{ uri: product.images[0].url }} style={styles.productImage} contentFit="cover" />
        ) : (
          <View style={[styles.productImageFallback, { backgroundColor: '#FFEAD9' }]}>
            <ThemedText style={{ fontSize: 18 }}>🐾</ThemedText>
          </View>
        )}
        {discounted && (
          <View style={styles.productDiscountBadge}>
            <ThemedText style={{ color: '#ffffff', fontSize: 7, fontWeight: 'bold' }}>% OFF</ThemedText>
          </View>
        )}
      </View>

      {/* Product Information */}
      <View style={styles.productDetailsCol}>
        <ThemedText type="smallBold" style={{ color: '#000000', fontSize: 13 }} numberOfLines={1}>
          {product.name}
        </ThemedText>
        {product.description && (
          <ThemedText style={styles.productDescText} numberOfLines={2}>
            {product.description}
          </ThemedText>
        )}

        <View style={styles.productPriceRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {discounted && (
                <ThemedText style={styles.productOriginalPrice}>
                  {formatCurrency(Number(product.price))}
                </ThemedText>
              )}
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 13 }}>
                {formatCurrency(effectivePrice)}
              </ThemedText>
            </View>
            <ThemedText style={{ color: '#B37A5C', fontSize: 9, marginTop: 1 }}>
              {outOfStock ? 'Sem estoque' : `${product.stock} unidades`}
            </ThemedText>
          </View>

          {/* Add Button */}
          <Pressable
            onPress={onAdd}
            disabled={outOfStock}
            style={[
              styles.productAddBtn,
              { backgroundColor: theme.primary },
              outOfStock && { opacity: 0.5 },
            ]}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  backTextButton: {
    marginTop: Spacing.four,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  feedbackToast: {
    position: 'absolute',
    top: 50,
    left: Spacing.four,
    right: Spacing.four,
    backgroundColor: '#802E00',
    padding: Spacing.two,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 100,
    elevation: 3,
  },
  feedbackText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  coverContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  floatingBackButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  coverSpacer: {
    height: 120,
  },
  identityCard: {
    zIndex: 2,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#ffffff',
    marginTop: -40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEAD9',
    backgroundColor: '#FFF9F5',
  },
  mainWhitePanel: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#FFEAD9',
  },
  tabSelectorRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAD9',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContentContainer: {
    padding: Spacing.three,
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    borderStyle: 'dashed',
    padding: 12,
    backgroundColor: '#FFF9F5',
    marginBottom: Spacing.three,
  },
  couponTextCol: {
    flex: 1,
  },
  couponTag: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  couponCodePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    height: 40,
    marginBottom: Spacing.three,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: Spacing.two,
    fontSize: 13,
    paddingVertical: 0,
  },
  categoryPillsWrapper: {
    marginBottom: Spacing.four,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: Spacing.one,
  },
  emptyResultsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
    marginTop: Spacing.two,
  },
  categoryGroupContainer: {
    marginBottom: Spacing.three,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF3EB',
    paddingBottom: 4,
  },
  headerIndicator: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
  groupHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    textTransform: 'uppercase',
  },
  groupCountBadge: {
    backgroundColor: '#FFF3EB',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  productCard: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    padding: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  productImageWrapper: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDiscountBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  productDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  productDescText: {
    fontSize: 10,
    color: '#B37A5C',
    marginTop: 2,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  productOriginalPrice: {
    fontSize: 10,
    color: '#B37A5C',
    textDecorationLine: 'line-through',
  },
  productAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distributionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  averageColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: Spacing.three,
    borderRightWidth: 1,
    borderRightColor: '#FFEAD9',
  },
  hugeRatingText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 1,
  },
  barsColumn: {
    flex: 1,
    gap: 3,
  },
  barItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF3EB',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  submitReviewBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF6B00',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.four,
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#FFF3EB',
    paddingBottom: Spacing.two,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 1,
  },
  reviewCommentText: {
    color: '#333333',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  replyBox: {
    backgroundColor: '#FFF9F5',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B00',
    padding: 8,
    borderRadius: 6,
    marginTop: Spacing.one,
  },
  replyText: {
    color: '#333333',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  aboutBioText: {
    color: '#B37A5C',
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.one,
  },
  aboutDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF3EB',
    paddingBottom: Spacing.two,
    marginBottom: Spacing.two,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#802E00',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalSuccessWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalSubTitleText: {
    fontSize: 11,
    color: '#B37A5C',
    marginTop: 2,
  },
  modalErrorContainer: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalRatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: Spacing.two,
  },
  modalCommentWrapper: {
    borderWidth: 1,
    borderColor: '#FFEAD9',
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFF9F5',
  },
  modalCommentInput: {
    fontSize: 12,
    color: '#000000',
    textAlignVertical: 'top',
    paddingVertical: 8,
    minHeight: 80,
  },
  modalSubmitButton: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});
