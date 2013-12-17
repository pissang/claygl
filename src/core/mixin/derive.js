define(function(require) {

/**
 * derive a sub class from base class
 * @makeDefaultOpt [Object|Function] default option of this sub class, 
                        method of the sub can use this.xxx to access this option
 * @initialize [Function](optional) initialize after the sub class is instantiated
 * @proto [Object](optional) prototype methods/property of the sub class
 *
 * @export{object}
 */
function derive(makeDefaultOpt, initialize/*optional*/, proto/*optional*/) {

    if (typeof initialize == "object") {
        proto = initialize;
        initialize = null;
    }

    var _super = this;

    var sub = function(options) {

        // call super constructor
        _super.call(this);

        // call defaultOpt generate function each time
        // if it is a function, So we can make sure each 
        // property in the object is fresh
        extend(this, typeof makeDefaultOpt == "function" ?
                        makeDefaultOpt.call(this) : makeDefaultOpt);
        if (options) {
            extend(this, options);
        }

        if (this.constructor === sub) {
            // find the base class, and the initialize function will be called 
            // in the order of inherit
            var base = sub;
            var initializeChain = [];
            while (base) {
                if (base.__initialize__) {
                    initializeChain.push(base.__initialize__);
                }
                base = base.__super__;
            }
            for (var i = initializeChain.length - 1; i >= 0; i--) {
                initializeChain[i].call(this);
            }
        }
    };
    // save super constructor
    sub.__super__ = _super;
    // initialize function will be called after all the super constructor is called
    sub.__initialize__ = initialize;

    var Ctor = function() {};
    Ctor.prototype = _super.prototype;
    sub.prototype = new Ctor();
    sub.prototype.constructor = sub;
    extend(sub.prototype, proto);
    
    // extend the derive method as a static method;
    sub.derive = _super.derive;

    return sub;
}

function extend(target, source) {
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            target[name] = source[name];
        }
    }
}

return {
    derive : derive
}

});