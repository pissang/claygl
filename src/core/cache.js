define( function(){
    var Cache = function(){

        this._contextId = "",

        this._caches = {},

        this._context = {}

    }

    Cache.prototype = {

        use : function( contextId ){

            if( ! this._caches.hasOwnProperty( contextId ) ){
                this._caches[ contextId ] = {};
            }
            this._contextId = contextId;

            this._context = this._caches[ contextId ];
        },

        put : function(key, value){

            this._context[ key ] = value;
        },

        get : function(key){

            return this._context[ key ];
        },

        clearContext : function(){
            this._caches[ this._contextId ] = {};
            this._context = {};
        },

        'delete' : function( key ){
            delete this._context[ key ];
        },

        clearAll : function(){
            this._caches = {};
        },

        getContext : function(){
            return this._context;
        },

        miss : function( key ){
            return ! this._context.hasOwnProperty( key );
        }
    }

    Cache.prototype.constructor = Cache;

    return Cache;

} )