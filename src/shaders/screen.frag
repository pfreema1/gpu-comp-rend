// precision lowp float;
// precision lowp int;

varying vec2 vUv;
uniform sampler2D texture1;
uniform float time;
// uniform float invert;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main()
{
    float value = texture2D(texture1, vUv).g;
    float a;
    vec3 col;

    value = smoothstep(0.2, 0.1, value);
    

    
    col = vec3(value);

    gl_FragColor = vec4(col.r, col.g, col.b, 1.0);
}