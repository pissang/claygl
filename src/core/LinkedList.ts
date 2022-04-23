/**
 * Simple double linked list. Compared with array, it has O(1) remove operation.
 * @constructor
 * @alias clay.core.LinkedList
 */

export class Entry<T> {
  value: T;
  next?: Entry<T>;
  prev?: Entry<T>;
  constructor(val: T) {
    /**
     * @type {}
     */
    this.value = val;
  }
}
class LinkedList<T> {
  head?: Entry<T>;
  tail?: Entry<T>;

  private _length = 0;
  constructor() {}

  /**
   * Insert a new value at the tail
   */
  insert(val: T) {
    const entry = new Entry(val);
    this.insertEntry(entry);
    return entry;
  }

  /**
   * Insert a new value at idx
   * @param idx
   * @param val
   */
  insertAt(idx: number, val: T) {
    if (idx < 0) {
      return;
    }
    let next = this.head;
    let cursor = 0;
    while (next && cursor != idx) {
      next = next.next;
      cursor++;
    }
    if (next) {
      const entry = new Entry(val);
      const prev = next.prev;
      if (!prev) {
        //next is head
        this.head = entry;
      } else {
        prev.next = entry;
        entry.prev = prev;
      }
      entry.next = next;
      next.prev = entry;
    } else {
      this.insert(val);
    }
  }

  insertBeforeEntry(val: T, next: Entry<T>) {
    const entry = new Entry(val);
    const prev = next.prev;
    if (!prev) {
      //next is head
      this.head = entry;
    } else {
      prev.next = entry;
      entry.prev = prev;
    }
    entry.next = next;
    next.prev = entry;

    this._length++;
  }

  /**
   * Insert an entry at the tail
   * @param  entry
   */
  insertEntry(entry: Entry<T>) {
    if (!this.head) {
      this.head = this.tail = entry;
    } else {
      this.tail!.next = entry;
      entry.prev = this.tail;
      this.tail = entry;
    }
    this._length++;
  }

  /**
   * Remove entry.
   * @param  entry
   */
  remove(entry: Entry<T>) {
    const prev = entry.prev;
    const next = entry.next;
    if (prev) {
      prev.next = next;
    } else {
      // Is head
      this.head = next;
    }
    if (next) {
      next.prev = prev;
    } else {
      // Is tail
      this.tail = prev;
    }
    entry.next = entry.prev = undefined;
    this._length--;
  }

  /**
   * Remove entry at index.
   * @param  idx
   * @return
   */
  removeAt(idx: number) {
    if (idx < 0) {
      return;
    }
    let curr = this.head;
    let cursor = 0;
    while (curr && cursor != idx) {
      curr = curr.next;
      cursor++;
    }
    if (curr) {
      this.remove(curr);
      return curr.value;
    }
  }
  /**
   * Get head value
   * @return {}
   */
  getHead() {
    if (this.head) {
      return this.head.value;
    }
  }
  /**
   * Get tail value
   * @return {}
   */
  getTail() {
    if (this.tail) {
      return this.tail.value;
    }
  }
  /**
   * Get value at idx
   * @param idx
   * @return
   */
  getAt(idx: number): T | undefined {
    if (idx < 0) {
      return;
    }
    let curr = this.head;
    let cursor = 0;
    while (curr && cursor != idx) {
      curr = curr.next;
      cursor++;
    }
    return curr && curr.value;
  }

  /**
   * @param  value
   */
  indexOf(value: T): number {
    let curr = this.head;
    let cursor = 0;
    while (curr) {
      if (curr.value === value) {
        return cursor;
      }
      curr = curr.next;
      cursor++;
    }
    return -1;
  }

  /**
   * Length of list
   */
  length(): number {
    return this._length;
  }

  /**
   * If list is empty
   */
  isEmpty() {
    return this._length === 0;
  }

  /**
   * @param  cb
   * @param  context
   */
  forEach(cb: (value: T, idx: number) => void) {
    let curr = this.head;
    let idx = 0;
    while (curr) {
      cb(curr.value, idx);
      curr = curr.next;
      idx++;
    }
  }

  /**
   * Clear the list
   */
  clear() {
    this.tail = this.head = undefined;
    this._length = 0;
  }
}

export default LinkedList;
