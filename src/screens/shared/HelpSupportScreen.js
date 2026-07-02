import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../theme/typography';
import { URDU_TRANSLATIONS } from '../../constants/localization';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HelpSupportScreen({ navigation }) {
  const { faqs, labels } = URDU_TRANSLATIONS;
  const [role, setRole] = React.useState('Customer');

  React.useEffect(() => {
    const getRole = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setRole(userData.role);
      }
    };
    getRole();
  }, []);

  const handleSupportLink = (type) => {
    let url = type === 'email' ? 'mailto:support@dhoobi.com' : 'tel:+92000000000';
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  const getGuidance = () => {
    if (role === 'Customer') return [
      "آرڈر کرنے کے لیے ہوم اسکرین پر جائیں۔",
      "رائڈر کے پہنچنے پر کپڑے اس کے حوالے کریں اور تصویر لینے دیں۔",
      "کپڑے واپس ملنے پر والٹ سے ادائیگی کنفرم کریں۔"
    ];
    if (role === 'Dhobi') return [
      "نئے آرڈرز پر بولی (Bid) لگائیں۔",
      "رائڈر سے کپڑے وصول کرتے وقت معیار چیک کریں۔",
      "کپڑے تیار ہونے پر 'Ready for Delivery' کا بٹن دبائیں۔"
    ];
    if (role === 'Rider') return [
      "دستیاب ٹاسکس میں سے پک اپ قبول کریں۔",
      "ہر ہینڈ اوور (Handover) پر تصویر لازمی بنائیں۔",
      "کیش آرڈرز کی صورت میں رقم والٹ میں جمع کروائیں۔"
    ];
    return [];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{labels.helpTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.contactCard}>
          <Text style={[styles.contactTitle, { textAlign: 'right' }]}>{labels.needHelp}</Text>
          <Text style={[styles.contactSub, { textAlign: 'right' }]}>{labels.supportSub}</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={() => handleSupportLink('call')}>
              <Ionicons name="call-outline" size={20} color="#fff" />
              <Text style={styles.contactBtnText}>{labels.callUs}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: Colors.accent }]} onPress={() => handleSupportLink('email')}>
              <Ionicons name="mail-outline" size={20} color="#fff" />
              <Text style={styles.contactBtnText}>{labels.emailUs}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rehunmai (Guidance) Section */}
        <View style={styles.guidanceSection}>
          <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>آپ کے لیے خصوصی رہنمائی (Rehunmai)</Text>
          {getGuidance().map((text, i) => (
            <View key={i} style={styles.guidanceItem}>
              <Ionicons name="bulb" size={16} color={Colors.accent} />
              <Text style={[styles.guidanceText, { textAlign: 'right' }]}>{text}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>{labels.faqHeader}</Text>
        {faqs.map((f, i) => (
          <View key={i} style={styles.faqItem}>
            <Text style={[styles.faqQ, { textAlign: 'right' }]}>{f.q}</Text>
            <Text style={[styles.faqA, { textAlign: 'right' }]}>{f.a}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0 (DhoobiGO Platform)</Text>
          <Text style={styles.footerText}>© 2026 DhoobiGO Private Limited</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  contactCard: { backgroundColor: Colors.primary, borderRadius: 24, padding: 24, marginBottom: 32 },
  contactTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  contactSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 12 },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, borderRadius: 12 },
  contactBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
  faqItem: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  faqQ: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  faqA: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  guidanceSection: { marginBottom: 32, backgroundColor: '#EFF6FF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#DBEAFE' },
  guidanceItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  guidanceText: { fontSize: 14, color: '#1E40AF', fontWeight: '500', flex: 1 },
  footer: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
});
