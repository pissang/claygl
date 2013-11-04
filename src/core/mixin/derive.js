define(function() {

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
        _.extend(this, typeof makeDefaultOpt == "function" ?
                        makeDefaultOpt.call(this) : makeDefaultOpt);

        _.extend(this, options);

        if (this.constructor == sub) {
            // find the base class, and the initialize function will be called 
            // in the order of inherit
            var base = sub;
            var initializeChain = [initialize];
            while (base.__super__) {
                base = base.__super__;
                initializeChain.unshift(base.__initialize__);
            }
            for (var i = 0; i < initializeChain.length; i++) {
                if (initializeChain[i]) {
                    initializeChain[i].call(this);
                }
            }
        }
    };
    // save super constructor
    sub.__super__ = _super;
    // initialize function will be called after all the super constructor is called
    sub.__initialize__ = initialize;

    var Ghost = function() {this.constructor = sub};
    Ghost.prototype = _super.prototype;
    sub.prototype = new Ghost();
    _.extend(sub.prototype, proto);
    
    // extend the derive method as a static method;
    sub.derive = _super.derive;

    return sub;
}

return {
    derive : derive
}

})