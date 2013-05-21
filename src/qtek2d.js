define( function(require){
    
    var exportsObject =  {
    "2d": {
        "Camera": require('2d/camera'),
        "Node": require('2d/node'),
        "renderable": {
            "Arc": require('2d/renderable/arc'),
            "Circle": require('2d/renderable/circle'),
            "Image": require('2d/renderable/image'),
            "Line": require('2d/renderable/line'),
            "Path": require('2d/renderable/path'),
            "Polygon": require('2d/renderable/polygon'),
            "Rectangle": require('2d/renderable/rectangle'),
            "RoundedRectangle": require('2d/renderable/roundedrectangle'),
            "Sector": require('2d/renderable/sector'),
            "Text": require('2d/renderable/text'),
            "TextBox": require('2d/renderable/textbox')
        },
        "Renderer": require('2d/renderer'),
        "Scene": require('2d/scene'),
        "Style": require('2d/style'),
        "util": require('2d/util')
    },
    "core": {
        "Base": require('core/base'),
        "Cache": require('core/cache'),
        "Event": require('core/event'),
        "mixin": {
            "derive": require('core/mixin/derive'),
            "Dirty": require('core/mixin/dirty'),
            "notifier": require('core/mixin/notifier')
        },
        "requester": require('core/request')
    },
    "loader": {
        // "three": {
            // "JSON": require('loader/three/json')
        // }
    },
    "Text": require('text'),
    "util": {
        "Color": require('util/color'),
        "Util": require('util/util'),
        "Xmlparser": require('util/xmlparser')
    }
};

    var glMatrix = require('glmatrix');
    exportsObject.math = glMatrix;
    
    return exportsObject;
})