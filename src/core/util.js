var guid = 0;

var ArrayProto = Array.prototype;
var nativeForEach = ArrayProto.forEach;

/**
 * Util functions
 * @namespace clay.core.util
 */
var util = {

    /**
     * Generate GUID
     * @return {number}
     * @memberOf clay.core.util
     */
    genGUID: function () {
        return ++guid;
    },
    /**
     * Relative path to absolute path
     * @param  {string} path
     * @param  {string} basePath
     * @return {string}
     * @memberOf clay.core.util
     */
    relative2absolute: function (path, basePath) {
        if (!basePath || path.match(/^\//)) {
            return path;
        }
        var pathParts = path.split('/');
        var basePathParts = basePath.split('/');

        var item = pathParts[0];
        while(item === '.' || item === '..') {
            if (item === '..') {
                basePathParts.pop();
            }
            pathParts.shift();
            item = pathParts[0];
        }
        return basePathParts.join('/') + '/' + pathParts.join('/');
    },

    /**
     * Extend target with source
     * @param  {Object} target
     * @param  {Object} source
     * @return {Object}
     * @memberOf clay.core.util
     */
    extend: function (target, source) {
        if (source) {
            for (var name in source) {
                if (source.hasOwnProperty(name)) {
                    target[name] = source[name];
                }
            }
        }
        return target;
    },

    /**
     * Extend properties to target if not exist.
     * @param  {Object} target
     * @param  {Object} source
     * @return {Object}
     * @memberOf clay.core.util
     */
    defaults: function (target, source) {
        if (source) {
            for (var propName in source) {
                if (target[propName] === undefined) {
                    target[propName] = source[propName];
                }
            }
        }
        return target;
    },
    /**
     * Extend properties with a given property list to avoid for..in.. iteration.
     * @param  {Object} target
     * @param  {Object} source
     * @param  {Array.<string>} propList
     * @return {Object}
     * @memberOf clay.core.util
     */
    extendWithPropList: function (target, source, propList) {
        if (source) {
            for (var i = 0; i < propList.length; i++) {
                var propName = propList[i];
                target[propName] = source[propName];
            }
        }
        return target;
    },
    /**
     * Extend properties to target if not exist. With a given property list avoid for..in.. iteration.
     * @param  {Object} target
     * @param  {Object} source
     * @param  {Array.<string>} propList
     * @return {Object}
     * @memberOf clay.core.util
     */
    defaultsWithPropList: function (target, source, propList) {
        if (source) {
            for (var i = 0; i < propList.length; i++) {
                var propName = propList[i];
                if (target[propName] == null) {
                    target[propName] = source[propName];
                }
            }
        }
        return target;
    },
    /**
     * @param  {Object|Array} obj
     * @param  {Function} iterator
     * @param  {Object} [context]
     * @memberOf clay.core.util
     */
    each: function (obj, iterator, context) {
        if (!(obj && iterator)) {
            return;
        }
        if (obj.forEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
        }
        else if (obj.length === + obj.length) {
            for (var i = 0, len = obj.length; i < len; i++) {
                iterator.call(context, obj[i], i, obj);
            }
        }
        else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    iterator.call(context, obj[key], key, obj);
                }
            }
        }
    },

    /**
     * Is object
     * @param  {}  obj
     * @return {boolean}
     * @memberOf clay.core.util
     */
    isObject: function (obj) {
        return obj === Object(obj);
    },

    /**
     * Is array ?
     * @param  {}  obj
     * @return {boolean}
     * @memberOf clay.core.util
     */
    isArray: function (obj) {
        return Array.isArray(obj);
    },

    /**
     * Is array like, which have a length property
     * @param  {}  obj
     * @return {boolean}
     * @memberOf clay.core.util
     */
    isArrayLike: function (obj) {
        if (!obj) {
            return false;
        }
        else {
            return obj.length === + obj.length;
        }
    },

    /**
     * @param  {} obj
     * @return {}
     * @memberOf clay.core.util
     */
    clone: function (obj) {
        if (!util.isObject(obj)) {
            return obj;
        }
        else if (util.isArray(obj)) {
            return obj.slice();
        }
        else if (util.isArrayLike(obj)) { // is typed array
            var ret = new obj.constructor(obj.length);
            for (var i = 0; i < obj.length; i++) {
                ret[i] = obj[i];
            }
            return ret;
        }
        else {
            return util.extend({}, obj);
        }
    }
};

export default util;
