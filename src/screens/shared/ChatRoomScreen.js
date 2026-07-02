import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { SOCKET_URL } from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';

export default function ChatRoomScreen({ navigation, route }) {
  const { chat = { name: 'Ahmed Laundry', role: 'Dhobi', initial: 'A' } } = route?.params || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState(null);
  const connection = useRef(null);

  useEffect(() => {
    let pollingInterval;
    
    const fetchHistory = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      const userData = JSON.parse(userDataStr);
      setUser(userData);

      const groupName = chat.id || chat.orderId || 'Global';

      try {
        const response = await api.get(`/chat/history/${groupName}`);
        const historicalMessages = response.data.map(m => ({
          id: m.id.toString(),
          text: m.message,
          sender: m.senderName === userData.fullName ? 'me' : 'other',
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(historicalMessages);
      } catch (err) {
        console.error('History Fetch Error:', err);
      }
    };

    fetchHistory();
    
    // Smart Polling: Refresh chat every 4 seconds for the 'Live' experience
    pollingInterval = setInterval(fetchHistory, 4000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [chat.orderId]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    
    const groupName = chat.id || chat.orderId || 'Global';
    const messageText = input.trim();
    setInput('');

    try {
      await api.post('/chat/send', {
        groupName: groupName,
        senderName: user.fullName,
        message: messageText
      });
      // Optionally re-fetch history immediately for responsiveness
    } catch (err) {
      console.error('Send Error:', err);
      alert('Failed to send message');
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        {!isMe && (
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>{chat.initial}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {isMe ? (
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.bubbleGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={styles.bubbleTextMe}>{item.text}</Text>
              <Text style={styles.bubbleTimeMe}>{item.time}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.bubbleOtherInner}>
              <Text style={styles.bubbleTextOther}>{item.text}</Text>
              <Text style={styles.bubbleTimeOther}>{item.time}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: chat.role === 'Dhobi' ? 'rgba(14,165,233,0.12)' : 'rgba(16,185,129,0.12)' }]}>
          <Text style={[styles.headerAvatarText, { color: chat.role === 'Dhobi' ? Colors.primary : Colors.accent }]}>
            {chat.initial}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{chat.name}</Text>
          <Text style={styles.headerRole}>{chat.role}</Text>
        </View>
        <TouchableOpacity style={styles.callBtn}>
          <Ionicons name="call-outline" size={20} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Order Context Strip */}
      <View style={styles.orderStrip}>
        <Ionicons name="receipt-outline" size={14} color={Colors.primary} />
        <Text style={styles.orderStripText}>Order #{chat.orderId || 'Active Transaction'}</Text>
      </View>


      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Replies */}
      <View style={styles.quickReplies}>
        {["I'm on my way!", 'Ready for pickup', 'Order received'].map((reply) => (
          <TouchableOpacity key={reply} style={styles.quickReply} onPress={() => setInput(reply)}>
            <Text style={styles.quickReplyText}>{reply}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.5 }]}
          onPress={sendMessage}
        >
          <LinearGradient
            colors={[Colors.accent, '#059669']}
            style={styles.sendGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56,
    paddingHorizontal: Spacing.lg, paddingBottom: 16, gap: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 4,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 18, fontWeight: '800' },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerRole: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(16,185,129,0.08)', alignItems: 'center', justifyContent: 'center' },
  orderStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(14,165,233,0.06)', paddingVertical: 10,
    paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  orderStripText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  messageList: { padding: Spacing.lg, paddingBottom: 12 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  bubbleRowMe: { flexDirection: 'row-reverse' },
  avatarSmall: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  bubble: { maxWidth: '75%' },
  bubbleMe: {},
  bubbleOther: {},
  bubbleGradient: { borderRadius: BorderRadius.xl, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  bubbleOtherInner: { backgroundColor: '#FFFFFF', borderRadius: BorderRadius.xl, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  bubbleTextMe: { fontSize: 15, color: '#fff', lineHeight: 22 },
  bubbleTimeMe: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'right' },
  bubbleTextOther: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  bubbleTimeOther: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  quickReplies: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 10 },
  quickReply: { backgroundColor: 'rgba(14,165,233,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(14,165,233,0.15)' },
  quickReplyText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  inputBar: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: 12, gap: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'flex-end' },
  inputWrap: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, minHeight: 48 },
  input: { fontSize: 15, color: Colors.textPrimary, maxHeight: 100 },
  sendBtn: { width: 48, height: 48 },
  sendGradient: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
