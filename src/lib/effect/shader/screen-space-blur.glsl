precision highp float;

uniform sampler2D tShading;

out vec4 outColor;

void main() {
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  ivec2 limit = textureSize(tShading, 0) - 1;
  vec4 center = texelFetch(tShading, pixel, 0);
  if (center.b >= 60000.0) {
    outColor = center;
    return;
  }
  float tolerance = center.b * 0.04 + 0.05;
  vec2 sum = vec2(0.0);
  float total = 0.0;
  for (int y = -2; y <= 1; ++y) {
    for (int x = -2; x <= 1; ++x) {
      vec4 tap = texelFetch(tShading, clamp(pixel + ivec2(x, y), ivec2(0), limit), 0);
      float weight = max(0.0, 1.0 - abs(tap.b - center.b) / tolerance);
      sum += tap.rg * weight;
      total += weight;
    }
  }
  outColor = vec4(sum / max(total, 0.0001), center.b, 1.0);
}
