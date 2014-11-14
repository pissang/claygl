define( function(require) {

    'use strict';

    var Base = require('./Base');

    var QEvent = Base.derive({
        cancelBubble : false
    }, {
        stopPropagation : function() {
            this.cancelBubble = true;
        }
    });

    QEvent['throw'] = function(eventType, target, props) {
        
        var e = new QEvent(props);

        e.type = eventType;
        e.target = target;

        // enable bubbling
        while (target && !e.cancelBubble) {
            e.currentTarget = target;
            target.trigger(eventType, e);

            target = target.getParent();
        }
    };

    return QEvent;
});