/**
 * Simple double linked list. Compared with array, it has O(1) remove operation.
 * @constructor
 * @alias clay.core.LinkedList
 */
var LinkedList = function () {

    /**
     * @type {clay.core.LinkedList.Entry}
     */
    this.head = null;

    /**
     * @type {clay.core.LinkedList.Entry}
     */
    this.tail = null;

    this._length = 0;
};

/**
 * Insert a new value at the tail
 * @param  {} val
 * @return {clay.core.LinkedList.Entry}
 */
LinkedList.prototype.insert = function (val) {
    var entry = new LinkedList.Entry(val);
    this.insertEntry(entry);
    return entry;
};

/**
 * Insert a new value at idx
 * @param {number} idx
 * @param  {} val
 * @return {clay.core.LinkedList.Entry}
 */
LinkedList.prototype.insertAt = function (idx, val) {
    if (idx < 0) {
        return;
    }
    var next = this.head;
    var cursor = 0;
    while (next && cursor != idx) {
        next = next.next;
        cursor++;
    }
    if (next) {
        var entry = new LinkedList.Entry(val);
        var prev = next.prev;
        if (!prev) { //next is head
            this.head = entry;
        }
        else {
            prev.next = entry;
            entry.prev = prev;
        }
        entry.next = next;
        next.prev = entry;
    }
    else {
        this.insert(val);
    }
};

LinkedList.prototype.insertBeforeEntry = function (val, next) {
    var entry = new LinkedList.Entry(val);
    var prev = next.prev;
    if (!prev) { //next is head
        this.head = entry;
    }
    else {
        prev.next = entry;
        entry.prev = prev;
    }
    entry.next = next;
    next.prev = entry;

    this._length++;
};

/**
 * Insert an entry at the tail
 * @param  {clay.core.LinkedList.Entry} entry
 */
LinkedList.prototype.insertEntry = function (entry) {
    if (!this.head) {
        this.head = this.tail = entry;
    }
    else {
        this.tail.next = entry;
        entry.prev = this.tail;
        this.tail = entry;
    }
    this._length++;
};

/**
 * Remove entry.
 * @param  {clay.core.LinkedList.Entry} entry
 */
LinkedList.prototype.remove = function (entry) {
    var prev = entry.prev;
    var next = entry.next;
    if (prev) {
        prev.next = next;
    }
    else {
        // Is head
        this.head = next;
    }
    if (next) {
        next.prev = prev;
    }
    else {
        // Is tail
        this.tail = prev;
    }
    entry.next = entry.prev = null;
    this._length--;
};

/**
 * Remove entry at index.
 * @param  {number} idx
 * @return {}
 */
LinkedList.prototype.removeAt = function (idx) {
    if (idx < 0) {
        return;
    }
    var curr = this.head;
    var cursor = 0;
    while (curr && cursor != idx) {
        curr = curr.next;
        cursor++;
    }
    if (curr) {
        this.remove(curr);
        return curr.value;
    }
};
/**
 * Get head value
 * @return {}
 */
LinkedList.prototype.getHead = function () {
    if (this.head) {
        return this.head.value;
    }
};
/**
 * Get tail value
 * @return {}
 */
LinkedList.prototype.getTail = function () {
    if (this.tail) {
        return this.tail.value;
    }
};
/**
 * Get value at idx
 * @param {number} idx
 * @return {}
 */
LinkedList.prototype.getAt = function (idx) {
    if (idx < 0) {
        return;
    }
    var curr = this.head;
    var cursor = 0;
    while (curr && cursor != idx) {
        curr = curr.next;
        cursor++;
    }
    return curr.value;
};

/**
 * @param  {} value
 * @return {number}
 */
LinkedList.prototype.indexOf = function (value) {
    var curr = this.head;
    var cursor = 0;
    while (curr) {
        if (curr.value === value) {
            return cursor;
        }
        curr = curr.next;
        cursor++;
    }
};

/**
 * @return {number}
 */
LinkedList.prototype.length = function () {
    return this._length;
};

/**
 * If list is empty
 */
LinkedList.prototype.isEmpty = function () {
    return this._length === 0;
};

/**
 * @param  {Function} cb
 * @param  {} context
 */
LinkedList.prototype.forEach = function (cb, context) {
    var curr = this.head;
    var idx = 0;
    var haveContext = typeof(context) != 'undefined';
    while (curr) {
        if (haveContext) {
            cb.call(context, curr.value, idx);
        }
        else {
            cb(curr.value, idx);
        }
        curr = curr.next;
        idx++;
    }
};

/**
 * Clear the list
 */
LinkedList.prototype.clear = function () {
    this.tail = this.head = null;
    this._length = 0;
};

/**
 * @constructor
 * @param {} val
 */
LinkedList.Entry = function (val) {
    /**
     * @type {}
     */
    this.value = val;

    /**
     * @type {clay.core.LinkedList.Entry}
     */
    this.next = null;

    /**
     * @type {clay.core.LinkedList.Entry}
     */
    this.prev = null;
};

export default LinkedList;
