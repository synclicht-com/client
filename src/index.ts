import { StorageAdapter, LocalForageAdapter } from './storage'

class ProjectionStore {
  private connection: WebSocket | undefined
  private projectionUpdateSubscriptions:
    | Map<string, Set<(projectionContent: any) => void>>
    | undefined
  private static instance: ProjectionStore
  private connectionUrl: string
  private isServerReady = false
  private secretToken = ''
  private storage: StorageAdapter
  private unSendmessages: any[] = []

  constructor() {
    this.connectionUrl = ''
    this.storage = new LocalForageAdapter()
    if (ProjectionStore.instance) {
      return ProjectionStore.instance
    }
    this.projectionUpdateSubscriptions = new Map()
    ProjectionStore.instance = this
  }

  // For testing purposes only
  private setStorageAdapter(adapter: StorageAdapter) {
    this.storage = adapter
  }

  init(connectionUrl: string, token: string) {
    try {
      this.connectionUrl = connectionUrl
      this.secretToken = token
      this.connect()
    } catch (error) {
      console.error('Failed to initialize ProjectionStore:', error)
    }
  }

  private connect() {
    try {
      this.connection = new WebSocket(this.connectionUrl, ['Authorization', this.secretToken])
      this.connection.onmessage = this.onMessage.bind(this)
      this.connection.onclose = this.onDisconnect.bind(this)
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
    }
  }

  async onMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data)
      switch (msg.subject) {
        case 'ProjectionUpdated':
          try {
            await this.storage.setItem(`projection-${msg.payload.name}`, msg)
            this.projectionUpdateSubscriptions?.get(msg.payload.name)?.forEach(cb => {
              try {
                cb(msg.payload)
              } catch (error) {
                console.error('Error in projection update callback:', error)
              }
            })
          } catch (error) {
            console.error('Failed to store projection update:', error)
          }
          break
        case 'ServerReady':
          this.isServerReady = true
          try {
            const projectionStatus: any[] = []
            await this.storage.iterate(function (value: any) {
              if (value.subject != 'ProjectionUpdated') {
                return
              }
              projectionStatus.push({
                name: value.payload.name,
                last_modified_at: value.payload.last_modified_at,
              })
            })
            this.connection?.send(
              JSON.stringify({
                subject: 'PullProjections',
                payload: { projections: projectionStatus },
              })
            )
            for (const msg of this.unSendmessages) {
              try {
                this.connection?.send(msg)
              } catch (error) {
                console.error('Failed to send queued message:', error)
              }
            }
            this.unSendmessages = []
          } catch (error) {
            console.error('Failed to handle server ready:', error)
          }
          break
        default:
          console.error('Unknown message subject:', msg.subject)
          break
      }
    } catch (error) {
      console.error('Failed to process message:', error)
    }
  }

  subscribeProjectionUpdate(projection: string, listener: (projectionContent: any) => void) {
    try {
      if (!this.projectionUpdateSubscriptions?.has(projection)) {
        this.projectionUpdateSubscriptions?.set(projection, new Set())
      }
      const projectionListeners = this.projectionUpdateSubscriptions?.get(projection)
      projectionListeners?.add(listener)
      const msg = JSON.stringify({
        subject: 'SubscribeProjection',
        payload: { projection },
      })
      if (!this.isServerReady) {
        this.unSendmessages.push(msg)
        return
      }
      try {
        this.connection?.send(msg)
      } catch (error) {
        console.error('Failed to send subscription message:', error)
        this.unSendmessages.push(msg)
      }
    } catch (error) {
      console.error('Failed to subscribe to projection:', error)
    }
  }

  unsubscribeToProjectionUpdate(projection: string, listener: (projectionContent: any) => void) {
    try {
      if (!this.projectionUpdateSubscriptions?.has(projection)) return
      this.projectionUpdateSubscriptions.get(projection)?.delete(listener)
    } catch (error) {
      console.error('Failed to unsubscribe from projection:', error)
    }
  }

  async loadProjection(projection: string) {
    try {
      return (await this.storage.getItem<any>(`projection-${projection}`))?.payload
    } catch (error) {
      console.error('Failed to load projection:', error)
      return null
    }
  }

  onDisconnect() {
    this.isServerReady = false
    setTimeout(() => {
      try {
        this.connect()
      } catch (error) {
        console.error('Failed to reconnect:', error)
      }
    }, 10000)
  }
}

const projectionStore = new ProjectionStore()
export default projectionStore
