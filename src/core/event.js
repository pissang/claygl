define( function(require){

    var Base = require('./base');

    var Event = Base.derive({
        cancelBubble : false
    }, {
        stopPropagation : function(){
            this.cancelBubble = true;
        }
    })

    Event.throw = function(eventType, target, props){
        var e = new MouseEvent(props);
        e.sourceTarget = target;

        // enable bubble
        while(target && !e.cancelBubble ){
            e.target = target;
            target.trigger(eventType, e);

            target = target.parent;
        }
    }
} )