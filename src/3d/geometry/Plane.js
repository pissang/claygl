define(function(require) {

	var Geometry = require('../Geometry');

	var Plane = Geometry.derive(function() {

		return {
			widthSegments : 1,
			heightSegments : 1
		}
	}, function() {

		var heightSegments = this.heightSegments;
		var widthSegments = this.widthSegments;
		var positions = this.attributes.position.value;
		var texcoords = this.attributes.texcoord0.value;
		var normals = this.attributes.normal.value;
		var faces = this.faces;			

		for (var y = 0; y <= heightSegments; y++) {
			var t = y / heightSegments;
			for (var x = 0; x <= widthSegments; x++) {
				var s = x / widthSegments;

				positions.push([2 * s - 1, 2 * t - 1, 0]);
				if (texcoords) {
					texcoords.push([s, t]);
				}
				if (normals) {
					normals.push([0, 0, 1]);
				}
				if (x < widthSegments && y < heightSegments) {
					var i = x + y * (widthSegments + 1);
					faces.push([i, i + 1, i + widthSegments + 1]);
					faces.push([i + widthSegments + 1, i + 1, i + widthSegments + 2]);
				}
			}
		}

	})

	return Plane;
})