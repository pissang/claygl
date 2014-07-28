// Delaunay Triangulation
// Modified from https://github.com/ironwallaby/delaunay

define(function(require) {

    'use strict';

    function appendSupertriangleVertices(vertices) {
        var xmin = Number.POSITIVE_INFINITY,
            ymin = Number.POSITIVE_INFINITY,
            xmax = Number.NEGATIVE_INFINITY,
            ymax = Number.NEGATIVE_INFINITY,
            i, dx, dy, dmax, xmid, ymid;

        for(i = vertices.length; i--; ) {
            if(vertices[i][0] < xmin) xmin = vertices[i][0];
            if(vertices[i][0] > xmax) xmax = vertices[i][0];
            if(vertices[i][1] < ymin) ymin = vertices[i][1];
            if(vertices[i][1] > ymax) ymax = vertices[i][1];
        }

        dx = xmax - xmin;
        dy = ymax - ymin;
        dmax = Math.max(dx, dy);
        xmid = xmin + dx * 0.5;
        ymid = ymin + dy * 0.5;

        vertices.push(
            [xmid - 20 * dmax, ymid -      dmax],
            [xmid            , ymid + 20 * dmax],
            [xmid + 20 * dmax, ymid -      dmax]
        );
    }

    function triangle(vertices, i, j, k) {
        var a = vertices[i],
            b = vertices[j],
            c = vertices[k],
            A = b[0] - a[0],
            B = b[1] - a[1],
            C = c[0] - a[0],
            D = c[1] - a[1],
            E = A * (a[0] + b[0]) + B * (a[1] + b[1]),
            F = C * (a[0] + c[0]) + D * (a[1] + c[1]),
            G = 2 * (A * (c[1] - b[1]) - B * (c[0] - b[0])),
            minx, miny, dx, dy, x, y;

        /* If the points of the triangle are collinear, then just find the
         * extremes and use the midpoint as the center of the circumcircle. */
        if (Math.abs(G) < 0.000001) {
            minx = Math.min(a[0], b[0], c[0]);
            miny = Math.min(a[1], b[1], c[1]);
            dx   = (Math.max(a[0], b[0], c[0]) - minx) * 0.5;
            dy   = (Math.max(a[1], b[1], c[1]) - miny) * 0.5;
            x    = minx + dx;
            y    = miny + dy;
        }
        else {
            x  = (D*E - B*F) / G;
            y  = (A*F - C*E) / G;
            dx = x - a[0];
            dy = y - a[1];
        }

        return {i: i, j: j, k: k, x: x, y: y, r: dx * dx + dy * dy};
    }

    function dedup(edges) {
        var j = edges.length,
            a, b, i, m, n;

        outer: while (j) {
            b = edges[--j];
            a = edges[--j];
            i = j;
            while (i) {
                n = edges[--i]
                m = edges[--i]
                if ((a === m && b === n) || (a === n && b === m)) {
                    edges.splice(j, 2);
                    edges.splice(i, 2);
                    j -= 2;
                    continue outer;
                }
            }
        }
    }

    var delaunay = {
        triangulate: function(vertices, key) {
            var n = vertices.length,
                i, j, indices, open, closed, edges, dx, dy, a, b, c;

            /* Bail if there aren't enough vertices to form any triangles. */
            if (n < 3) {
                return [];
            }

            /* Slice out the actual vertices from the passed objects. (Duplicate the
            * array even if we don't, though, since we need to make a supertriangle
            * later on!) */
            vertices = vertices.slice(0);
            
            if (key) {
                for (i = n; i--; ) {
                    vertices[i] = vertices[i][key];
                }
            }

            /* Make an array of indices into the vertex array, sorted by the vertices'
            * x-position. */
            indices = new Array(n);

            for (i = n; i--; ) {
                indices[i] = i;
            }

            indices.sort(function(i, j) { return vertices[j][0] - vertices[i][0]; });

            /* Next, find the vertices of the supertriangle (which contains all other
            * triangles), and append them onto the end of a (copy of) the vertex
            * array. */
            appendSupertriangleVertices(vertices);

            /* Initialize the open list (containing the supertriangle and nothing else)
            * and the closed list (which is empty since we havn't processed any
            * triangles yet). */
            open   = [triangle(vertices, n + 0, n + 1, n + 2)];
            closed = [];
            edges  = [];

            /* Incrementally add each vertex to the mesh. */
            for (i = indices.length; i--; ) {
                c = indices[i];
                edges.length = 0;

                /* For each open triangle, check to see if the current point is
                 * inside it's circumcircle. If it is, remove the triangle and add
                 * it's edges to an edge list. */
                for (j = open.length; j--; ) {
                    /* If this point is to the right of this triangle's circumcircle,
                    * then this triangle should never get checked again. Remove it
                    * from the open list, add it to the closed list, and skip. */
                    dx = vertices[c][0] - open[j].x;
                    if (dx > 0.0 && dx * dx > open[j].r) {
                        closed.push(open[j]);
                        open.splice(j, 1);
                        continue;
                    }

                    /* If we're outside the circumcircle, skip this triangle. */
                    dy = vertices[c][1] - open[j].y;
                    if (dx * dx + dy * dy > open[j].r) {
                        continue;
                    }

                    /* Remove the triangle and add it's edges to the edge list. */
                    edges.push(
                        open[j].i, open[j].j,
                        open[j].j, open[j].k,
                        open[j].k, open[j].i
                    );
                    open.splice(j, 1);
                }

                /* Remove any doubled edges. */
                dedup(edges);

                /* Add a new triangle for each edge. */
                for(j = edges.length; j; ) {
                    b = edges[--j];
                    a = edges[--j];
                    open.push(triangle(vertices, a, b, c));
                }
            }

            /* Copy any remaining open triangles to the closed list, and then
            * remove any triangles that share a vertex with the supertriangle, building
            * a list of triplets that represent triangles. */
            for (i = open.length; i--; ) {
                closed.push(open[i]);
            }
            open.length = 0;

            for(i = closed.length; i--; ) {
                if(closed[i].i < n && closed[i].j < n && closed[i].k < n) {
                    var i1 = closed[i].i,
                        i2 = closed[i].j,
                        i3 = closed[i].k;
                    var tri = {
                        indices : [i1, i2, i3],
                        vertices : [vertices[i1], vertices[i2], vertices[i3]]
                    };
                    open.push(tri);
                }
            }

            /* Yay, we're done! */
            return open;
        },

        contains: function(tri, p) {
            /* Bounding box test first, for quick rejections. */
            if((p[0] < tri[0][0] && p[0] < tri[1][0] && p[0] < tri[2][0]) ||
              (p[0] > tri[0][0] && p[0] > tri[1][0] && p[0] > tri[2][0]) ||
              (p[1] < tri[0][1] && p[1] < tri[1][1] && p[1] < tri[2][1]) ||
              (p[1] > tri[0][1] && p[1] > tri[1][1] && p[1] > tri[2][1])) {

                return null;
            }

            var a = tri[1][0] - tri[0][0],
                b = tri[2][0] - tri[0][0],
                c = tri[1][1] - tri[0][1],
                d = tri[2][1] - tri[0][1],
                i = a * d - b * c;

            /* Degenerate tri. */
            if(i === 0.0) {
                return null;
            }

            var u = (d * (p[0] - tri[0][0]) - b * (p[1] - tri[0][1])) / i,
                v = (a * (p[1] - tri[0][1]) - c * (p[0] - tri[0][0])) / i;

            /* If we're outside the tri, fail. */
            if(u < 0.0 || v < 0.0 || (u + v) > 1.0) {
                return null;
            }
            
            // normalize
            // u = Math.max(0.0, u);
            // v = Math.max(0.0, v);
            // var s = u + v;
            // if (s > 1.0) {
            //     u = u / s;
            //     v = v / s;
            // }
            return [u, v];
        }
    }

    return delaunay;
});