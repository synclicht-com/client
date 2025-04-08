# SyncLicht Web Client

A TypeScript client for SyncLicht, providing real-time projection updates via WebSocket with local storage capabilities.

## About SyncLicht

SyncLicht is a real-time data synchronization platform. Visit [synclicht.com](http://synclicht.com) to learn more.

## Features

- Real-time projection updates via WebSocket
- Local storage of projections using localforage
- TypeScript support
- Automatic reconnection handling
- Subscription-based updates

## Installation

```bash
npm install @synclicht/web-client
```

## Usage

```typescript
import projectionStore from '@synclicht/web-client';

// Initialize the store with your WebSocket URL and authentication token
projectionStore.init('wss://your-synclicht-server.com', 'your-auth-token');

// Subscribe to projection updates
projectionStore.subscribeProjectionUpdate('your-projection', (projectionContent) => {
  console.log('Projection updated:', projectionContent);
});

// Load a projection from local storage
const projection = await projectionStore.loadProjection('your-projection');

// Unsubscribe from updates
projectionStore.unsubscribeToProjectionUpdate('your-projection', callback);
```

## API Reference

### `init(connectionUrl: string, token: string)`
Initialize the store with WebSocket connection URL and authentication token.

### `subscribeProjectionUpdate(projection: string, listener: (projectionContent: any) => void)`
Subscribe to updates for a specific projection.

### `unsubscribeToProjectionUpdate(projection: string, listener: (projectionContent: any) => void)`
Unsubscribe from updates for a specific projection.

### `loadProjection(projection: string): Promise<any>`
Load a projection from local storage.

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 