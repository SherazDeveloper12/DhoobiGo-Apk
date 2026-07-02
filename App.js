import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as signalR from '@microsoft/signalr';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationBanner from './src/components/NotificationBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from './src/services/api';

import { SignalRProvider, useSignalR } from './src/context/SignalRContext';

function NotificationHandler() {
  const { isConnected, lastMarketUpdate, lastBidUpdate, lastStatusUpdate, lastMessageUpdate } = useSignalR();
  const [notification, setNotification] = useState({ visible: false, message: '', type: '' });
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const loadRole = async () => {
      const userJson = await AsyncStorage.getItem('userData');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserRole(user.role || user.userRole);
      }
    };
    loadRole();
  }, []);

  // 1. Marketplace Guard (Dhobis only)
  useEffect(() => {
    if (lastMarketUpdate > 0 && (userRole === 'Dhobi' || userRole === 'Admin')) {
      setNotification({ visible: true, message: 'New laundry request nearby!', type: 'order' });
    }
  }, [lastMarketUpdate, userRole]);

  // 2. Bid Guard (Customers only)
  useEffect(() => {
    if (lastBidUpdate.time > 0 && (userRole === 'Customer' || userRole === 'Admin')) {
      setNotification({ visible: true, message: `New bid received for Order #${lastBidUpdate.id}`, type: 'bid' });
    }
  }, [lastBidUpdate, userRole]);

  // 3. Status/Chat Guard (General)
  useEffect(() => {
    if (lastStatusUpdate.time > 0) {
      let msg = `Order #${lastStatusUpdate.id}: ${lastStatusUpdate.status}`;
      if (lastStatusUpdate.status === 'NewRiderBid') msg = `Delivery bid received for Order #${lastStatusUpdate.id}`;
      setNotification({ visible: true, message: msg, type: 'status' });
    }
  }, [lastStatusUpdate]);

  useEffect(() => {
    if (lastMessageUpdate.time > 0) {
      setNotification({ visible: true, message: `${lastMessageUpdate.user}: ${lastMessageUpdate.msg}`, type: 'chat' });
    }
  }, [lastMessageUpdate]);

  return (
    <NotificationBanner 
      visible={notification.visible}
      message={notification.message}
      type={notification.type}
      onHide={() => setNotification({ ...notification, visible: false })}
    />
  );
}

export default function App() {
  return (
    <SignalRProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator />
      </NavigationContainer>
      <NotificationHandler />
    </SignalRProvider>
  );
}
