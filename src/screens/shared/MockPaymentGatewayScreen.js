import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { paymentService } from '../../services/api';

export default function MockPaymentGatewayScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { method, amount: initialAmount } = route.params;
  const [amount, setAmount] = useState(String(initialAmount || ''));
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState(initialAmount ? 'pin' : 'amount'); 

  const isJazzCash = method.toLowerCase().includes('jazz');
  const themeColor = isJazzCash ? '#C41E3A' : '#00C211'; 

  const handleConfirm = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (pin.length < 4) {
      Alert.alert('Security PIN Required', 'Please enter your 4-digit PIN.');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await paymentService.topUp(numAmount);
      
      Alert.alert(
        'Transaction Finalized', 
        `Rs. ${numAmount.toLocaleString()} has been successfully added via ${method}.`,
        [{ text: 'Continue', onPress: () => {
          navigation.pop(1);
          if (route.params.onSuccess) route.params.onSuccess();
        }}]
      );
    } catch (err) {
      Alert.alert('Network Error', 'The Financial Hub is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const addDigit = (n) => {
    if (activeInput === 'amount') {
      if (amount.length < 7) setAmount(prev => prev + n);
    } else if (pin.length < 4) {
      setPin(prev => prev + n);
    }
  };

  const removeDigit = () => {
    if (activeInput === 'amount') {
      setAmount(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { 
        backgroundColor: themeColor, 
        paddingTop: Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0),
        height: 60 + Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0)
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{method.toUpperCase()} GATEWAY</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.branding}>
          <Ionicons name="shield-checkmark" size={16} color={themeColor} />
          <Text style={styles.secureText}>SECURED BY DHOOBIGO HUB</Text>
        </View>

        <TouchableOpacity 
          style={[styles.inputCard, activeInput === 'amount' && styles.activeCard]} 
          onPress={() => setActiveInput('amount')}
        >
          <Text style={styles.label}>TOP-UP AMOUNT</Text>
          <View style={styles.priceRow}>
            <Text style={styles.rs}>Rs.</Text>
            <Text style={[styles.amountText, !amount && { color: '#CBD5E1' }]}>
              {amount ? parseFloat(amount).toLocaleString() : '0'}
            </Text>
            {activeInput === 'amount' && <View style={[styles.cursor, { backgroundColor: themeColor }]} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.inputCard, activeInput === 'pin' && styles.activeCard]} 
          onPress={() => setActiveInput('pin')}
        >
          <Text style={styles.label}>SECURITY PIN</Text>
          <View style={styles.pinRow}>
            {[1, 2, 3, 4].map((i) => (
              <View 
                key={i} 
                style={[
                  styles.pinDot, 
                  pin.length >= i && { backgroundColor: themeColor, borderColor: themeColor }
                ]} 
              />
            ))}
          </View>
        </TouchableOpacity>

        <View style={[styles.numpadSection, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.numpad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'back'].map((item, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.numBtn} 
                onPress={() => item === 'back' ? removeDigit() : addDigit(item)}
              >
                {item === 'back' ? (
                  <Ionicons name="backspace-outline" size={24} color="#64748B" />
                ) : (
                  <Text style={styles.numText}>{item}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.payBtn, { backgroundColor: themeColor }, (pin.length < 4 || !amount) && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={loading || pin.length < 4 || !amount}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>CONFIRM & PAY</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  backBtn: { padding: 4 },
  
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  branding: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  secureText: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  
  inputCard: { marginTop: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  activeCard: { borderColor: '#CBD5E1', backgroundColor: '#fff', elevation: 2 },
  
  label: { fontSize: 9, color: '#94A3B8', fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rs: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  amountText: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  cursor: { width: 2, height: 20, marginLeft: 4 },
  
  pinRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1' },
  
  numpadSection: { marginBottom: 15 },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  numBtn: { width: '33%', height: 45, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  
  payBtn: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 }
});
