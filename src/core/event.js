define( function(require) {

    var Base = require('./base');

    var Event = Base.derive({
        cancelBubble : false
    }, {
        stopPropagation : function() {
            this.cancelBubble = true;
        }
    })

    Event.throw = function(eventType, target, props) {
        
        var e = new Event(props);

        e.type = eventType;
        e.target = target;

        // enable bubbling
        while (target && !e.cancelBubble ) {
            e.currentTarget = target;
            target.trigger(eventType, e);

            target = target.parent;
        }
    }

    return Event;
} )