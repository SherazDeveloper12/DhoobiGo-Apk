import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import api from '../../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: Reset
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', `"${email}"`, {
        headers: { 'Content-Type': 'application/json' }
      });
      setStep(2);
    } catch (error) {
      const data = error.response?.data;
      const msg = data?.Message || data?.message || 'Could not find an account with this email.';
      setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    let newErrors = {};
    if (!code) newErrors.code = 'Reset code is required';
    if (!newPassword) newErrors.password = 'New password is required';
    else if (newPassword.length < 8) newErrors.password = 'Min. 8 characters required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      // Sync with PascalCase ResetPasswordDto
      await api.post('/auth/reset-password', { 
        Email: email, 
        Code: code, 
        NewPassword: newPassword 
      });
      Alert.alert('Success', 'Password reset successfully! Please login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      const data = error.response?.data;
      const msg = data?.Message || data?.message || 'Failed to reset password. Check your code.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 
              ? "Enter your email address and we'll send you a recovery code." 
              : "Enter the 6-digit code and your new secure password."}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 1 ? (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrapper, errors.email && { borderColor: '#ef4444' }]}>
                <Ionicons name="mail-outline" size={20} color={errors.email ? '#ef4444' : Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(val) => { setEmail(val); setErrors({...errors, email: null}); }}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Reset Code</Text>
                <View style={[styles.inputWrapper, errors.code && { borderColor: '#ef4444' }]}>
                  <Ionicons name="key-outline" size={20} color={errors.code ? '#ef4444' : Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={(val) => { setCode(val); setErrors({...errors, code: null}); }}
                  />
                </View>
                {errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>New Password</Text>
                <View style={[styles.inputWrapper, errors.password && { borderColor: '#ef4444' }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={errors.password ? '#ef4444' : Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={(val) => { setNewPassword(val); setErrors({...errors, password: null}); }}
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {errors.general && (
                <View style={styles.generalError}>
                  <Ionicons name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.generalErrorText}>{errors.general}</Text>
                </View>
              )}
            </>
          )}

          <TouchableOpacity 
            style={styles.button} 
            onPress={step === 1 ? handleSendCode : handleResetPassword}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>
                {loading ? "Processing..." : step === 1 ? "Send Code" : "Reset Password"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingTop: 60 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  form: { gap: 24 },
  inputContainer: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  button: { marginTop: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', elevation: 4, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  gradient: { height: 56, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4, marginLeft: 4, fontWeight: '600' },
  generalError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fee2e2', marginTop: 10 },
  generalErrorText: { flex: 1, fontSize: 12, color: '#ef4444', fontWeight: '600' },
});
