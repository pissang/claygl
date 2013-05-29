define(function(require){
    
    var Controller = require('./controller');
    var _ = require("_");

    var Animation = function(options){

        options = options || {};

        this.stage = options.stage || {};

        this.fps = options.fps || 50;

        this.onframe = options.onframe || function(){};

        // private properties
        this._controllerPool = [];

        this._timer = null;
    };

    Animation.prototype = {
        add : function(controller){
            this._controllerPool.push(controller);
        },
        remove : function(controller){
            var idx = this._controllerPool.indexOf(controller);
            if (idx >= 0){
                this._controllerPool.splice(idx, 1);
            }
        },
        update : function(){
            var time = new Date().getTime();
            var cp = this._controllerPool;
            var len = cp.length;

            var deferredEvents = [];
            var deferredCtls = [];
            for(var i = 0; i < len; i++){
                var controller = cp[i];
                var e = controller.step(time);
                // Throw out the events need to be called after
                // stage.update, like destroy
                if( e ){
                    deferredEvents.push(e);
                    deferredCtls.push(controller);
                }
            }
            if (this.stage
                && this.stage.update
                && this._controllerPool.length
            ){
                this.stage.update();
            }

            // Remove the finished controller
            var newArray = [];
            for(var i = 0; i < len; i++){
                if(!cp[i]._needsRemove){
                    newArray.push(cp[i]);
                    cp[i]._needsRemove = false;
                }
            }
            this._controllerPool = newArray;

            len = deferredEvents.length;
            for(var i = 0; i < len; i++){
                deferredCtls[i].fire( deferredEvents[i] );
            }

            this.onframe();

        },
        start : function(){
            if (this._timer){
                clearInterval(this._timer);
            }
            var self = this;
            this._timer = setInterval(function(){
                self.update();
            }, 1000/this.fps);
        },
        stop : function(){
            if (this._timer){
                clearInterval(this._timer);
            }
        },
        clear : function(){
            this._controllerPool = [];
        },
        animate : function(target, loop, getter, setter){
            var deferred = new Deferred(target, loop, getter, setter);
            deferred.animation = this;
            return deferred;
        }
    };
    Animation.prototype.constructor = Animation;

    function _defaultGetter(target, key){
        return target[key];
    }
    function _defaultSetter(target, key, value){
        target[key] = value;
    }
    // Interpolate recursively
    // TODO interpolate objects
    function _interpolate(prevValue, nextValue, percent, target, propName, getter, setter){
         // 遍历数组做插值
        if (prevValue instanceof Array
            && nextValue instanceof Array
        ){
            var minLen = Math.min(prevValue.length, nextValue.length);
            var largerArray;
            var maxLen;
            var result = [];
            if (minLen === prevValue.length){
                maxLen = nextValue.length;
                largerArray = nextValue;
            }else{
                maxLen = prevValue.length;
                largerArray = prevValue.length;
            }
            for(var i = 0; i < minLen; i++){
                // target[propName] as new target,
                // i as new propName
                result.push(_interpolate(
                        prevValue[i],
                        nextValue[i],
                        percent,
                        getter(target, propName),
                        i,
                        getter,
                        setter
                ));
            }
            // Assign the rest
            for(var i = minLen; i < maxLen; i++){
                result.push(largerArray[i]);
            }

            setter(target, propName, result);
        }
        else{
            prevValue = parseFloat(prevValue);
            nextValue = parseFloat(nextValue);
            if (!isNaN(prevValue) && !isNaN(nextValue)){
                var value = (nextValue-prevValue) * percent+prevValue;
                setter(target, propName, value);
                return value;
            }
        }
    }
    function Deferred(target, loop, getter, setter){
        this._tracks = {};
        this._target = target;

        this._loop = loop || false;

        this._getter = getter || _defaultGetter;
        this._setter = setter || _defaultSetter;

        this._controllerCount = 0;

        this._doneList = [];

        this._onframeList = [];

        this._controllerList = [];
    }

    Deferred.prototype = {
        when : function(time /* ms */, props, easing){
            for(var propName in props){
                if (! this._tracks[ propName ]){
                    this._tracks[ propName ] = [];
                    // Initialize value
                    this._tracks[ propName ].push({
                        time : 0,
                        value : this._getter(this._target, propName)
                    });
                }
                this._tracks[ propName ].push({
                    time : time,
                    value : props[ propName ],
                    easing : easing
                });
            }
            return this;
        },
        during : function(callback){
            this._onframeList.push(callback);
            return this;
        },
        start : function(){
            var self = this;
            var delay;
            var track;
            var trackMaxTime;

            function createOnframe(now, next, propName){
                var prevValue = clone(now.value);
                var nextValue = clone(next.value);
                return function(target, schedule){
                    _interpolate(
                        prevValue,
                        nextValue,
                        schedule,
                        target,
                        propName,
                        self._getter,
                        self._setter
                    );
                    for(var i = 0; i < self._onframeList.length; i++){
                        self._onframeList[i](target, schedule);
                    }
                };
            }

            function ondestroy(){
                self._controllerCount--;
                if (self._controllerCount === 0){
                    var len = self._doneList.length;
                    for(var i = 0; i < len; i++){
                        self._doneList[i]();
                    }
                }
            }

            for(var propName in this._tracks){
                delay = 0;
                track = this._tracks[ propName ];
                if (track.length){
                    trackMaxTime = track[ track.length-1].time;
                }else{
                    continue;
                }
                for(var i = 0; i < track.length-1; i++){
                    var now = track[i],
                        next = track[i+1];

                    var controller = new Controller({
                        target : self._target,
                        life : next.time - now.time,
                        delay : delay,
                        loop : self._loop,
                        gap : trackMaxTime - (next.time - now.time),
                        easing : next.easing,
                        onframe : createOnframe(now, next, propName),
                        ondestroy : ondestroy
                    });
                    this._controllerList.push(controller);

                    this._controllerCount++;
                    delay = next.time;

                    self.animation.add(controller);
                }
            }
            return this;
        },
        stop : function(){
            for(var i = 0; i < this._controllerList.length; i++){
                var controller = this._controllerList[i];
                this.animation.remove(controller);
            }
        },
        done : function(func){
            this._doneList.push(func);
            return this;
        }
    };

    function clone(value){
        if (value && value instanceof Array){
            return Array.prototype.slice.call(value);
        }
        else {
            return value;
        }
    }

    return Animation;
});
