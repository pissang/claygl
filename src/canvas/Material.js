import Base from '../core/Base';

var CanvasMaterial = Base.extend({

    color: [1, 1, 1, 1],

    opacity: 1,

    pointSize: 0,

    /**
     * Point shape. Can be 'rectangle' and 'circle'
     * @type {string}
     */
    pointShape: 'rectangle'
});

export default CanvasMaterial;
