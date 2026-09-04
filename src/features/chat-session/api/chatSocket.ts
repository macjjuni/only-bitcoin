export interface ChatSocketCallbacks {
  onOpen: () => void;
  onMessage: (rawPayload: string) => void;
  onClose: (closeEvent: CloseEvent) => void;
  onError: () => void;
}

export class ChatSocket {
  private connectionGeneration = 0;
  private socket: WebSocket | null = null;

  connect(webSocketUrl: string, callbacks: ChatSocketCallbacks): void {
    this.disconnect();

    const currentGeneration = this.connectionGeneration;
    const currentSocket = new WebSocket(webSocketUrl);
    this.socket = currentSocket;

    currentSocket.addEventListener("open", () => {
      if (this.isCurrentSocket(currentGeneration, currentSocket)) {
        callbacks.onOpen();
      }
    });
    currentSocket.addEventListener("message", (messageEvent) => {
      if (
        this.isCurrentSocket(currentGeneration, currentSocket) &&
        typeof messageEvent.data === "string"
      ) {
        callbacks.onMessage(messageEvent.data);
      }
    });
    currentSocket.addEventListener("close", (closeEvent) => {
      if (this.isCurrentSocket(currentGeneration, currentSocket)) {
        this.socket = null;
        callbacks.onClose(closeEvent);
      }
    });
    currentSocket.addEventListener("error", () => {
      if (this.isCurrentSocket(currentGeneration, currentSocket)) {
        callbacks.onError();
      }
    });
  }

  disconnect(code = 1000, reason = "panel closed"): void {
    const currentSocket = this.socket;
    this.connectionGeneration += 1;
    this.socket = null;

    if (currentSocket && currentSocket.readyState < WebSocket.CLOSING) {
      currentSocket.close(code, reason);
    }
  }

  send(serializablePayload: object): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(JSON.stringify(serializablePayload));
    return true;
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  isConnecting(): boolean {
    return this.socket?.readyState === WebSocket.CONNECTING;
  }

  private isCurrentSocket(connectionGeneration: number, socket: WebSocket): boolean {
    return this.connectionGeneration === connectionGeneration && this.socket === socket;
  }
}
