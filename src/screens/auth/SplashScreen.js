import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../theme/typography';



export default function SplashScreen({ navigation }) {
  const { width, height } = Dimensions.get('window');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={['#121212', '#1A1A1A', '#121212']} style={styles.container}>
      {/* Background Orbs */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Logo */}
        <LinearGradient colors={Colors.gradientPrimary} style={styles.logoContainer}>
          <Ionicons name="shirt" size={48} color="#fff" />
        </LinearGradient>

        <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: fadeAnim }}>
          <Text style={styles.brandName}>DhoobiGo</Text>
          <Text style={styles.tagline}>Pakistan's Smart Laundry Platform</Text>
        </Animated.View>

        {/* Features Row */}
        <Animated.View style={[styles.featureRow, { opacity: fadeAnim }]}>
          {[
            { icon: 'pricetag', label: 'Best Bids' },
            { icon: 'location', label: 'Track Live' },
            { icon: 'star', label: 'Top Quality' },
          ].map((item, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={item.icon} size={18} color={Colors.accent} />
              </View>
              <Text style={styles.featureLabel}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>
      </Animated.View>

      {/* Loading Dots */}
      <Animated.View style={[styles.loadingRow, { opacity: fadeAnim }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 1 ? styles.dotActive : {}]} />
        ))}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbTopRight: {
    position: 'absolute', top: -80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(192,241,28,0.15)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: -60, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  content: { alignItems: 'center', gap: 16 },
  logoContainer: {
    width: 96, height: 96, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  brandName: {
    fontSize: 42, fontWeight: '800', color: '#fff',
    textAlign: 'center', letterSpacing: -1,
  },
  tagline: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', letterSpacing: 0.5, marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row', gap: 24, marginTop: 32,
  },
  featureItem: { alignItems: 'center', gap: 6 },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  loadingRow: {
    position: 'absolute', bottom: 60, flexDirection: 'row', gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { width: 24, backgroundColor: Colors.primary },
});
