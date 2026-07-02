import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../theme/typography';
import { URDU_TRANSLATIONS } from '../../constants/localization';

export default function TermsConditionsScreen({ navigation }) {
  const { terms, labels } = URDU_TRANSLATIONS;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{labels.termsTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { textAlign: 'right' }]}>
          {labels.introText}
        </Text>
        
        {terms.map((t, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign: 'right' }]}>{t.title}</Text>
            <Text style={[styles.sectionContent, { textAlign: 'right' }]}>{t.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.lastUpdated}>{labels.lastUpdated}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8F9FD', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  scroll: { padding: Spacing.lg },
  intro: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32, lineHeight: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  sectionContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  footer: { marginTop: 20, paddingBottom: 60 },
  lastUpdated: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
