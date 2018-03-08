export class LRU {

    constructor(maxSize: number);

    setMaxSize(maxSize: number): void;

    put(key: string, value: any): void;

    get(key: string): any;

    remove(key: string): void;

    clear(): void;
}