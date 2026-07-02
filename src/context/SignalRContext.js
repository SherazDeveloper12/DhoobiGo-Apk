import React, { createContext, useContext, useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../services/api';

const SignalRContext = createContext(null);

export const SignalRProvider = ({ children }) => {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Master Timestamps
  const [lastMarketUpdate, setLastMarketUpdate] = useState(0);
  const [lastBidUpdate, setLastBidUpdate] = useState({ id: 0, time: 0 });
  const [lastStatusUpdate, setLastStatusUpdate] = useState({ id: 0, status: '', time: 0 });
  const [lastMessageUpdate, setLastMessageUpdate] = useState({ user: '', msg: '', time: 0 });

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${SOCKET_URL}/notificationHub`)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, []);

  // Re-join groups whenever connection OR userData changes
  useEffect(() => {
    const syncGroups = async () => {
      if (connection && isConnected) {
        try {
          const userJson = await AsyncStorage.getItem('userData');
          if (userJson) {
            const user = JSON.parse(userJson);
            const userId = user.userId || user.id;
            const role = user.role || user.userRole;

            console.log(`[SIGNALR] Joining Private Room: User_${userId}`);
            await connection.invoke('JoinGroup', `User_${userId}`);
            
            if (role === 'Dhobi') {
              console.log('[SIGNALR] Joining Dhobi Marketplace');
              await connection.invoke('JoinGroup', 'Dhobis');
            }
          }
        } catch (err) {
          console.error('[SIGNALR GROUP ERROR]', err);
        }
      }
    };
    syncGroups();
  }, [connection, isConnected]); // This will trigger on connect

  useEffect(() => {
    if (!connection) return;

    const startConnection = async () => {
      try {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
          console.log('[SIGNALR] Connection Established');
          setIsConnected(true);
        }

        // --- GLOBAL MASTER LISTENERS ---
        connection.on('UpdateMarketplace', () => {
          console.log('[SIGNALR] Marketplace Update Received');
          setLastMarketUpdate(Date.now());
        });

        connection.on('NewBid', (orderId) => {
          console.log('[SIGNALR] New Bid Received for Order ID:', orderId, 'at', new Date().toLocaleTimeString());
          setLastBidUpdate({ id: orderId, time: Date.now() });
        });

        connection.on('OrderUpdate', (orderId, status) => {
          console.log('[SIGNALR] Status Update Received:', orderId, '->', status);
          setLastStatusUpdate({ id: orderId, status: status, time: Date.now() });
        });

        connection.on('ReceiveMessage', (user, message) => {
          console.log('[SIGNALR] Chat Message Received from:', user);
          setLastMessageUpdate({ user, msg: message, time: Date.now() });
        });

        connection.onreconnecting(error => {
          console.warn('[SIGNALR] Connection lost. Reconnecting...', error);
          setIsConnected(false);
        });

        connection.onreconnected(connectionId => {
          console.log('[SIGNALR] Connection restored! ID:', connectionId);
          setIsConnected(true);
        });

      } catch (err) {
        console.log('[SIGNALR] Start failed, retrying...', err);
        setTimeout(startConnection, 5000); 
      }
    };

    startConnection();

    return () => {
      connection.off('UpdateMarketplace');
      connection.off('NewBid');
      connection.off('OrderUpdate');
      connection.off('ReceiveMessage');
    };
  }, [connection]);

  return (
    <SignalRContext.Provider value={{ 
      connection, isConnected, 
      lastMarketUpdate, lastBidUpdate, lastStatusUpdate, lastMessageUpdate 
    }}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalR = () => useContext(SignalRContext);
