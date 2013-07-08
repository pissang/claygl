/**
 * @export{class} SVG
 * shapes : done : circle, line, polygon, rect, polyline, ellipse
 */
define(function(require) {

    var Base = require("core/base");

    var request = require("core/request");

    var Node = require("2d/node");
    var Circle = require("2d/shape/circle");
    var Rectangle = require("2d/shape/rectangle");
    var Ellipse = require("2d/shape/ellipse");
    var Line = require("2d/shape/line");
    var TextBox = require("2d/shape/textbox");
    var SVGPath = require("2d/shape/svgpath"); 

    var Style = require("2d/style");

    var Vector2 = require("core/vector2");

    var Loader = Base.derive(function() {
        return {

        };
    }, {
        load : function(url) {
            var self = this;

            request.get({
                url : url,
                onprogress : function(percent, loaded, total) {
                    self.trigger("progress", percent, loaded, total);
                },
                onerror : function(e) {
                    self.trigger("error", e);
                },
                responseType : "text",
                onload : function(xmlString) {
                    self.parse(xmlString);
                }
            })
        },
        parse : function(xmlString, callback) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(xmlString, 'text/xml');
            var svg = doc.firstChild;

            var root = new Node();
            
            // parse view port
            var viewBox = svg.getAttribute("viewBox");
            var viewBoxArr = viewBox.split(/\s+/);

            var x = parseFloat(viewBoxArr[0]);
            var y = parseFloat(viewBoxArr[1]);
            var vWidth = parseFloat(viewBoxArr[2]);
            var vHeight = parseFloat(viewBoxArr[3]);

            var width = parseFloat(svg.getAttribute("width") || vWidth);
            var height = parseFloat(svg.getAttribute("height") || vHeight);

            root.position.set(x, y);
            root.scale.set(width / vWidth, height / vHeight);

            var child = svg.firstChild;
            while (child) {
                this._parseNode(child, root);
                child = child.nextSibling;
            }

            callback && callback(root);

            return root;
        },

        _parseNode : function(xmlNode, parent) {
            var nodeParser = nodeParsers[xmlNode.nodeName];
            if (nodeParser) {
                var node = nodeParser(xmlNode, parent);
                parent.add(node);

                var child = xmlNode.firstChild;
                while (child) {
                    this._parseNode(child, node);
                    child = child.nextSibling;
                }
            }
        }
    });
    
    var nodeParsers = {
        "g" : function(xmlNode, parentNode) {
            var node = new Node();
            _inheritStyle(parentNode, node);
            _parseAttributes(xmlNode, node);
            return node;
        },
        "rect" : function(xmlNode, parentNode) {
            var rect = new Rectangle();
            _inheritStyle(parentNode, rect);
            _parseAttributes(xmlNode, rect);

            var x = parseInt(xmlNode.getAttribute("x") || 0);
            var y = parseInt(xmlNode.getAttribute("y") || 0);
            var width = parseInt(xmlNode.getAttribute("width") || 0);
            var height = parseInt(xmlNode.getAttribute("height") || 0);
            rect.start.set(x, y);
            rect.size.set(x, y);

            return rect;
        },
        "circle" : function(xmlNode, parentNode) {
            var circle = new Circle();
            _inheritStyle(parentNode, circle);
            _parseAttributes(xmlNode, circle);

            var cx = parseInt(xmlNode.getAttribute("cx") || 0);
            var cy = parseInt(xmlNode.getAttribute("cy") || 0);
            var r = parseInt(xmlNode.getAttribute("r") || 0);
            circle.center.set(cx, cy);
            circle.radius = r;

            return circle;
        },
        "path" : function(xmlNode, parentNode) {
            var path = new SVGPath();
            _inheritStyle(parentNode, path);
            _parseAttributes(xmlNode, path);

            var d = xmlNode.getAttribute("d") || "";
            path.description = d;

            return path;
        }
    }

    function _inheritStyle(parent, child){
        child.stroke = parent.stroke;
        child.fill = parent.fill;
    }

    function _parseAttributes(xmlNode, node) {
        _parseTransformAttribute(xmlNode, node);
        _parseStyleAttribute(xmlNode, node);

        var fill = xmlNode.getAttribute("fill");
        var stroke = xmlNode.getAttribute("stroke");
        var strokeWidth = xmlNode.getAttribute("stroke-width");
        var opacity = xmlNode.getAttribute("opacity");

        if (fill) {
            node.style.fillStyle = _getPaint(fill);
        }
        if (stroke) {
            node.stroke = true;
            node.style.strokeStyle = _getPaint(stroke);
        }
        if (strokeWidth) {
            node.style.lineWidth = parseFloat(strokeWidth);
        }
        if (opacity) {
            node.style.globalAlpha = parseFloat(opacity);
        }
    }

    function _getPaint(str) {
        return str;
    }

    var transformRegex = /(translate|scale|rotate|skewX|skewY|matrix)\(([\s0-9\.,]*)\)/
    function _parseTransformAttribute(xmlNode, node) {
        var transform = xmlNode.getAttribute("transform");
        if (transform) {
            var transformList = transform.split(/\s+/);

            for(var i = 0; i < transformList.length; i++) {
                var item = transformList[i];

                var result = transformRegex.exec(item);
                if (result) {
                    var type = result[1];
                    var m = node.transform;
                    switch(type) {
                        case "translate":
                            var value = result[2].trim().split(/\s*/);
                            m.translate(new Vector2(parseFloat(value[0]), parseFloat(value[1] || 0)));
                            break;
                        case "scale":
                            var value = result[2].trim().split(/\s*/);
                            m.scale(new Vector2(parseFloat(value[0]), parseFloat(value[1])));
                            break;
                        case "rotate":
                            m.rotate(parseFloat(result[2]));
                            break;
                        case "skew":
                            var value = result[2].trim().split(/\s*/);
                            console.warn("Skew transform is not supported yet");
                            break;
                        case "matrix":
                            var value = result[2].trim().split(/\s*,\s*/);
                            var arr = m._array;
                            arr[0] = parseFloat(value[0]);
                            arr[1] = parseFloat(value[1]);
                            arr[2] = parseFloat(value[2]);
                            arr[3] = parseFloat(value[3]);
                            arr[4] = parseFloat(value[4]);
                            arr[5] = parseFloat(value[5]);
                            break;
                    }
                }
            }
        }
        node.autoUpdate = false;
    }

    function _parseStyleAttribute(xmlNode, node) {
        var style = xmlNode.getAttribute("style");
        node.style = new Style();
        if (style) {

        }
        return node;
    }

    function _parseCSSRules(doc) {

    }


    return Loader
})