// Ear clipping polygon triangulation
define(function (require) {

    var LinkedList = require('../core/LinkedList');
    var vendor = require('../core/vendor');

    var VERTEX_TYPE_CONVEX = 1;
    var VERTEX_TYPE_REFLEX = 2;

    function Edge(p0, p1) {
        this.p0 = p0;

        this.p1 = p1;

        // Dirty trick to speed up the delete operation in linked list
        this._linkedListEntry = null;
    }

    function triangleArea(x0, y0, x1, y1, x2, y2) {
        return (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1);
    }

    function isPointInTriangle(x0, y0, x1, y1, x2, y2, xi, yi) {
        return !(triangleArea(x0, y0, x2, y2, xi, yi) <= 0
            || triangleArea(x0, y0, xi, yi, x1, y1) <= 0
            || triangleArea(xi, yi, x2, y2, x1, y1) <= 0);
    }

    var TriangulationContext = function() {

        this._points;

        this._triangles;

        this.maxGridNumber = 50;

        this.minGridNumber = 0;

        this._gridNumber = 20;

        this._boundingBox = [[Infinity, Infinity], [-Infinity, -Infinity]];

        this._nPoints = 0;

        this._nTriangle = 0;

        this._pointTypes;

        this._grids = [];

        this._gridWidth = 0;
        this._gridHeight = 0;

        this._edgeList = new LinkedList();

        // Map of point index and the edge out from the vertex
        this._edgeOut = [];

        // Map of point index and the edge in to the vertex
        this._edgeIn = [];

        this._candidates = [];
    };

    TriangulationContext.prototype.triangulate = function (points) {
        this._nPoints = points.length / 2;
        if (this._nPoints < 3) {
            return;
        }

        // PENDING Dynamic grid number or fixed grid number ?
        this._gridNumber = Math.ceil(Math.sqrt(this._nPoints));
        this._gridNumber = Math.max(Math.min(this._gridNumber, this.maxGridNumber), this.minGridNumber);

        this._points = points;

        this._reset();

        this._prepare();

        this._earClipping();

        this._triangles.length = this._nTriangle * 3;

        return this._triangles;
    };

    TriangulationContext.prototype._reset = function() {

        this._nTriangle = 0;

        this._edgeList.clear();

        this._candidates.length = 0;

        this._pointTypes = new vendor.Int8Array(this._points.length);


        this._boundingBox[0][0] = this._boundingBox[0][1] = Infinity;
        this._boundingBox[1][0] = this._boundingBox[1][1] = -Infinity;
        // Initialize grid
        var nGrids = this._gridNumber * this._gridNumber;
        var len = this._grids.length;
        for (var i = 0; i < len; i++) {
            this._grids[i].length = 0;
        }
        for (; i < nGrids; i++) {
            this._grids[i] = [];
        }
        this._grids.length = nGrids;

        // Initialize edges
        // In case the array have undefined values
        if (len < this._nPoints) {
            len = this._edgeIn.length;
            for (var i = len; i < this._nPoints; i++) {
                this._edgeIn[i] = this._edgeOut[i] = null;
            }
        } else {
            this._edgeIn.length = this._edgeOut.length = this._nPoints;
        }
    };

    // Prepare points and edges
    TriangulationContext.prototype._prepare = function() {
        var bb = this._boundingBox;
        var n = this._nPoints;

        var points = this._points;

        // Update bounding box and determine point type is reflex or convex
        for (var i = 0, j = n - 1; i < n;) {
            var k = (i + 1) % n;
            var x0 = points[j * 2];
            var y0 = points[j * 2 + 1];
            var x1 = points[i * 2];
            var y1 = points[i * 2 + 1];
            var x2 = points[k * 2];
            var y2 = points[k * 2 + 1];

            if (x1 < bb[0][0]) { bb[0][0] = x1; }
            if (y1 < bb[0][1]) { bb[0][1] = y1; }
            if (x1 > bb[1][0]) { bb[1][0] = x1; }
            if (y1 > bb[1][1]) { bb[1][1] = y1; }

            // Make the bounding box a litte bigger
            // Avoid the geometry hashing will touching the bound of the bounding box
            bb[0][0] -= 0.1;
            bb[0][1] -= 0.1;
            bb[1][0] += 0.1;
            bb[1][1] += 0.1;

            var area = triangleArea(x0, y0, x1, y1, x2, y2);

            this._pointTypes[i] = area <= 0 ? VERTEX_TYPE_CONVEX : VERTEX_TYPE_REFLEX;
            if (area <= 0) {
                this._candidates.push(i);
            }
            j = i;
            i++;
        }

        this._gridWidth = (bb[1][0] - bb[0][0]) / this._gridNumber;
        this._gridHeight = (bb[1][1] - bb[0][1]) / this._gridNumber;

        // Put the points in the grids
        for (var i = 0; i < n; i++) {
            if (this._pointTypes[i] === VERTEX_TYPE_REFLEX) {
                var x = points[i * 2];
                var y = points[i * 2 + 1];
                var key = this._getPointHash(x, y);
                this._grids[key].push(i);
            }
        }

        // Create edges
        for (var i = 0; i < n-1; i++) {
            this._addEdge(i, i+1);
        }
        this._addEdge(i, 0);
    };

    TriangulationContext.prototype._earClipping = function() {
        var candidates = this._candidates;
        var nPoints = this._nPoints;
        while(candidates.length) {
            var isDesperate = true;
            for (var i = 0; i < candidates.length;) {
                var idx = candidates[i];
                if (this._isEar(idx)) {
                    this._clipEar(idx);
                    // TODO
                    // candidates[i] = candidates[candidates.length - 1];
                    // candidates.pop();
                    candidates.splice(i, 1);
                    isDesperate = false;

                    nPoints--;
                } else {
                    i++;
                }
            }

            if (isDesperate) {
                // Random pick a convex vertex when there is no more ear
                // can be clipped and there are more than 3 points left
                // After clip the random picked vertex, go on finding ears again
                // So it can be extremely slow in worst case
                // TODO
                this._clipEar(candidates.pop());
                nPoints--;
            }
        }
    };

    TriangulationContext.prototype._isEar = function(p1) {
        // Find two adjecent edges
        var e0 = this._edgeIn[p1];
        var e1 = this._edgeOut[p1];
        // Find two adjecent vertices
        var p0 = e0.p0;
        var p2 = e1.p1;

        var points = this._points;

        var x0 = points[p0 * 2];
        var y0 = points[p0 * 2 + 1];
        var x1 = points[p1 * 2];
        var y1 = points[p1 * 2 + 1];
        var x2 = points[p2 * 2];
        var y2 = points[p2 * 2 + 1];

        // Clipped the tiny triangles directly
        if (Math.abs(triangleArea(x0, y0, x1, y1, x2, y2)) < Number.EPSILON) {
            return true;
        }

        var range = this._getTriangleGrids(x0, y0, x1, y1, x2, y2);

        // Find all the points in the grids covered by the triangle
        // And figure out if any of them is in the triangle
        for (var j = range[0][1]; j <= range[1][1]; j++) {
            for (var i = range[0][0]; i <= range[1][0]; i++) {
                var gridIdx = j * this._gridNumber + i;
                var gridPoints = this._grids[gridIdx];

                for (var k = 0; k < gridPoints.length; k++) {
                    var idx = gridPoints[k];
                    if (this._pointTypes[idx] == VERTEX_TYPE_REFLEX) {
                        var xi = points[idx * 2];
                        var yi = points[idx * 2 + 1];
                        if (isPointInTriangle(x0, y0, x1, y1, x2, y2, xi, yi)) {
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    };

    TriangulationContext.prototype._clipEar = function(p1) {

        var e0 = this._edgeIn[p1];
        var e1 = this._edgeOut[p1];

        var offset = this._nTriangle * 3;
        this._triangles[offset] = e0.p0;
        this._triangles[offset + 1] = e0.p1;
        this._triangles[offset + 2] = e1.p1;
        this._nTriangle++;

        var e0i = this._edgeIn[e0.p0];
        var e1o = this._edgeOut[e1.p1];
        // New candidate after clipping (convex vertex)
        if (this._pointTypes[e0.p0] == VERTEX_TYPE_REFLEX) {
            if (this.isTriangleConvex2(e0i.p0, e0.p0, e1.p1)) {
                // PENDING
                // The index in the grids also needs to be removed
                // But because it needs `splice` and `indexOf`
                // may cost too much
                this._candidates.push(e0.p0);
                this._pointTypes[e0.p0] = VERTEX_TYPE_CONVEX;
            }
        }
        if (this._pointTypes[e1.p1] == VERTEX_TYPE_REFLEX) {
            if (this.isTriangleConvex2(e0.p0, e1.p1, e1o.p1)) {
                this._candidates.push(e1.p1);
                this._pointTypes[e1.p1] = VERTEX_TYPE_CONVEX;
            }
        }

        this._removeEdge(e0);
        this._removeEdge(e1);

        this._addEdge(e0.p0, e1.p1);

    };

    TriangulationContext.prototype._addEdge = function(p0, p1) {

        var edge = new Edge(p0, p1);
        this._edgeOut[p0] = edge;
        this._edgeIn[p1] = edge;
        var entry = this._edgeList.insert(edge);
        edge._linkedListEntry = entry;

        return edge;
    };

    TriangulationContext.prototype._removeEdge = function(e) {
        this._edgeList.remove(e._linkedListEntry);
        this._edgeOut[e.p0] = null;
        this._edgeIn[e.p1] = null;
    };

    // Get geometric hash of point
    // Actually it will find the grid index by giving the point (x y)
    TriangulationContext.prototype._getPointHash = function(x, y) {
        var bb = this._boundingBox;
        return Math.floor((y - bb[0][1]) / this._gridHeight) * this._gridNumber
            + Math.floor((x - bb[0][0]) / this._gridWidth);
    };

    // Get the grid range covered by the triangle
    TriangulationContext.prototype._getTriangleGrids = (function() {
        var range = [[-1, -1], [-1, -1]];
        var minX, minY, maxX, maxY;
        return function(x0, y0, x1, y1, x2, y2) {
            var bb = this._boundingBox;

            // Use `if` instead of `min` `max` methods when having three or more params
            // http://jsperf.com/min-max-multiple-param
            minX = maxX = x0;
            minY = maxY = y0;
            if (x1 < minX) { minX = x1; }
            if (y1 < minY) { minY = y1; }
            if (x1 > maxX) { maxX = x1; }
            if (y1 > maxY) { maxY = y1; }
            if (x2 < minX) { minX = x2; }
            if (y2 < minY) { minY = y2; }
            if (x2 > maxX) { maxX = x2; }
            if (y2 > maxY) { maxY = y2; }

            range[0][0] = Math.floor((minX - bb[0][0]) / this._gridWidth);
            range[1][0] = Math.floor((maxX - bb[0][0]) / this._gridWidth);

            range[0][1] = Math.floor((minY - bb[0][1]) / this._gridHeight);
            range[1][1] = Math.floor((maxY - bb[0][1]) / this._gridHeight);

            return range;
        };
    })();

    TriangulationContext.prototype.isTriangleConvex2 = function(p0, p1, p2) {
        return this.triangleArea(p0, p1, p2) < 0;
    };

    TriangulationContext.prototype.triangleArea = function(p0, p1, p2) {
        var points = this._points;
        var x0 = points[p0 * 2];
        var y0 = points[p0 * 2 + 1];
        var x1 = points[p1 * 2];
        var y1 = points[p1 * 2 + 1];
        var x2 = points[p2 * 2];
        var y2 = points[p2 * 2 + 1];
        return (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1);
    };

    var earClipping = {

        flatPoints: function (points) {
            var flatPoints = new vendor.Float64Array(points.length * 2);
            for (var i = 0; i < points.length; i++) {
                flatPoints[i * 2] = points[i][0];
                flatPoints[i * 2 + 1] = points[i][1];
            }
            return flatPoints;
        },

        triangulate: function (points) {
            if (!points.length) {
                return [];
            }

            var triangulationCtx = new TriangulationContext();
            if (points[0] instanceof Array) {
                // Assume each pt is an x,y array
                return triangulationCtx.triangulate(earClipping.flatPoints(points));
            }
            else if (typeof points[0] === 'number') {
                return triangulationCtx.triangulate(points);
            }
            else {
                console.warn('Inavlid points format.');
                return [];
            }
        }
    };

    return earClipping;
});