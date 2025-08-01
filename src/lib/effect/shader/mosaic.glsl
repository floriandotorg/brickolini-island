uniform float uMosaicProgress;
uniform float uTileSize;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  if (uMosaicProgress > 0.0) {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 mosaicCoord = floor(fragCoord / uTileSize) * uTileSize;
    mosaicCoord.y += uTileSize - 1.0;

    if (hash(mosaicCoord) < uMosaicProgress) {
      vec2 uv = mosaicCoord / texSize;
      vec3 color = texture2D(tDiffuse, uv).rgb;

      outputColor = vec4(color, 1.0);
      return;
    }
  }

  outputColor = inputColor;
}
