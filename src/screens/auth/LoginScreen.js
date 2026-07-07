import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, ScrollView, Platform, Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { PrimaryButton } from '../../components/UIComponents';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState('Customer');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const roles = ['Customer', 'Dhobi', 'Rider'];

  const handleLogin = async () => {
    let newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email';
    
    if (!password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const response = await authService.login({ Email: email, Password: password });
      const { token, userId, fullName, role: userRole } = response.data;

      // Verify role matches selected role
      if (userRole.toLowerCase() !== role.toLowerCase()) {
        setErrors({ general: `You are registered as a ${userRole}, not a ${role}.` });
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('userToken', token);
       await AsyncStorage.setItem('userData', JSON.stringify({ 
  userId, fullName, role: userRole, 
  reviewsCount: response.data.reviewsCount ?? 0 
}));
      setLoading(false);
      
      if (userRole === 'Customer') navigation.replace('CustomerTabs');
      else if (userRole === 'Dhobi') navigation.replace('DhobiTabs');
      else if (userRole === 'Rider') navigation.replace('RiderTabs');
      
    } catch (error) {
      console.error('Login error', error);
      setLoading(false);
      
      const status = error.response?.status;
      const message = error.response?.data?.Message || error.response?.data?.message;

      if (status === 403) {
        Alert.alert('Account Status', message || 'Your account is pending administrative approval. Please wait for verification.');
      } else if (status === 401) {
        Alert.alert('Invalid Login', 'Invalid email or password. Please try again.');
      } else {
        Alert.alert('Login Failed', 'Something went wrong. Please check your connection.');
      }
    }
  };

  return (
    <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={styles.container}>
      {/* Orbs */}
      <View style={[styles.orbTop, { backgroundColor: 'rgba(14,165,233,0.08)' }]} />
      <View style={[styles.orbBottom, { backgroundColor: 'rgba(14,165,233,0.08)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.logoMini}>
              <Ionicons name="shirt" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.brand}>DhoobiGo</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue managing your laundry</Text>
          </View>

          {/* Role Selector */}
          <View style={styles.roleRow}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputWrap, errors.email && { borderColor: '#ef4444' }]}>
                <Ionicons name="mail-outline" size={18} color={errors.email ? '#ef4444' : Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={(val) => { setEmail(val); setErrors({...errors, email: null}); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, errors.password && { borderColor: '#ef4444' }]}>
                <Ionicons name="lock-closed-outline" size={18} color={errors.password ? '#ef4444' : Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={(val) => { setPassword(val); setErrors({...errors, password: null}); }}
                  secureTextEntry={!!(!showPass)}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity 
              style={styles.forgotRow} 
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {errors.general && (
              <View style={styles.generalError}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            <PrimaryButton title="Sign In" onPress={handleLogin} loading={!!loading} style={{ marginTop: 8 }} />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orbTop: {
    position: 'absolute', top: -100, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
  orbBottom: {
    position: 'absolute', bottom: -60, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoMini: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  brand: { fontSize: 16, color: Colors.primary, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  brandName: {
    fontSize: 42, fontWeight: '800', color: Colors.textPrimary,
    textAlign: 'center', letterSpacing: -1,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  roleRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: 4, marginBottom: 24,
  },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
  roleBtnActive: { backgroundColor: Colors.primary },
  roleBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  roleBtnTextActive: { color: '#fff' },
  card: {
    backgroundColor: Colors.card, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: 24,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  eyeBtn: { padding: 4 },
  forgotRow: { alignItems: 'flex-end', marginBottom: 4 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { fontSize: 14, color: Colors.textSecondary },
  signupLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4, marginLeft: 4, fontWeight: '600' },
  generalError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fee2e2' },
  generalErrorText: { flex: 1, fontSize: 12, color: '#ef4444', fontWeight: '600' },
});
