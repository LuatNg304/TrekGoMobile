import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api-client';
import { generateUUID } from '@/services/storage/recordingDatabase';
import type {
  AccessRevokedEventData,
  EventEnvelope,
  MemberUpdatedEventData,
  RouteFailedEventData,
  RouteReadyEventData,
  SocketAck,
  SubscriptionDto,
  TripChangedEventData,
} from '../types';

export interface TripGpsSocketCallbacks {
  onMemberUpdated?: (data: EventEnvelope<MemberUpdatedEventData>) => void;
  onTripChanged?: (data: EventEnvelope<TripChangedEventData>) => void;
  onRouteReady?: (data: EventEnvelope<RouteReadyEventData>) => void;
  onRouteFailed?: (data: EventEnvelope<RouteFailedEventData>) => void;
  onAccessRevoked?: (data: EventEnvelope<AccessRevokedEventData>) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (err: any) => void;
}

export class TripGpsSocketService {
  private socket: Socket | null = null;
  private currentTripId: string | null = null;
  private token: string | null = null;
  private callbacks: TripGpsSocketCallbacks = {};

  constructor() {}

  public connect(token: string, tripId: string, callbacks: TripGpsSocketCallbacks) {
    this.token = token;
    this.currentTripId = tripId;
    this.callbacks = callbacks;

    if (this.socket) {
      this.disconnect();
    }

    const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');

    try {
      this.socket = io(`${apiOrigin}/gps`, {
        path: '/socket.io',
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling'],
      });

      this.setupListeners();
    } catch (err) {
      console.warn('[TripGpsSocket] Init failed:', err);
      this.callbacks.onError?.(err);
    }
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[TripGpsSocket] Connected to /gps namespace');
      this.callbacks.onConnect?.();
      if (this.currentTripId) {
        this.subscribe(this.currentTripId);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[TripGpsSocket] Disconnected:', reason);
      this.callbacks.onDisconnect?.(reason);
    });

    this.socket.on('connect_error', (err: any) => {
      console.warn('[TripGpsSocket] Connect error:', err?.message || err);
      this.callbacks.onError?.(err);
    });

    // Server Server-to-Client Events
    this.socket.on('gps:member.updated', (event: EventEnvelope<MemberUpdatedEventData>) => {
      this.callbacks.onMemberUpdated?.(event);
    });

    this.socket.on('gps:trip.changed', (event: EventEnvelope<TripChangedEventData>) => {
      this.callbacks.onTripChanged?.(event);
    });

    this.socket.on('gps:route.ready', (event: EventEnvelope<RouteReadyEventData>) => {
      this.callbacks.onRouteReady?.(event);
    });

    this.socket.on('gps:route.failed', (event: EventEnvelope<RouteFailedEventData>) => {
      this.callbacks.onRouteFailed?.(event);
    });

    this.socket.on('gps:access.revoked', (event: EventEnvelope<AccessRevokedEventData>) => {
      this.callbacks.onAccessRevoked?.(event);
    });
  }

  public subscribe(tripId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve(false);
        return;
      }

      const requestId = generateUUID();
      this.socket.emit(
        'gps:subscribe',
        { requestId, tripId },
        (ack: SocketAck<SubscriptionDto>) => {
          if (ack && ack.ok) {
            console.log('[TripGpsSocket] Subscribed to trip:', tripId);
            resolve(true);
          } else {
            console.warn('[TripGpsSocket] Subscribe failed:', {
              tripId,
              code: ack?.error?.code,
              message: ack?.error?.message,
            });
            resolve(false);
          }
        }
      );
    });
  }

  public unsubscribe(tripId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve(false);
        return;
      }

      const requestId = generateUUID();
      this.socket.emit(
        'gps:unsubscribe',
        { requestId, tripId },
        (ack: SocketAck<{ tripId: string }>) => {
          resolve(Boolean(ack?.ok));
        }
      );
    });
  }

  public disconnect() {
    if (this.currentTripId && this.socket?.connected) {
      this.unsubscribe(this.currentTripId).catch(() => {});
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }
}

export const tripGpsSocket = new TripGpsSocketService();
