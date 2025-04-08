import projectionStore from '../index'
import { StorageAdapter } from '../storage'

class MockStorageAdapter implements StorageAdapter {
  private storage: Map<string, any> = new Map()
  private shouldThrowError = false

  constructor(shouldThrowError = false) {
    this.shouldThrowError = shouldThrowError
  }

  async setItem(key: string, value: any): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error('Storage error')
    }
    this.storage.set(key, value)
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (this.shouldThrowError) {
      throw new Error('Storage error')
    }
    return this.storage.get(key) || null
  }

  async iterate<T>(
    callback: (value: T, key: string, iterationNumber: number) => void
  ): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error('Storage error')
    }
    let iterationNumber = 0
    for (const [key, value] of this.storage.entries()) {
      await callback(value as T, key, iterationNumber++)
    }
  }
}

class MockWebSocket {
  public sentMessages: string[] = []
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  private shouldThrowOnSend = false

  constructor(url: string, protocols?: string | string[], shouldThrowOnSend = false) {
    this.shouldThrowOnSend = shouldThrowOnSend
  }

  send(data: string) {
    if (this.shouldThrowOnSend) {
      throw new Error('WebSocket send error')
    }
    this.sentMessages.push(data)
  }

  close() {
    if (this.onclose) {
      this.onclose({
        code: 1000,
        reason: 'Normal closure',
        wasClean: true,
        cancelBubble: false,
        returnValue: false,
        bubbles: false,
        cancelable: false,
        composed: false,
        currentTarget: null,
        defaultPrevented: false,
        eventPhase: 0,
        isTrusted: true,
        srcElement: null,
        target: null,
        timeStamp: Date.now(),
        type: 'close',
        AT_TARGET: 0,
        BUBBLING_PHASE: 0,
        CAPTURING_PHASE: 0,
        NONE: 0,
        composedPath: () => [],
        initEvent: () => {},
        preventDefault: () => {},
        stopImmediatePropagation: () => {},
        stopPropagation: () => {},
      } as unknown as CloseEvent)
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
}

describe('ProjectionStore', () => {
  let currentMockWs: MockWebSocket
  let mockStorage: MockStorageAdapter

  beforeEach(() => {
    jest.useFakeTimers()
    currentMockWs = new MockWebSocket('ws://test')
    ;(global.WebSocket as unknown as jest.Mock) = jest.fn(() => currentMockWs)

    // Reset mocks
    jest.clearAllMocks()

    // Create a new storage adapter for each test
    mockStorage = new MockStorageAdapter()

    // Reset the singleton instance's state
    ;(projectionStore as any).connection = undefined
    ;(projectionStore as any).projectionUpdateSubscriptions = new Map()
    ;(projectionStore as any).isServerReady = false
    ;(projectionStore as any).unSendmessages = []
    ;(projectionStore as any).setStorageAdapter(mockStorage)

    projectionStore.init('ws://test', 'test-token')

    // Simulate WebSocket connection
    jest.runAllTimers()

    // Simulate server ready
    currentMockWs.simulateMessage({ subject: 'ServerReady' })
    jest.runAllTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('subscription handling', () => {
    it('should subscribe to projection updates', () => {
      const listener = jest.fn()
      projectionStore.subscribeProjectionUpdate('test-projection', listener)

      jest.runAllTimers()

      expect(currentMockWs.sentMessages).toContainEqual(
        expect.stringContaining('SubscribeProjection')
      )
    })

    it('should notify subscribers when projection is updated', async () => {
      const listener = jest.fn()
      projectionStore.subscribeProjectionUpdate('test-projection', listener)

      jest.runAllTimers()

      currentMockWs.simulateMessage({
        subject: 'ProjectionUpdated',
        payload: {
          name: 'test-projection',
          data: { test: 'data' },
        },
      })

      jest.runAllTimers()
      await Promise.resolve() // Flush promises

      expect(listener).toHaveBeenCalledWith({
        name: 'test-projection',
        data: { test: 'data' },
      })
    })

    it('should unsubscribe from projection updates', () => {
      const listener = jest.fn()
      projectionStore.subscribeProjectionUpdate('test-projection', listener)
      projectionStore.unsubscribeToProjectionUpdate('test-projection', listener)

      currentMockWs.simulateMessage({
        subject: 'ProjectionUpdated',
        payload: {
          name: 'test-projection',
          data: { test: 'data' },
        },
      })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('server ready handling', () => {
    it('should send stored projections on server ready', async () => {
      const mockProjections = [
        {
          subject: 'ProjectionUpdated',
          payload: {
            name: 'test-projection',
            data: { test: 'data' },
          },
        },
      ]

      // Store some projections
      for (const proj of mockProjections) {
        await mockStorage.setItem(`projection-${proj.payload.name}`, proj)
      }

      currentMockWs.simulateMessage({ subject: 'ServerReady' })

      jest.runAllTimers()
      await Promise.resolve() // Flush promises

      expect(currentMockWs.sentMessages).toContainEqual(expect.stringContaining('PullProjections'))
    })
  })

  describe('error handling', () => {
    it('should handle WebSocket connection errors', () => {
      // Mock WebSocket to throw on construction
      ;(global.WebSocket as unknown as jest.Mock) = jest.fn(() => {
        throw new Error('Connection failed')
      })

      // Should not throw, but log error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      projectionStore.init('ws://test', 'test-token')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle storage errors during projection update', async () => {
      // Create storage that throws errors
      const errorStorage = new MockStorageAdapter(true)
      ;(projectionStore as any).setStorageAdapter(errorStorage)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      currentMockWs.simulateMessage({
        subject: 'ProjectionUpdated',
        payload: {
          name: 'test-projection',
          data: { test: 'data' },
        },
      })

      await Promise.resolve() // Flush promises
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle invalid message format', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Send invalid JSON
      if (currentMockWs.onmessage) {
        currentMockWs.onmessage(new MessageEvent('message', { data: 'invalid json' }))
      }

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle unknown message subject', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      currentMockWs.simulateMessage({
        subject: 'UnknownSubject',
        payload: {},
      })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle WebSocket send errors', async () => {
      // Create WebSocket that throws on send
      currentMockWs = new MockWebSocket('ws://test', undefined, true)
      ;(global.WebSocket as unknown as jest.Mock) = jest.fn(() => currentMockWs)

      // Reset and reinitialize with the new WebSocket
      ;(projectionStore as any).connection = undefined
      projectionStore.init('ws://test', 'test-token')
      jest.runAllTimers() // Let the connection establish

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Now try to send a message
      projectionStore.subscribeProjectionUpdate('test-projection', jest.fn())

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle storage errors during server ready', async () => {
      // Create storage that throws errors
      const errorStorage = new MockStorageAdapter(true)
      ;(projectionStore as any).setStorageAdapter(errorStorage)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      currentMockWs.simulateMessage({ subject: 'ServerReady' })

      await Promise.resolve() // Flush promises
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle callback errors during projection update', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Callback error')
      })

      projectionStore.subscribeProjectionUpdate('test-projection', errorListener)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      currentMockWs.simulateMessage({
        subject: 'ProjectionUpdated',
        payload: {
          name: 'test-projection',
          data: { test: 'data' },
        },
      })

      await Promise.resolve() // Flush promises
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle reconnection errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock WebSocket to throw on construction for reconnection
      ;(global.WebSocket as unknown as jest.Mock) = jest.fn(() => {
        throw new Error('Reconnection failed')
      })

      // Trigger disconnect and reconnect attempt
      currentMockWs.close()
      jest.runAllTimers()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
