define(function (require) {

    var Base = require('../core/Base');

    var CanvasMaterial = Base.derive({

        color: [1, 1, 1, 1],

        opacity: 1,

        pointSize: 0,

        /**
         * Point shape. Can be 'rectangle' and 'circle'
         * @type {string}
         */
        pointShape: 'rectangle'
    });

    return CanvasMaterial;
});