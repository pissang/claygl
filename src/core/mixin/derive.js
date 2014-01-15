define(function(require) {

'use strict';

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

    var propList;
    if (! (makeDefaultOpt instanceof Function)) {
        // Optimize the property iterate if it have been fixed
        propList = [];
        for (var propName in makeDefaultOpt) {
            if (makeDefaultOpt.hasOwnProperty(propName)) {
                propList.push(propName);
            }
        }
    }

    var sub = function(options) {

        // call super constructor
        _super.call(this);

        if (makeDefaultOpt instanceof Function) {
            // call defaultOpt generate function each time
            // if it is a function, So we can make sure each 
            // property in the object is fresh
            extend(this, makeDefaultOpt.call(this));
        } else {
            extendWithPropList(this, makeDefaultOpt, propList);
        }
        
        if (options) {
            extend(this, options);
        }

        if (this.constructor === sub) {
            // initialize function will be called in the order of inherit
            var base = sub;
            var initializers = sub.__initializer__;
            for (var i = 0; i < initializers.length; i++) {
                initializers[i].call(this);
            }
        }
    };
    // save super constructor
    sub.__super__ = _super;
    // initialize function will be called after all the super constructor is called
    if (!_super.__initializer__) {
        sub.__initializer__ = [];
    } else {
        sub.__initializer__ = _super.__initializer__.slice();
    }
    if (initialize) {
        sub.__initializer__.push(initialize);
    }

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
    if (!source) {
        return;
    }
    for (var name in source) {
        if (source.hasOwnProperty(name)) {
            target[name] = source[name];
        }
    }
}

function extendWithPropList(target, source, propList) {
    for (var i = 0; i < propList.length; i++) {
        var propName = propList[i];
        target[propName] = source[propName];
    }   
}

return {
    derive : derive
}

});