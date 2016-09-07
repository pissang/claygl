define(function () {
return "@export qtek.deferred.light_volume.vertex\n\nuniform mat4 worldViewProjection : WORLDVIEWPROJECTION;\n\nattribute vec3 position : POSITION;\n\nvarying vec3 v_Position;\n\nvoid main()\n{\n    gl_Position = worldViewProjection * vec4(position, 1.0);\n\n    v_Position = position;\n}\n\n@end";
});