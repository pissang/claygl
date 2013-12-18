define(function() {

    var Cache = function() {

        this._contextId = 0;

        this._caches = [];

        this._context = {};
    }

    Cache.prototype = {

        use : function(contextId, documentSchema) {

            if (! this._caches[contextId]) {
                this._caches[contextId] = {};

                if (documentSchema) {
                    this._caches[contextId] = documentSchema();
                }
            }
            this._contextId = contextId;

            this._context = this._caches[contextId];
        },

        put : function(key, value) {
            this._context[key] = value;
        },

        get : function(key) {
            return this._context[key];
        },

        dirty : function(field) {
            field = field || "";
            var key = "__dirty__" + field;
            this.put(key, true)
        },
        
        dirtyAll : function(field) {
            field = field || "";
            var key = "__dirty__" + field;
            for (var i = 0; i < this._caches.length; i++) {
                if (this._caches[i]) {
                    this._caches[i][key] = true;
                }
            }
        },

        fresh : function(field) {
            field = field || "";
            var key = "__dirty__" + field;
            this.put(key, false);
        },

        freshAll : function(field) {
            field = field || "";
            var key = "__dirty__" + field;
            for (var i = 0; i < this._caches.length; i++) {
                if (this._caches[i]) {
                    this._caches[i][key] = false;
                }
            }
        },

        isDirty : function(field) {
            field = field || "";
            var key = "__dirty__" + field;
            return  !this._context.hasOwnProperty(key)
                    || this._context[key] === true
        },

        clearContext : function() {
            this._caches[this._contextId] = {};
            this._context = {};
        },

        deleteContext : function(contextId) {
            this._caches[contextId] = {};
            this._context = {};
        },

        'delete' : function(key) {
            delete this._context[key];
        },

        clearAll : function() {
            this._caches = {};
        },

        getContext : function() {
            return this._context;
        },

        miss : function(key) {
            return ! this._context.hasOwnProperty(key);
        }
    }

    Cache.prototype.constructor = Cache;

    return Cache;

})