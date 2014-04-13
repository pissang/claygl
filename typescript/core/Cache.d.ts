declare module qtek {

    export module core {

        export class Cache {

            use(contextId: number, documentSchema?: () => Object): void;

            put(key: string, value: any): void;

            get(key: string): any;

            miss(key: string): void;

            delete(key: string): void;

            dirty(field?: string): void;

            dirtyAll(field?: string): void;

            fresh(field?: string): void;

            freshAll(field?: string): void;

            isDirty(field?: string): void;

            getContext(): Object;

            clearContext(): void;

            deleteContext(): void;

            clearAll(): void;
        }
    }
}