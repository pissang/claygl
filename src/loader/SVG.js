/**
 * shapes : circle, line, polygon, rect, polyline, ellipse, path
 */
define(function(require) {

    var Base = require("core/Base");

    var request = require("core/request");

    var Node = require("2d/Node");
    var Circle = require("2d/shape/Circle");
    var Rectangle = require("2d/shape/Rectangle");
    var Ellipse = require("2d/shape/Ellipse");
    var Line = require("2d/shape/Line");
    var Path = require("2d/shape/Path");
    var Polygon = require("2d/shape/Polygon");
    var TextBox = require("2d/shape/TextBox");
    var SVGPath = require("2d/shape/SVGPath");
    var LinearGradient = require("2d/LinearGradient");
    var RadialGradient = require("2d/RadialGradient");
    var Pattern = require("2d/Pattern");
    var Style = require("2d/Style");
    var Vector2 = require("core/Vector2");
    var _ = require("_");

    var Loader = Base.derive(function() {
        return {
            defs : {},
            root : null
        };
    }, {
        load : function(url) {

            var self = this;
            this.defs = {};

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
                    return self.parse(xmlString);
                }
            })
        },
        parse : function(xml) {
            if (typeof(xml) === "string") {
                var parser = new DOMParser();
                var doc = parser.parseFromString(xml, 'text/xml');
                var svg = doc.firstChild;
                while (svg.nodeName.toLowerCase() !== 'svg') {
                    svg = svg.nextSibling;
                }
            } else {
                var svg = xml;
            }
            var root = new Node();
            this.root = root;
            // parse view port
            var viewBox = svg.getAttribute("viewBox") || '';
            var viewBoxArr = viewBox.split(/\s+/);

            var width = parseFloat(svg.getAttribute("width") || 0);
            var height = parseFloat(svg.getAttribute("height") || 0);

            var x = parseFloat(viewBoxArr[0] || 0);
            var y = parseFloat(viewBoxArr[1] || 0);
            var vWidth = parseFloat(viewBoxArr[2]);
            var vHeight = parseFloat(viewBoxArr[3]);

            root.position.set(x, y);

            var child = svg.firstChild;
            while (child) {
                this._parseNode(child, root);
                child = child.nextSibling;
            }
            
            this.trigger('success', root);

            return root;
        },

        _parseNode : function(xmlNode, parent) {
            var nodeName = xmlNode.nodeName.toLowerCase();

            if (nodeName === 'defs') {
                // define flag
                this._isDefine = true;
            }

            if (this._isDefine) {
                var parser = defineParsers[nodeName];
                if (parser) {
                    var def = parser.call(this, xmlNode);
                    var id = xmlNode.getAttribute("id");
                    if (id) {
                        this.defs[id] = def;
                    }
                }
            } else {
                var parser = nodeParsers[nodeName];
                if (parser) {
                    var node = parser.call(this, xmlNode, parent);
                    parent.add(node);
                }
            }

            var child = xmlNode.firstChild;
            while (child) {
                if (child.nodeType === 1){
                    this._parseNode(child, node);
                }
                child = child.nextSibling;
            }

            // Quit define
            if (nodeName === 'defs') {
                this._isDefine = false;
            }
        }
    });
    
    var nodeParsers = {
        "g" : function(xmlNode, parentNode) {
            var node = new Node();
            if (parentNode) {
                _inheritStyle(parentNode, node);
            }
            _parseAttributes(xmlNode, node, this.defs);
            return node;
        },
        "rect" : function(xmlNode, parentNode) {
            var rect = new Rectangle();
            if (parentNode) {
                _inheritStyle(parentNode, rect);
            }
            _parseAttributes(xmlNode, rect, this.defs);

            var x = parseFloat(xmlNode.getAttribute("x") || 0);
            var y = parseFloat(xmlNode.getAttribute("y") || 0);
            var width = parseFloat(xmlNode.getAttribute("width") || 0);
            var height = parseFloat(xmlNode.getAttribute("height") || 0);
            rect.start.set(x, y);
            rect.size.set(x, y);

            return rect;
        },
        "circle" : function(xmlNode, parentNode) {
            var circle = new Circle();
            if (parentNode) {
                _inheritStyle(parentNode, circle);
            }
            _parseAttributes(xmlNode, circle, this.defs);

            var cx = parseFloat(xmlNode.getAttribute("cx") || 0);
            var cy = parseFloat(xmlNode.getAttribute("cy") || 0);
            var r = parseFloat(xmlNode.getAttribute("r") || 0);
            circle.center.set(cx, cy);
            circle.radius = r;

            return circle;
        },
        'line' : function(xmlNode, parentNode){
            var line = new Line();
            if (parentNode) {
                _inheritStyle(parentNode, line);
            }
            _parseAttributes(xmlNode, line, this.defs);

            var x1 = parseFloat(xmlNode.getAttribute("x1") || 0);
            var y1 = parseFloat(xmlNode.getAttribute("y1") || 0);
            var x2 = parseFloat(xmlNode.getAttribute("x2") || 0);
            var y2 = parseFloat(xmlNode.getAttribute("y2") || 0);
            line.start.set(x1, y1);
            line.end.set(x2, y2);

            return line;
        },
        "ellipse" : function(xmlNode, parentNode) {
            var ellipse = new Ellipse();
            if (parentNode) {
                _inheritStyle(parentNode, ellipse);
            }
            _parseAttributes(xmlNode, ellipse, this.defs);

            var cx = parseFloat(xmlNode.getAttribute("cx") || 0);
            var cy = parseFloat(xmlNode.getAttribute("cy") || 0);
            var rx = parseFloat(xmlNode.getAttribute("rx") || 0);
            var ry = parseFloat(xmlNode.getAttribute("ry") || 0);

            ellipse.center.set(cx, cy);
            ellipse.radius.set(rx, ry);
            return ellipse;
        },
        'polygon' : function(xmlNode, parentNode) {
            var points = xmlNode.getAttribute("points");
            if (points) {
                points = _parsePoints(points);
            }
            var polygon = new Polygon({
                points : points
            });
            if (parentNode) {
                _inheritStyle(parentNode, polygon);
            }
            _parseAttributes(xmlNode, polygon, this.defs);

            return polygon;
        },
        'polyline' : function(xmlNode, parentNode) {
            var path = new Path();
            if (parentNode) {
                _inheritStyle(parentNode, path);
            }
            _parseAttributes(xmlNode, path, this.defs);

            var points = xmlNode.getAttribute("points");
            if (points) {
                points = _parsePoints(points);
                path.pushPoints(points);
            }

            return path;
        },
        'image' : function(xmlNode, parentNode) {

        },
        'text' : function(xmlNode, parentNode) {
            
        },
        "path" : function(xmlNode, parentNode) {
            var path = new SVGPath();
            if (parentNode) {
                _inheritStyle(parentNode, path);
            }
            _parseAttributes(xmlNode, path, this.defs);

            // TODO svg fill rule
            // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule
            // path.style.globalCompositeOperation = 'xor';

            var d = xmlNode.getAttribute("d") || "";
            path.description = d;

            return path;
        }
    }

    var defineParsers = {

        'lineargradient' : function(xmlNode) {
            var x1 = parseInt(xmlNode.getAttribute("x1") || 0);
            var y1 = parseInt(xmlNode.getAttribute("y1") || 0);
            var x2 = parseInt(xmlNode.getAttribute("x2") || 10);
            var y2 = parseInt(xmlNode.getAttribute("y2") || 0);

            var gradient = new LinearGradient();
            gradient.start.set(x1, y1);
            gradient.end.set(x2, y2);

            _parseGradientColorStops(xmlNode, gradient);

            return gradient;
        },

        'radialgradient' : function(xmlNode) {

        }
    }

    function _parseGradientColorStops(xmlNode, gradient){

        var stop = xmlNode.firstChild;

        while (stop) {
            if (stop.nodeType === 1) {
                var offset = stop.getAttribute("offset");
                if (offset.indexOf("%") > 0) {  // percentage
                    offset = parseInt(offset) / 100;
                } else if(offset) {    // number from 0 to 1
                    offset = parseFloat(offset);
                } else {
                    offset = 0;
                }

                var stopColor = stop.getAttribute("stop-color") || '#000000';

                gradient.addColorStop(offset, stopColor);
            }
            stop = stop.nextSibling;
        }
    }

    function _inheritStyle(parent, child) {
        child.stroke = parent.stroke;
        child.fill = parent.fill;
    }

    function _parsePoints(pointsString) {
        var list = pointsString.trim().replace(/,/g, " ").split(/\s+/);
        var points = [];

        for (var i = 0; i < list.length; i+=2) {
            var x = parseFloat(list[i]);
            var y = parseFloat(list[i+1]);
            points.push(new Vector2(x, y));
        }
        return points;
    }

    function _parseAttributes(xmlNode, node, defs) {
        _parseTransformAttribute(xmlNode, node);

        var styleList = {
            fill : xmlNode.getAttribute('fill'),
            stroke : xmlNode.getAttribute("stroke"),
            lineWidth : xmlNode.getAttribute("stroke-width"),
            opacity : xmlNode.getAttribute('opacity'),
            lineDash : xmlNode.getAttribute('stroke-dasharray'),
            lineDashOffset : xmlNode.getAttribute('stroke-dashoffset'),
            lineCap : xmlNode.getAttribute('stroke-linecap'),
            lineJoin : xmlNode.getAttribute('stroke-linjoin'),
            miterLimit : xmlNode.getAttribute("stroke-miterlimit")
        }

        _.extend(styleList, _parseStyleAttribute(xmlNode));

        node.style = new Style({
            fill : _getPaint(styleList.fill, defs),
            stroke : _getPaint(styleList.stroke, defs),
            lineWidth : parseFloat(styleList.lineWidth),
            opacity : parseFloat(styleList.opacity),
            lineDashOffset : styleList.lineDashOffset,
            lineCap : styleList.lineCap,
            lineJoin : styleList.lineJoin,
            miterLimit : parseFloat(styleList.miterLimit)
        });
        if (styleList.lineDash) {
            node.style.lineDash = styleList.lineDash.trim().split(/\s*,\s*/);
        }

        if (styleList.stroke && styleList.stroke !== "none") {
            // enable stroke
            node.stroke = true;
        }
    }


    var urlRegex = /url\(\s*#(.*?)\)/;
    function _getPaint(str, defs) {
        // if (str === 'none') {
        //     return;
        // }
        var urlMatch = urlRegex.exec(str);
        if (urlMatch) {
            var url = urlMatch[1].trim();
            var def = defs[url];
            return def;
        }
        return str;
    }

    var transformRegex = /(translate|scale|rotate|skewX|skewY|matrix)\(([\-\s0-9\.,]*)\)/g;

    function _parseTransformAttribute(xmlNode, node) {
        var transform = xmlNode.getAttribute("transform");
        if (transform) {
            var m = node.transform;
            m.identity();
            var transformOps = [];
            transform.replace(transformRegex, function(str, type, value){
                transformOps.push(type, value);
            })
            for(var i = transformOps.length-1; i > 0; i-=2){
                var value = transformOps[i];
                var type = transformOps[i-1];
                switch(type) {
                    case "translate":
                        value = value.trim().split(/\s+/);
                        m.translate(new Vector2(parseFloat(value[0]), parseFloat(value[1] || 0)));
                        break;
                    case "scale":
                        value = value.trim().split(/\s+/);
                        m.scale(new Vector2(parseFloat(value[0]), parseFloat(value[1] || value[0])));
                        break;
                    case "rotate":
                        value = value.trim().split(/\s*/);
                        m.rotate(parseFloat(value[0]));
                        break;
                    case "skew":
                        value = value.trim().split(/\s*/);
                        console.warn("Skew transform is not supported yet");
                        break;
                    case "matrix":
                        var value = value.trim().split(/\s*,\s*/);
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
        node.autoUpdate = false;
    }

    var styleRegex = /(\S*?):(.*?);/g;
    function _parseStyleAttribute(xmlNode) {
        var style = xmlNode.getAttribute("style");

        if (style) {
            var styleList = {};
            style = style.replace(/\s*([;:])\s*/g, "$1");
            style.replace(styleRegex, function(str, key, val){
                styleList[key] = val;
            });

            return {
                fill : styleList['fill'],
                stroke : styleList['stroke'],
                lineWidth : styleList['stroke-width'],
                opacity : styleList['opacity'],
                lineDash : styleList['stroke-dasharray'],
                lineDashOffset : styleList['stroke-dashoffset'],
                lineCap : styleList['stroke-linecap'],
                lineJoin : styleList['stroke-linjoin'],
                miterLimit : styleList['stroke-miterlimit']
            }
        }
        return {};
    }

    function _parseCSSRules(doc) {

    }


    return Loader
})