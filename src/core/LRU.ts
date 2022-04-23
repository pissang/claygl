import LinkedList, { Entry } from './LinkedList';
import * as util from './util';

interface LRUEntry<T> extends Entry<T> {
  key: string;
}

/**
 * LRU Cache
 * @constructor
 */
class LRU<T> {
  private _list = new LinkedList<T>();
  private _map: Record<string, LRUEntry<T>> = {};
  private _maxSize: number;

  constructor(maxSize: number) {
    this._maxSize = maxSize || 10;
  }

  /**
   * Set cache max size
   * @param size
   */
  setMaxSize(size: number) {
    this._maxSize = size;
  }

  /**
   * Put a value and return removed.
   * @param key
   * @param value
   */
  put(key: string, value: T) {
    if (!util.hasOwn(this._map, key)) {
      const len = this._list.length();
      let removed;
      if (len >= this._maxSize && len > 0) {
        // Remove the least recently used
        const leastUsedEntry = this._list.head as LRUEntry<T>;
        if (leastUsedEntry) {
          removed = leastUsedEntry.value;
          this._list.remove(leastUsedEntry);
          delete this._map[leastUsedEntry.key];
        }
      }

      const entry = this._list.insert(value) as LRUEntry<T>;
      entry.key = key;
      this._map[key] = entry;
      return removed;
    }
  }

  /**
   * @param  key
   * @return
   */
  get(key: string): T | undefined {
    const entry = this._map[key];
    if (util.hasOwn(this._map, key)) {
      // Put the latest used entry in the tail
      if (entry !== this._list.tail) {
        this._list.remove(entry);
        this._list.insertEntry(entry);
      }

      return entry.value;
    }
  }

  /**
   * @param key
   */
  remove(key: string) {
    const entry = this._map[key];
    if (typeof entry !== 'undefined') {
      delete this._map[key];
      this._list.remove(entry);
    }
  }

  /**
   * Clear the cache
   */
  clear() {
    this._list.clear();
    this._map = {};
  }
}

export default LRU;
