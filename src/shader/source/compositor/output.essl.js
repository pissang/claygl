define(function () {
return "@export buildin.compositor.output\n\n#define OUTPUT_ALPHA\n\nvarying vec2 v_Texcoord;\n\nuniform sampler2D texture;\n\nvoid main()\n{\n    vec4 tex = texture2D(texture, v_Texcoord);\n\n    gl_FragColor.rgb = tex.rgb;\n\n#ifdef OUTPUT_ALPHA\n    gl_FragColor.a = tex.a;\n#else\n    gl_FragColor.a = 1.0;\n#endif\n\n}\n\n@end";
});