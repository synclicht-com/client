# SyncLicht Client

> ⚠️ **Beta Version**  
> This package is currently in beta. While you're welcome to experiment with it, it is not yet ready for production use. The API may change without notice, and there might be bugs or performance issues. Use at your own risk.

A TypeScript client for SyncLicht, providing real-time projection updates via WebSocket with local storage capabilities.

## About SyncLicht

SyncLicht is a real-time data synchronization platform that enables seamless data synchronization across your applications. Visit [synclicht.com](http://synclicht.com) to learn more.

## Features

- Real-time projection updates via WebSocket
- Local storage of projections using localforage
- TypeScript support with full type definitions
- Automatic reconnection handling
- Subscription-based updates
- Efficient memory management
- Error handling and recovery

## Installation

```bash
npm install @synclicht/client
```

## Usage

```typescript
import projectionStore from '@synclicht/client';

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
Subscribe to updates for a specific projection. The listener will be called whenever the projection is updated.

### `unsubscribeToProjectionUpdate(projection: string, listener: (projectionContent: any) => void)`
Unsubscribe from updates for a specific projection. The listener will no longer receive updates.

### `loadProjection(projection: string): Promise<any>`
Load a projection from local storage. Returns a Promise that resolves to the projection content.

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

## Version History

- 0.0.3: Renamed package to @synclicht/client
- 0.0.2: Added local storage capabilities
- 0.0.1: Initial release with basic WebSocket functionality

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change. 