/**
 * Simple double linked list
 */
define(function(require) {
    
    var LinkedList = function() {

        this.head = null;

        this.tail = null;

        this._length = 0;
    }

    LinkedList.prototype.insert = function(val) {
        var entry = new LinkedList.Entry(val);
        this.insertEntry(entry);
        return entry;
    }

    LinkedList.prototype.insertAt = function(idx, val) {
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
            prev.next = entry;
            entry.prev = prev;
            entry.next = next;
            next.prev = entry;
        } else {
            this.insert(val);
        }
    }

    LinkedList.prototype.insertEntry = function(entry) {
        if (!this.head) {
            this.head = this.tail = entry;
        } else {
            this.tail.next = entry;
            entry.prev = this.tail;
            this.tail = entry;
        }
        this._length++;
    }

    LinkedList.prototype.remove = function(entry) {
        var prev = entry.prev;
        var next = entry.next;
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
        entry.next = entry.prev = null;
        this._length--;
    }

    LinkedList.prototype.removeAt = function(idx) {
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
    }

    LinkedList.prototype.getHead = function() {
        if (this.head) {
            return this.head.value;
        }
    }

    LinkedList.prototype.getTail = function() {
        if (this.tail) {
            return this.tail.value;
        }
    }

    LinkedList.prototype.getAt = function(idx) {
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
    }

    LinkedList.prototype.indexOf = function(value) {
        var curr = this.head;
        var cursor = 0;
        while (curr) {
            if (curr.value === value) {
                return cursor;
            }
            curr = curr.next;
            cursor++;
        }
    }

    LinkedList.prototype.length = function() {
        return this._length;
    }

    LinkedList.prototype.isEmpty = function() {
        return this._length == 0;
    }

    LinkedList.prototype.forEach = function(f, context) {
        var curr = this.head;
        var idx = 0;
        var haveContext = typeof(context) != 'undefined';
        while (curr) {
            if (haveContext) {
                f.call(context, curr.value, idx);
            } else {
                f(curr.value, idx);
            }
            curr = curr.next;
            idx++;
        }
    }

    LinkedList.prototype.clear = function() {
        this.tail = this.head = null;
        this._length = 0;
    }

    LinkedList.Entry = function(val) {

        this.value = val;

        this.next = null;

        this.prev = null;
    }

    return LinkedList;
})