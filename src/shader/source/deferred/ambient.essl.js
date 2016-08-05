define(function () {
return "@export buildin.deferred.ambient_light\nuniform sampler2D gBufferTex;\nuniform vec3 lightColor;\n\nvarying vec2 v_Texcoord;\n\nvoid main()\n{\n    vec4 tex = texture2D(gBufferTex, v_Texcoord);\n    vec3 normal = tex.rgb * 2.0 - 1.0;\n\n    gl_FragColor.rgb = lightColor * (clamp(normal.y * 0.7, 0.0, 1.0) + 0.3);\n    gl_FragColor.a = 0.0;\n}\n@end";
});