import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getBackendHost } from '../api/api';

import { Platform, NativeModules } from "react-native";

const getSocketUrl = () => {
  const host = getBackendHost();
  const protocol = host.includes("vercel.app") ? "https" : "http";
  const url = `${protocol}://${host}`;
  console.log(`[SOCKET_URL] Determined socket URL: ${url}`);
  return url;
};

export const useSocket = (companyId) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    const url = getSocketUrl();
    console.log(`[SOCKET_URL] Connecting to: ${url}`);

    // Connect to Socket.IO server
    socketRef.current = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current.on('connect', () => {
      console.log('[Socket.IO] Connected:', socketRef.current.id);
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [companyId]);

  return { socket: socketRef.current, isConnected };
};
