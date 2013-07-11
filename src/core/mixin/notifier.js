/**
 * Event interface
 *
 * @method on(eventName, handler[, context])
 * @method trigger(eventName[, arg1[, arg2]])
 * @method off(eventName[, handler])
 * @method has(eventName)
 * @export{object}
 */
define(function() {

    return{
        trigger : function() {
            if ( ! this.__handlers__) {
                return;
            }
            var name = arguments[0];
            var params = Array.prototype.slice.call( arguments, 1 );

            var handlers = this.__handlers__[ name ];
            if (handlers) {
                for (var i = 0; i < handlers.length; i+=2) {
                    var handler = handlers[i],
                        context = handlers[i+1];
                    handler.apply(context || this, params);
                }
            }
        },
        
        on : function( target, handler, context/*optional*/ ) {

            if (!target) {
                return;
            }
            var handlers = this.__handlers__ || ( this.__handlers__={} );
            if ( ! handlers[target]) {
                handlers[target] = [];
            }
            if (handlers[target].indexOf(handler) == -1) {
                // structure in list
                // [handler,context,handler,context,handler,context..]
                handlers[target].push( handler );
                handlers[target].push( context );
            }

            return handler;
        },

        off : function( target, handler ) {
            
            var handlers = this.__handlers__ || ( this.__handlers__={} );

            if (handlers[target]) {
                if (handler) {
                    var arr = handlers[target];
                    // remove handler and context
                    var idx = arr.indexOf(handler);
                    if( idx >= 0)
                        arr.splice( idx, 2 );
                } else {
                    handlers[target] = [];
                }
            }
        },

        has : function( target, handler ) {
            if ( ! this.__handlers__ ||
                ! this.__handlers__[target]) {
                return false;
            }
            if ( ! handler) {
                return this.__handlers__[target].length;
            } else {
                return this.__handlers__[target].indexOf( handler ) !== -1;
            }
        }
    }
    
});