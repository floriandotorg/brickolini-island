#include <tonemapping_pars_fragment>

uniform sampler2D tWorldDepth;
uniform vec3 uAmbientSamples[12];
uniform mat4 uProjectionInverse;
uniform mat4 uProjection;
uniform bool uAmbientOcclusion;
uniform bool uFilmic;

vec3 viewPosition(vec2 sampleUv, float depth) {
  float reciprocalW = 1.0 / (uProjectionInverse[2][3] * (depth * 2.0 - 1.0) + uProjectionInverse[3][3]);
  vec2 plane = (sampleUv * 2.0 - 1.0) * vec2(uProjectionInverse[0][0], uProjectionInverse[1][1]) + uProjectionInverse[3].xy;
  return vec3(plane, -1.0) * reciprocalW;
}

float ambientVisibility(vec3 position, vec3 normal) {
  if (dot(normal, -position) < 0.0) {
    normal = -normal;
  }
  float radius = 1.5;
  float projectedRadius = clamp(radius * uProjection[1][1] * 0.5 / max(-position.z, 0.1), texelSize.y * 2.0, 0.06);
  float occlusion = 0.0;
  for (int n = 0; n < 12; ++n) {
    vec3 sampleOffset = uAmbientSamples[n];
    vec2 offset = vec2(sampleOffset.x * texSize.y / texSize.x, sampleOffset.y) * projectedRadius * sampleOffset.z;
    vec2 sampleUv = uv + offset;
    if (any(lessThan(sampleUv, vec2(0.0))) || any(greaterThan(sampleUv, vec2(1.0)))) {
      continue;
    }
    float depth = texture(tWorldDepth, sampleUv).r;
    if (depth >= 0.999999) {
      continue;
    }
    vec3 delta = viewPosition(sampleUv, depth) - position;
    float distanceSquared = dot(delta, delta);
    float projected = dot(normal, delta);
    if (distanceSquared >= radius * radius || projected <= 0.0 || projected * projected <= max(distanceSquared, 0.000001) * 0.0144) {
      continue;
    }
    float distanceToSample = sqrt(distanceSquared);
    float horizon = max(projected / max(distanceToSample, 0.001) - 0.12, 0.0);
    occlusion += horizon * (1.0 - smoothstep(0.0, radius, distanceToSample));
  }
  return clamp(1.0 - occlusion * 0.09, 0.65, 1.0);
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  outputColor = inputColor;
  float depth = texture(tWorldDepth, uv).r;
  vec3 position = viewPosition(uv, depth);
  vec3 normal = normalize(cross(dFdx(position), dFdy(position)));
  if (uAmbientOcclusion && depth < 0.999999 && inputColor.a > 0.0) {
    outputColor.rgb *= ambientVisibility(position, normal);
  }
  if (uFilmic) {
    outputColor.rgb = ACESFilmicToneMapping(outputColor.rgb);
  }
}
