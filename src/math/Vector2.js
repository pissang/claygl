define(function(require) {

    'use strict';

    var glMatrix = require("glmatrix");
    var vec2 = glMatrix.vec2;

    var Vector2 = function(x, y) {
        
        x = x || 0;
        y = y || 0;

        this._array = vec2.fromValues(x, y);
        // Dirty flag is used by the Node to determine
        // if the matrix is updated to latest
        this._dirty = true;
    }

    Vector2.prototype = {

        constructor : Vector2,

        get x() {
            return this._array[0];
        },

        set x(value) {
            this._array[0] = value;
            this._dirty = true;
        },

        get y() {
            return this._array[1];
        },

        set y(value) {
            this._array[1] = value;
            this._dirty = true;
        },

        add : function(b) {
            vec2.add(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        set : function(x, y) {
            this._array[0] = x;
            this._array[1] = y;
            this._dirty = true;
            return this;
        },

        clone : function() {
            return new Vector2(this.x, this.y);
        },

        copy : function(b) {
            vec2.copy(this._array, b._array);
            this._dirty = true;
            return this;
        },

        cross : function(out, b) {
            vec2.cross(out._array, this._array, b._array);
            return this;
        },

        dist : function(b) {
            return vec2.dist(this._array, b._array);
        },

        distance : function(b) {
            return vec2.distance(this._array, b._array);
        },

        div : function(b) {
            vec2.div(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        divide : function(b) {
            vec2.divide(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        dot : function(b) {
            return vec2.dot(this._array, b._array);
        },

        len : function() {
            return vec2.len(this._array);
        },

        length : function() {
            return vec2.length(this._array);
        },
        /**
         * Perform linear interpolation between a and b
         */
        lerp : function(a, b, t) {
            vec2.lerp(this._array, a._array, b._array, t);
            this._dirty = true;
            return this;
        },

        min : function(b) {
            vec2.min(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        max : function(b) {
            vec2.max(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        mul : function(b) {
            vec2.mul(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        multiply : function(b) {
            vec2.multiply(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        negate : function() {
            vec2.negate(this._array, this._array);
            this._dirty = true;
            return this;
        },

        normalize : function() {
            vec2.normalize(this._array, this._array);
            this._dirty = true;
            return this;
        },

        random : function(scale) {
            vec2.random(this._array, scale);
            this._dirty = true;
            return this;
        },

        scale : function(s) {
            vec2.scale(this._array, this._array, s);
            this._dirty = true;
            return this;
        },
        /**
         * add b by a scaled factor
         */
        scaleAndAdd : function(b, s) {
            vec2.scaleAndAdd(this._array, this._array, b._array, s);
            this._dirty = true;
            return this;
        },

        sqrDist : function(b) {
            return vec2.sqrDist(this._array, b._array);
        },

        squaredDistance : function(b) {
            return vec2.squaredDistance(this._array, b._array);
        },

        sqrLen : function() {
            return vec2.sqrLen(this._array);
        },

        squaredLength : function() {
            return vec2.squaredLength(this._array);
        },

        sub : function(b) {
            vec2.sub(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        subtract : function(b) {
            vec2.subtract(this._array, this._array, b._array);
            this._dirty = true;
            return this;
        },

        transformMat2 : function(m) {
            vec2.transformMat2(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },
        transformMat2d : function(m) {
            vec2.transformMat2d(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },
        transformMat3 : function(m) {
            vec2.transformMat3(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },
        transformMat4 : function(m) {
            vec2.transformMat4(this._array, this._array, m._array);
            this._dirty = true;
            return this;
        },

        toString : function() {
            return "[" + Array.prototype.join.call(this._array, ",") + "]";
        },
    }


    function clamp(x) {
        return Math.min(Math.max(x, -1), 1);
    }

    return Vector2;

})