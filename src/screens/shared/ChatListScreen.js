import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { chatService } from '../../services/api';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      const user = JSON.parse(userDataStr);
      const userId = user.userId || user.id;
      
      if (!userId) {
        console.warn('Chat fetch skipped: No valid userId found in session');
        return;
      }
      
      const response = await chatService.getConversations(userId);
      setChats(response.data);
    } catch (err) {
      console.error('Fetch Chats Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatCard}
      onPress={() => navigation.navigate('ChatRoom', { chat: item })}
    >
      <View style={[styles.avatar, { backgroundColor: item.role === 'Dhobi' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)' }]}>
        <Text style={[styles.avatarText, { color: item.role === 'Dhobi' ? Colors.primary : Colors.accent }]}>{item.initial}</Text>
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        
        <View style={styles.roleRow}>
          <View style={[styles.roleBadge, { backgroundColor: item.role === 'Dhobi' ? 'rgba(14,165,233,0.08)' : 'rgba(16,185,129,0.08)' }]}>
            <Text style={[styles.roleText, { color: item.role === 'Dhobi' ? Colors.primary : Colors.accent }]}>{item.role}</Text>
          </View>
        </View>

        <View style={styles.msgRow}>
          <Text style={[styles.lastMsg, item.unread > 0 && styles.unreadText]} numberOfLines={1}>
            {item.lastMsg}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons name="search" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
          <TextInput 
            placeholder="Search messages..." 
            style={styles.searchInput}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChats(); }} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 100 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Messages Yet</Text>
              <Text style={styles.emptyText}>When you start a conversation about an order, they will appear here.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { paddingHorizontal: Spacing.lg, marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: Colors.textPrimary },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  chatCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
  avatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800' },
  chatInfo: { flex: 1, marginLeft: 16 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  time: { fontSize: 12, color: Colors.textMuted },
  roleRow: { marginBottom: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  msgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  unreadText: { color: Colors.textPrimary, fontWeight: '600' },
  unreadBadge: { backgroundColor: Colors.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadCount: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, maxWidth: '80%' },
});
