define(function() {

    'use strict';

    var DIRTY_PREFIX = '__dirty__';

    var Cache = function() {

        this._contextId = 0;

        this._caches = [];

        this._context = {};
    };

    Cache.prototype = {

        use: function(contextId, documentSchema) {
            var caches = this._caches;
            if (! caches[contextId]) {
                caches[contextId] = {};

                if (documentSchema) {
                    caches[contextId] = documentSchema();
                }
            }
            this._contextId = contextId;

            this._context = caches[contextId];
        },

        put: function(key, value) {
            this._context[key] = value;
        },

        get: function(key) {
            return this._context[key];
        },

        dirty: function(field) {
            field = field || '';
            var key = DIRTY_PREFIX + field;
            this.put(key, true);
        },
        
        dirtyAll: function(field) {
            field = field || '';
            var key = DIRTY_PREFIX + field;
            var caches = this._caches;
            for (var i = 0; i < caches.length; i++) {
                if (caches[i]) {
                    caches[i][key] = true;
                }
            }
        },

        fresh: function(field) {
            field = field || '';
            var key = DIRTY_PREFIX + field;
            this.put(key, false);
        },

        freshAll: function(field) {
            field = field || '';
            var key = DIRTY_PREFIX + field;
            var caches = this._caches;
            for (var i = 0; i < caches.length; i++) {
                if (caches[i]) {
                    caches[i][key] = false;
                }
            }
        },

        isDirty: function(field) {
            field = field || '';
            var key = DIRTY_PREFIX + field;
            var context = this._context;
            return  !context.hasOwnProperty(key)
                || context[key] === true;
        },

        deleteContext: function(contextId) {
            delete this._caches[contextId];
            this._context = {};
        },

        'delete': function(key) {
            delete this._context[key];
        },

        clearAll: function() {
            this._caches = {};
        },

        getContext: function() {
            return this._context;
        },

        miss: function(key) {
            return ! this._context.hasOwnProperty(key);
        }
    };

    Cache.prototype.constructor = Cache;

    return Cache;

});