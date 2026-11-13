#include <tonemapping_pars_fragment>

uniform sampler2D tWorldDepth;
uniform mat4 uProjectionInverse;
uniform mat4 uProjection;
uniform bool uFilmic;
uniform sampler3D tDawnLut;
uniform sampler3D tNoonLut;
uniform sampler3D tDuskLut;
uniform float uDayPhase;
uniform bool uPlasticEdges;
uniform sampler2D tScreenShading;
uniform bool uScreenShading;

vec3 viewPosition(vec2 sampleUv, float depth) {
  float reciprocalW = 1.0 / (uProjectionInverse[2][3] * (depth * 2.0 - 1.0) + uProjectionInverse[3][3]);
  vec2 plane = (sampleUv * 2.0 - 1.0) * vec2(uProjectionInverse[0][0], uProjectionInverse[1][1]) + uProjectionInverse[3].xy;
  return vec3(plane, -1.0) * reciprocalW;
}

vec2 screenShading(float viewDepth) {
  vec2 coordinate = uv * vec2(textureSize(tScreenShading, 0)) - 0.5;
  ivec2 base = ivec2(floor(coordinate));
  vec2 fraction = fract(coordinate);
  ivec2 limit = textureSize(tScreenShading, 0) - 1;
  float tolerance = viewDepth * 0.05 + 0.05;
  vec2 sum = vec2(0.0);
  float total = 0.0;
  vec2 nearest = vec2(1.0);
  float nearestDistance = 1e20;
  for (int n = 0; n < 4; ++n) {
    ivec2 offset = ivec2(n & 1, n >> 1);
    vec4 tap = texelFetch(tScreenShading, clamp(base + offset, ivec2(0), limit), 0);
    vec2 bilinear = mix(1.0 - fraction, fraction, vec2(offset));
    float separation = abs(tap.b - viewDepth);
    float weight = bilinear.x * bilinear.y * max(0.0, 1.0 - separation / tolerance);
    sum += tap.rg * weight;
    total += weight;
    if (separation < nearestDistance) {
      nearestDistance = separation;
      nearest = tap.rg;
    }
  }
  return total > 0.001 ? sum / total : nearest;
}

vec3 surfaceNormal(vec2 sampleUv) {
  vec3 center = viewPosition(sampleUv, texture(tWorldDepth, sampleUv).r);
  vec3 left = viewPosition(sampleUv - vec2(texelSize.x, 0.0), texture(tWorldDepth, sampleUv - vec2(texelSize.x, 0.0)).r);
  vec3 right = viewPosition(sampleUv + vec2(texelSize.x, 0.0), texture(tWorldDepth, sampleUv + vec2(texelSize.x, 0.0)).r);
  vec3 bottom = viewPosition(sampleUv - vec2(0.0, texelSize.y), texture(tWorldDepth, sampleUv - vec2(0.0, texelSize.y)).r);
  vec3 top = viewPosition(sampleUv + vec2(0.0, texelSize.y), texture(tWorldDepth, sampleUv + vec2(0.0, texelSize.y)).r);
  vec3 dx = abs(left.z - center.z) < abs(right.z - center.z) ? center - left : right - center;
  vec3 dy = abs(bottom.z - center.z) < abs(top.z - center.z) ? center - bottom : top - center;
  return normalize(cross(dx, dy));
}

float plasticBevel(vec3 position, vec3 normal) {
  float edge = 0.0;
  for (int n = 0; n < 4; ++n) {
    vec2 offset = n == 0 ? vec2(1.5, 0.0) : n == 1 ? vec2(-1.5, 0.0) : n == 2 ? vec2(0.0, 1.5) : vec2(0.0, -1.5);
    vec2 sampleUv = clamp(uv + offset * texelSize, texelSize * 2.0, 1.0 - texelSize * 2.0);
    vec3 delta = viewPosition(sampleUv, texture(tWorldDepth, sampleUv).r) - position;
    float drop = -dot(delta, normal);
    float convex = smoothstep(0.002, 0.08, drop);
    float connected = 1.0 - smoothstep(0.15, 0.65, length(delta));
    vec3 tangent = delta + normal * drop;
    float crease = smoothstep(0.3, 1.0, drop / max(length(tangent), 0.0001));
    vec3 rounded = normalize(normal + normalize(tangent + normal * 0.0001) * crease);
    edge = max(edge, crease * convex * connected * pow(max(dot(rounded, normalize(vec3(-0.4, 0.7, 0.6))), 0.0), 8.0));
  }
  return edge * 0.16;
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  outputColor = inputColor;
  float depth = texture(tWorldDepth, uv).r;
  if (depth < 0.999999) {
    vec3 position = viewPosition(uv, depth);
    if (uScreenShading) {
      vec2 shading = screenShading(-position.z);
      if (inputColor.a > 0.0) {
        outputColor.rgb *= mix(1.0, shading.r, 0.5);
      }
      outputColor.rgb *= shading.g;
    }
    if (uPlasticEdges) {
      outputColor.rgb += plasticBevel(position, surfaceNormal(uv)) * sqrt(max(inputColor.rgb, vec3(0.0)));
    }
  }
  if (uFilmic) {
    outputColor.rgb = ACESFilmicToneMapping(outputColor.rgb);
    vec3 coordinate = sRGBTransferOETF(vec4(clamp(outputColor.rgb, 0.0, 1.0), 1.0)).rgb * (16.0 / 17.0) + 0.5 / 17.0;
    vec3 dawn = texture(tDawnLut, coordinate).rgb;
    vec3 noon = texture(tNoonLut, coordinate).rgb;
    vec3 dusk = texture(tDuskLut, coordinate).rgb;
    float daylight = smoothstep(0.0, 0.7, sin(clamp(uDayPhase, 0.0, 1.0) * 3.14159265));
    outputColor.rgb = sRGBTransferEOTF(vec4(mix(mix(dawn, dusk, smoothstep(0.45, 0.55, uDayPhase)), noon, daylight), 1.0)).rgb;
  }
}
