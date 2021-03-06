// precision lowp float;
// precision lowp int;

varying vec2 vUv;
uniform sampler2D texture1;
// uniform float invert;

void main()
{
    float value = texture2D(texture1, vUv).g;
    float a;
    vec3 col;

    value = smoothstep(0.3, 0.1, value);

    // if(invert == 1.0) {
    //     value = 1.0 - value;
    // }
    col = vec3(value);

    gl_FragColor = vec4(col.r, col.g, col.b, 1.0);
}