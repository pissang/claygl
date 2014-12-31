define(function(require) {

    'use strict';

    var Base = require('./core/Base');
    
    /**
     * @constructor qtek.Joint
     * @extends qtek.core.Base
     */
    var Joint = Base.derive(
    /** @lends qtek.Joint# */
    {
        // https://github.com/KhronosGroup/glTF/issues/193#issuecomment-29216576
        /**
         * Joint name
         * @type {string}
         */
        name: '',
        /**
         * Index of joint in the skeleton
         * @type {number}
         */
        index: -1,
        /**
         * Index of parent joint index, -1 if it is a root joint
         * @type {number}
         */
        parentIndex: -1,

        /**
         * Scene node attached to
         * @type {qtek.Node}
         */
        node: null,

        /**
         * Root scene node of the skeleton, which parent node is null or don't have a joint
         * @type {qtek.Node}
         */
        rootNode: null
    });

    return Joint;
});