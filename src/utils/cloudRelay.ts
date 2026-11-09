import mqtt, { MqttClient } from 'mqtt';

// Public high-reliability MQTT WebSocket brokers
const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

export interface CloudRelayOptions {
  roomCode: string;
  role: string;
  onMessage: (topic: string, payload: any) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export class CloudRelay {
  private client: MqttClient | null = null;
  private roomCode: string;
  private role: string;
  private currentBrokerIndex = 0;
  private isDestroyed = false;

  constructor(options: CloudRelayOptions) {
    this.roomCode = (options.roomCode || 'ARENA').toUpperCase().trim();
    this.role = options.role;
    this.connect(options);
  }

  private connect(options: CloudRelayOptions) {
    if (this.isDestroyed) return;

    const brokerUrl = BROKERS[this.currentBrokerIndex % BROKERS.length];
    const clientId = `keoco_${this.role}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000,
      });

      this.client.on('connect', () => {
        options.onConnect();

        // Subscribe to relevant topics
        const stateTopic = `keoco/v2/${this.roomCode}/state`;
        const actionTopic = `keoco/v2/${this.roomCode}/action`;
        const presenceTopic = `keoco/v2/${this.roomCode}/presence`;

        this.client?.subscribe([stateTopic, actionTopic, presenceTopic], (err) => {
          if (err) {
            console.warn('[CloudRelay] Subscribe error:', err);
          }
        });

        // Announce presence
        this.publishPresence();
      });

      this.client.on('message', (topic, message) => {
        try {
          const parsed = JSON.parse(message.toString());
          options.onMessage(topic, parsed);
        } catch (e) {
          console.warn('[CloudRelay] JSON parse error on topic:', topic);
        }
      });

      this.client.on('error', (err) => {
        console.warn(`[CloudRelay] Broker error (${brokerUrl}):`, err.message);
        // Rotate broker on failure
        this.currentBrokerIndex++;
      });

      this.client.on('offline', () => {
        options.onDisconnect();
      });
    } catch (err) {
      console.error('[CloudRelay] Failed to initialize MQTT client:', err);
      options.onDisconnect();
    }
  }

  public publishState(state: any, pullEvent?: any) {
    if (!this.client || !this.client.connected) return;
    const topic = `keoco/v2/${this.roomCode}/state`;
    const payload = JSON.stringify({ state, pullEvent, timestamp: Date.now() });
    // Retain state so newly joining devices receive it instantly!
    this.client.publish(topic, payload, { retain: true, qos: 0 });
  }

  public publishAction(action: any) {
    if (!this.client || !this.client.connected) return;
    const topic = `keoco/v2/${this.roomCode}/action`;
    const payload = JSON.stringify({ ...action, senderRole: this.role, timestamp: Date.now() });
    this.client.publish(topic, payload, { qos: 0 });
  }

  public publishPresence() {
    if (!this.client || !this.client.connected) return;
    const topic = `keoco/v2/${this.roomCode}/presence`;
    const payload = JSON.stringify({ role: this.role, timestamp: Date.now() });
    this.client.publish(topic, payload, { qos: 0 });
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }
}
