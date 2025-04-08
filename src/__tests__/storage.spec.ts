import { StorageAdapter, LocalForageAdapter } from '../storage';
import localforage from 'localforage';

// Mock localforage
jest.mock('localforage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    iterate: jest.fn()
}));

class MockStorageAdapter implements StorageAdapter {
    private storage: Map<string, any> = new Map();
    private shouldThrowError = false;

    constructor(shouldThrowError = false) {
        this.shouldThrowError = shouldThrowError;
    }

    async setItem(key: string, value: any): Promise<void> {
        if (this.shouldThrowError) {
            throw new Error('Storage error');
        }
        this.storage.set(key, value);
    }

    async getItem<T>(key: string): Promise<T | null> {
        if (this.shouldThrowError) {
            throw new Error('Storage error');
        }
        return this.storage.get(key) || null;
    }

    async iterate<T>(callback: (value: T, key: string, iterationNumber: number) => void): Promise<void> {
        if (this.shouldThrowError) {
            throw new Error('Storage error');
        }
        let iterationNumber = 0;
        for (const [key, value] of this.storage.entries()) {
            await callback(value as T, key, iterationNumber++);
        }
    }
}

describe('StorageAdapter', () => {
    let mockStorage: MockStorageAdapter;
    let localForageAdapter: LocalForageAdapter;

    beforeEach(() => {
        mockStorage = new MockStorageAdapter();
        localForageAdapter = new LocalForageAdapter();
        jest.clearAllMocks();
    });

    describe('local storage operations', () => {
        it('should store and retrieve items', async () => {
            const testData = { test: 'data' };
            await mockStorage.setItem('test-key', testData);
            
            const retrieved = await mockStorage.getItem('test-key');
            expect(retrieved).toEqual(testData);
        });

        it('should return null for non-existent items', async () => {
            const retrieved = await mockStorage.getItem('non-existent');
            expect(retrieved).toBeNull();
        });

        it('should iterate over stored items', async () => {
            const items = [
                { key: 'key1', value: 'value1' },
                { key: 'key2', value: 'value2' }
            ];
            
            for (const item of items) {
                await mockStorage.setItem(item.key, item.value);
            }
            
            const iteratedItems: any[] = [];
            await mockStorage.iterate((value, key, iterationNumber) => {
                iteratedItems.push({ value, key, iterationNumber });
            });
            
            expect(iteratedItems).toHaveLength(2);
            expect(iteratedItems[0]).toEqual({
                value: 'value1',
                key: 'key1',
                iterationNumber: 0
            });
            expect(iteratedItems[1]).toEqual({
                value: 'value2',
                key: 'key2',
                iterationNumber: 1
            });
        });
    });

    describe('LocalForageAdapter', () => {
        it('should use localforage for storage operations', async () => {
            const testData = { test: 'data' };
            (localforage.setItem as jest.Mock).mockResolvedValue(undefined);
            (localforage.getItem as jest.Mock).mockResolvedValue(testData);
            
            await localForageAdapter.setItem('test-key', testData);
            expect(localforage.setItem).toHaveBeenCalledWith('test-key', testData);
            
            const result = await localForageAdapter.getItem('test-key');
            expect(localforage.getItem).toHaveBeenCalledWith('test-key');
            expect(result).toEqual(testData);
        });

        it('should handle localforage errors', async () => {
            const error = new Error('LocalForage error');
            (localforage.setItem as jest.Mock).mockRejectedValue(error);
            (localforage.getItem as jest.Mock).mockRejectedValue(error);
            (localforage.iterate as jest.Mock).mockRejectedValue(error);

            await expect(localForageAdapter.setItem('test-key', 'value')).rejects.toThrow('LocalForage error');
            await expect(localForageAdapter.getItem('test-key')).rejects.toThrow('LocalForage error');
            await expect(localForageAdapter.iterate(() => {})).rejects.toThrow('LocalForage error');
        });

        it('should handle null values from localforage', async () => {
            (localforage.getItem as jest.Mock).mockResolvedValue(null);
            
            const result = await localForageAdapter.getItem('test-key');
            expect(result).toBeNull();
        });
    });

    describe('error handling', () => {
        it('should handle storage errors', async () => {
            const errorStorage = new MockStorageAdapter(true);

            await expect(errorStorage.setItem('key', 'value')).rejects.toThrow('Storage error');
            await expect(errorStorage.getItem('key')).rejects.toThrow('Storage error');
            await expect(errorStorage.iterate(() => {})).rejects.toThrow('Storage error');
        });

        it('should handle callback errors during iteration', async () => {
            const error = new Error('Callback error');
            await mockStorage.setItem('key1', 'value1');
            await mockStorage.setItem('key2', 'value2');

            await expect(mockStorage.iterate(() => {
                throw error;
            })).rejects.toThrow('Callback error');
        });
    });
}); 