define(function () {
return "\n@export qtek.compositor.lum\n\nvarying vec2 v_Texcoord;\n\nuniform sampler2D texture;\n\nconst vec3 w = vec3(0.2125, 0.7154, 0.0721);\n\nvoid main()\n{\n    vec4 tex = texture2D( texture, v_Texcoord );\n    float luminance = dot(tex.rgb, w);\n\n    gl_FragColor = vec4(vec3(luminance), 1.0);\n}\n\n@end";
});