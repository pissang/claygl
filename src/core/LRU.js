define(function(require) {

    var LinkedList = require('./LinkedList');

    var LRU = function(maxSize) {

        this._list = new LinkedList();

        this._map = {};

        this._maxSize = maxSize || 10;
    }

    LRU.prototype.setMaxSize = function(size) {
        this._maxSize = size;
    }

    LRU.prototype.put = function(key, value) {
        if (typeof(this._map[key]) == 'undefined') {
            var len = this._list.length();
            if (len >= this._maxSize && len > 0) {
                // Remove the least recently used
                var leastUsedEntry = this._list.head;
                this._list.remove(leastUsedEntry);
                delete this._map[leastUsedEntry.key];
            }

            var entry = this._list.insert(value);
            entry.key = key;
            this._map[key] = entry;
        }
    }

    LRU.prototype.get = function(key) {
        var entry = this._map[key];
        if (typeof(entry) != 'undefined') {
            // Put the latest used entry in the tail
            if (entry !== this._list.tail) {
                this._list.remove(entry);
                this._list.insertEntry(entry);
            }

            return entry.value;
        }
    }

    LRU.prototype.remove = function(key) {
        var entry = this._map[key];
        if (typeof(entry) != 'undefined') {
            delete this._map[key];
            this._list.remove(entry);
        }
    }

    LRU.prototype.clear = function() {
        this._list.clear();
        this._map = {};
    }

    return LRU;
});