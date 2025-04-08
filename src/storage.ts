import localforage from 'localforage';

// Internal interface for storage abstraction
export interface StorageAdapter {
    setItem(key: string, value: any): Promise<void>;
    getItem<T>(key: string): Promise<T | null>;
    iterate<T>(callback: (value: T, key: string, iterationNumber: number) => void): Promise<void>;
}

// Default implementation using localforage
export class LocalForageAdapter implements StorageAdapter {
    async setItem(key: string, value: any): Promise<void> {
        await localforage.setItem(key, value);
    }

    async getItem<T>(key: string): Promise<T | null> {
        return await localforage.getItem(key) as T | null;
    }

    async iterate<T>(callback: (value: T, key: string, iterationNumber: number) => void): Promise<void> {
        await localforage.iterate(callback as any);
    }
} 