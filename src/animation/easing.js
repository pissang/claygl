// 缓动函数来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
define(function() {

    /** 
     * @namespace qtek.animation.easing
     */
    var easing = {
        /**
         * @alias qtek.animation.easing.Linear
         * @param {number} k
         * @return {number}
         */
        Linear: function(k) {
            return k;
        },
        /**
         * @alias qtek.animation.easing.QuadraticIn
         * @param {number} k
         * @return {number}
         */
        QuadraticIn: function(k) {
            return k * k;
        },
        /**
         * @alias qtek.animation.easing.QuadraticOut
         * @param {number} k
         * @return {number}
         */
        QuadraticOut: function(k) {
            return k * (2 - k);
        },
        /**
         * @alias qtek.animation.easing.QuadraticInOut
         * @param {number} k
         * @return {number}
         */
        QuadraticInOut: function(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k;
            }
            return - 0.5 * (--k * (k - 2) - 1);
        },
        /**
         * @alias qtek.animation.easing.CubicIn
         * @param {number} k
         * @return {number}
         */
        CubicIn: function(k) {
            return k * k * k;
        },
        /**
         * @alias qtek.animation.easing.CubicOut
         * @param {number} k
         * @return {number}
         */
        CubicOut: function(k) {
            return --k * k * k + 1;
        },
        /**
         * @alias qtek.animation.easing.CubicInOut
         * @param {number} k
         * @return {number}
         */
        CubicInOut: function(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k * k;
            }
            return 0.5 * ((k -= 2) * k * k + 2);
        },
        /**
         * @alias qtek.animation.easing.QuarticIn
         * @param {number} k
         * @return {number}
         */
        QuarticIn: function(k) {
            return k * k * k * k;
        },
        /**
         * @alias qtek.animation.easing.QuarticOut
         * @param {number} k
         * @return {number}
         */
        QuarticOut: function(k) {
            return 1 - (--k * k * k * k);
        },
        /**
         * @alias qtek.animation.easing.QuarticInOut
         * @param {number} k
         * @return {number}
         */
        QuarticInOut: function(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k * k * k;
            }
            return - 0.5 * ((k -= 2) * k * k * k - 2);
        },
        /**
         * @alias qtek.animation.easing.QuinticIn
         * @param {number} k
         * @return {number}
         */
        QuinticIn: function(k) {
            return k * k * k * k * k;
        },
        /**
         * @alias qtek.animation.easing.QuinticOut
         * @param {number} k
         * @return {number}
         */
        QuinticOut: function(k) {
            return --k * k * k * k * k + 1;
        },
        /**
         * @alias qtek.animation.easing.QuinticInOut
         * @param {number} k
         * @return {number}
         */
        QuinticInOut: function(k) {
            if ((k *= 2) < 1) {
                return 0.5 * k * k * k * k * k;
            }
            return 0.5 * ((k -= 2) * k * k * k * k + 2);
        },
        /**
         * @alias qtek.animation.easing.SinusoidalIn
         * @param {number} k
         * @return {number}
         */
        SinusoidalIn: function(k) {
            return 1 - Math.cos(k * Math.PI / 2);
        },
        /**
         * @alias qtek.animation.easing.SinusoidalOut
         * @param {number} k
         * @return {number}
         */
        SinusoidalOut: function(k) {
            return Math.sin(k * Math.PI / 2);
        },
        /**
         * @alias qtek.animation.easing.SinusoidalInOut
         * @param {number} k
         * @return {number}
         */
        SinusoidalInOut: function(k) {
            return 0.5 * (1 - Math.cos(Math.PI * k));
        },
        /**
         * @alias qtek.animation.easing.ExponentialIn
         * @param {number} k
         * @return {number}
         */
        ExponentialIn: function(k) {
            return k === 0 ? 0 : Math.pow(1024, k - 1);
        },
        /**
         * @alias qtek.animation.easing.ExponentialOut
         * @param {number} k
         * @return {number}
         */
        ExponentialOut: function(k) {
            return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);
        },
        /**
         * @alias qtek.animation.easing.ExponentialInOut
         * @param {number} k
         * @return {number}
         */
        ExponentialInOut: function(k) {
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if ((k *= 2) < 1) {
                return 0.5 * Math.pow(1024, k - 1);
            }
            return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);
        },
        /**
         * @alias qtek.animation.easing.CircularIn
         * @param {number} k
         * @return {number}
         */
        CircularIn: function(k) {
            return 1 - Math.sqrt(1 - k * k);
        },
        /**
         * @alias qtek.animation.easing.CircularOut
         * @param {number} k
         * @return {number}
         */
        CircularOut: function(k) {
            return Math.sqrt(1 - (--k * k));
        },
        /**
         * @alias qtek.animation.easing.CircularInOut
         * @param {number} k
         * @return {number}
         */
        CircularInOut: function(k) {
            if ((k *= 2) < 1) {
                return - 0.5 * (Math.sqrt(1 - k * k) - 1);
            }
            return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
        },
        /**
         * @alias qtek.animation.easing.ElasticIn
         * @param {number} k
         * @return {number}
         */
        ElasticIn: function(k) {
            var s, a = 0.1, p = 0.4;
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if (!a || a < 1) {
                a = 1; s = p / 4;
            }else{
                s = p * Math.asin(1 / a) / (2 * Math.PI);
            }
            return - (a * Math.pow(2, 10 * (k -= 1)) *
                        Math.sin((k - s) * (2 * Math.PI) / p));
        },
        /**
         * @alias qtek.animation.easing.ElasticOut
         * @param {number} k
         * @return {number}
         */
        ElasticOut: function(k) {
            var s, a = 0.1, p = 0.4;
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if (!a || a < 1) {
                a = 1; s = p / 4;
            }
            else{
                s = p * Math.asin(1 / a) / (2 * Math.PI);
            }
            return (a * Math.pow(2, - 10 * k) *
                    Math.sin((k - s) * (2 * Math.PI) / p) + 1);
        },
        /**
         * @alias qtek.animation.easing.ElasticInOut
         * @param {number} k
         * @return {number}
         */
        ElasticInOut: function(k) {
            var s, a = 0.1, p = 0.4;
            if (k === 0) {
                return 0;
            }
            if (k === 1) {
                return 1;
            }
            if (!a || a < 1) {
                a = 1; s = p / 4;
            }
            else{
                s = p * Math.asin(1 / a) / (2 * Math.PI);
            }
            if ((k *= 2) < 1) {
                return - 0.5 * (a * Math.pow(2, 10 * (k -= 1))
                    * Math.sin((k - s) * (2 * Math.PI) / p));
            }
            return a * Math.pow(2, -10 * (k -= 1))
                    * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

        },
        /**
         * @alias qtek.animation.easing.BackIn
         * @param {number} k
         * @return {number}
         */
        BackIn: function(k) {
            var s = 1.70158;
            return k * k * ((s + 1) * k - s);
        },
        /**
         * @alias qtek.animation.easing.BackOut
         * @param {number} k
         * @return {number}
         */
        BackOut: function(k) {
            var s = 1.70158;
            return --k * k * ((s + 1) * k + s) + 1;
        },
        /**
         * @alias qtek.animation.easing.BackInOut
         * @param {number} k
         * @return {number}
         */
        BackInOut: function(k) {
            var s = 1.70158 * 1.525;
            if ((k *= 2) < 1) {
                return 0.5 * (k * k * ((s + 1) * k - s));
            }
            return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
        },
        /**
         * @alias qtek.animation.easing.BounceIn
         * @param {number} k
         * @return {number}
         */
        BounceIn: function(k) {
            return 1 - easing.BounceOut(1 - k);
        },
        /**
         * @alias qtek.animation.easing.BounceOut
         * @param {number} k
         * @return {number}
         */
        BounceOut: function(k) {
            if (k < (1 / 2.75)) {
                return 7.5625 * k * k;
            }
            else if (k < (2 / 2.75)) {
                return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
            } else if (k < (2.5 / 2.75)) {
                return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
            } else {
                return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
            }
        },
        /**
         * @alias qtek.animation.easing.BounceInOut
         * @param {number} k
         * @return {number}
         */
        BounceInOut: function(k) {
            if (k < 0.5) {
                return easing.BounceIn(k * 2) * 0.5;
            }
            return easing.BounceOut(k * 2 - 1) * 0.5 + 0.5;
        }
    };

    return easing;
});

