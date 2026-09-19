import API_URL from "../config/api";
import { type CollabMessage, type ConnectionStatus } from "./types";

type MessageHandler = (msg: CollabMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

/**
 * CollaborationClient
 * Robust WebSocket client connecting to /ws/collaboration.
 * Handles auto-reconnect with exponential backoff, room subscriptions,
 * and typed event dispatching.
 */
export class CollaborationClient {
  private ws: WebSocket | null = null;
  private projectId: string;
  private status: ConnectionStatus = "offline";
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isExplicitlyClosed = false;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  public connect(): void {
    this.isExplicitlyClosed = false;
    this._initSocket();
  }

  private _resolveWsUrl(): string {
    const rawApi = API_URL || "http://localhost:5000";
    let wsUrl = rawApi.replace(/^http/, "ws");
    if (wsUrl.endsWith("/")) {
      wsUrl = wsUrl.slice(0, -1);
    }
    return `${wsUrl}/ws/collaboration?projectId=${encodeURIComponent(this.projectId)}`;
  }

  private _initSocket(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    const url = this._resolveWsUrl();
    this._setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "offline");

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this._setStatus("connected");
        this._startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: CollabMessage = JSON.parse(event.data);
          this._dispatchMessage(msg);
        } catch (err) {
          console.warn("Failed to parse collaboration message:", err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this._stopHeartbeat();
        this._setStatus("offline");

        // Do not auto-reconnect if closed normally or policy violation (1008 = Unauthorized)
        if (!this.isExplicitlyClosed && event.code !== 1008 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn("Collaboration WebSocket error:", err);
      };
    } catch (err) {
      console.error("Failed to construct collaboration WebSocket:", err);
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect(): void {
    if (this.isExplicitlyClosed) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 15000);
    this._setStatus("reconnecting");

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this._initSocket();
    }, delay);
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send({ type: "ping" });
    }, 25000);
  }

  private _stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private _setStatus(newStatus: ConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.statusHandlers.forEach((handler) => handler(newStatus));
  }

  private _dispatchMessage(msg: CollabMessage): void {
    this.messageHandlers.forEach((handler) => handler(msg));
  }

  public send(msg: CollabMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(JSON.stringify(msg));
      return true;
    } catch (err) {
      console.warn("Failed to send collaboration message:", err);
      return false;
    }
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === "connected" && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this._stopHeartbeat();
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this._setStatus("offline");
  }
}
