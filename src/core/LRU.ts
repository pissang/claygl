// @ts-nocheck
import LinkedList from './LinkedList';
import util from './util';

/**
 * LRU Cache
 * @constructor
 * @alias clay.core.LRU
 */
const LRU = function (maxSize) {
  this._list = new LinkedList();

  this._map = {};

  this._maxSize = maxSize || 10;
};

/**
 * Set cache max size
 * @param {number} size
 */
LRU.prototype.setMaxSize = function (size) {
  this._maxSize = size;
};

/**
 * @param  {string} key
 * @param  {} value
 */
LRU.prototype.put = function (key, value) {
  if (!util.hasOwn(this._map, key)) {
    const len = this._list.length();
    if (len >= this._maxSize && len > 0) {
      // Remove the least recently used
      const leastUsedEntry = this._list.head;
      this._list.remove(leastUsedEntry);
      delete this._map[leastUsedEntry.key];
    }

    const entry = this._list.insert(value);
    entry.key = key;
    this._map[key] = entry;
  }
};

/**
 * @param  {string} key
 * @return {}
 */
LRU.prototype.get = function (key) {
  const entry = this._map[key];
  if (util.hasOwn(this._map, key)) {
    // Put the latest used entry in the tail
    if (entry !== this._list.tail) {
      this._list.remove(entry);
      this._list.insertEntry(entry);
    }

    return entry.value;
  }
};

/**
 * @param {string} key
 */
LRU.prototype.remove = function (key) {
  const entry = this._map[key];
  if (typeof entry !== 'undefined') {
    delete this._map[key];
    this._list.remove(entry);
  }
};

/**
 * Clear the cache
 */
LRU.prototype.clear = function () {
  this._list.clear();
  this._map = {};
};

export default LRU;
