import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/typography';

const { width } = Dimensions.get('window');

export default function NotificationBanner({ message, type, visible, onHide }) {
  const slideAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 50,
        useNativeDriver: true,
        friction: 8,
      }).start();

      const timer = setTimeout(() => {
        hide();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible && slideAnim._value === -150) return null;

  const getIcon = () => {
    switch (type) {
      case 'order': return 'basket';
      case 'bid': return 'cash';
      case 'status': return 'notifications';
      case 'chat': return 'chatbubbles';
      default: return 'information-circle';
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.content} onPress={hide} activeOpacity={0.9}>
        <View style={styles.iconContainer}>
          <Ionicons name={getIcon()} size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {type === 'order' ? 'Market Update' : 
             type === 'bid' ? 'Price Quotation' : 
             type === 'chat' ? 'New Message' : 
             'Order Tracker'}
          </Text>
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </View>
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
});
