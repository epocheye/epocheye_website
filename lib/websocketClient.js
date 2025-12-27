/**
 * Connect to the WebSocket endpoint with automatic reconnection.
 * @param {string} token
 * @param {(data: any) => void} onMessage
 * @param {(err: any) => void} onError
 * @returns {{ send: (msg: any) => void, close: () => void }}
 */
export function connectWebSocket(token, onMessage, onError) {
  let ws;
  let retries = 0;
  const maxRetries = 5;

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/api/socket?token=${encodeURIComponent(token)}`;

    ws = new WebSocket(url);

    ws.onopen = () => {
      retries = 0;
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage?.(parsed);
      } catch (err) {
        onError?.(err);
      }
    };

    ws.onerror = (err) => {
      onError?.(err);
    };

    ws.onclose = () => {
      if (retries >= maxRetries) return;
      const delay = 2 ** retries * 500;
      retries += 1;
      setTimeout(connect, delay);
    };
  };

  connect();

  return {
    send: (message) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    },
    close: () => {
      if (ws) ws.close();
    },
  };
}

export default connectWebSocket;
