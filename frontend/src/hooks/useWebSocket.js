import { useRef, useState, useEffect, useCallback } from 'react';

export function useWebSocket(courseId, studentId) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const connect = useCallback(() => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (!tokens.access || !courseId || !studentId) return;

    // Dev: same host (Vite proxies /ws). Prod: backend origin via VITE_API_URL.
    const apiUrl = import.meta.env.VITE_API_URL;
    const wsBase = apiUrl
      ? apiUrl.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    const wsUrl = `${wsBase}/ws/chat/${courseId}/${studentId}/?token=${tokens.access}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3 seconds
      setTimeout(() => connect(), 3000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };
  }, [courseId, studentId]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content, parentId = null) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        message: content,
        parent_id: parentId,
      }));
    }
  }, []);

  return { messages, setMessages, sendMessage, connected };
}
