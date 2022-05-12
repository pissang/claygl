export default "\n@export clay.composite.vertex\nuniform mat4 worldViewProjection : WORLDVIEWPROJECTION;\nattribute vec3 position : POSITION;\nattribute vec2 texcoord : TEXCOORD_0;\nvarying vec2 v_Texcoord;\nvoid main()\n{\n v_Texcoord = texcoord;\n gl_Position = worldViewProjection * vec4(position, 1.0);\n}\n@end";
