uniform sampler2D computedTexture;

varying vec2 vUv;

void main() {
    vec4 col = texture2D(computedTexture, vUv);
    gl_FragColor = vec4(col.rgb, 1.0);
}