#include <tonemapping_pars_fragment>

uniform sampler2D tWorldDepth;
uniform mat4 uProjectionInverse;
uniform mat4 uProjection;
uniform bool uAmbientOcclusion;
uniform bool uFilmic;
uniform bool uPlasticEdges;

vec3 viewPosition(vec2 sampleUv, float depth) {
  float reciprocalW = 1.0 / (uProjectionInverse[2][3] * (depth * 2.0 - 1.0) + uProjectionInverse[3][3]);
  vec2 plane = (sampleUv * 2.0 - 1.0) * vec2(uProjectionInverse[0][0], uProjectionInverse[1][1]) + uProjectionInverse[3].xy;
  return vec3(plane, -1.0) * reciprocalW;
}

float ambientVisibility(vec3 position, vec3 normal) {
  if (dot(normal, -position) < 0.0) {
    normal = -normal;
  }
  float radius = 2.0;
  float projectedRadius = min(radius * uProjection[1][1] * 0.5 / max(-position.z, 0.1), 0.12);
  vec3 view = normalize(-position);
  float visibility = 0.0;
  for (int n = 0; n < 4; ++n) {
    float angle = (float(n) + 0.5) * 3.14159265 / 4.0;
    vec2 axis = vec2(cos(angle), sin(angle));
    vec3 sliceDirection = vec3(axis, 0.0);
    vec3 sliceNormal = normalize(cross(sliceDirection, view));
    vec3 projectedNormal = normal - sliceNormal * dot(normal, sliceNormal);
    float normalLength = length(projectedNormal);
    float normalAngle = acos(clamp(dot(normalize(projectedNormal), view), -1.0, 1.0));
    normalAngle *= sign(dot(projectedNormal, sliceDirection));
    vec2 horizons = vec2(-1.0);
    for (int side = 0; side < 2; ++side) {
      float direction = side == 0 ? -1.0 : 1.0;
      for (int step = 1; step <= 6; ++step) {
        float fraction = float(step) / 6.0;
        vec2 sampleUv = uv + axis * vec2(texSize.y / texSize.x, 1.0) * direction * projectedRadius * fraction * fraction;
        if (any(lessThan(sampleUv, vec2(0.0))) || any(greaterThan(sampleUv, vec2(1.0)))) {
          continue;
        }
        float sampleDepth = texture(tWorldDepth, sampleUv).r;
        vec3 delta = viewPosition(sampleUv, sampleDepth) - position;
        float distanceToSample = length(delta);
        if (sampleDepth < 0.999999 && distanceToSample > 0.025) {
          float horizon = dot(delta / distanceToSample, view);
          horizons[side] = max(horizons[side], mix(-1.0, horizon, 1.0 - smoothstep(radius * 0.5, radius, distanceToSample)));
        }
      }
    }
    float h0 = normalAngle + max(-acos(clamp(horizons.x, -1.0, 1.0)) - normalAngle, -1.5707963);
    float h1 = normalAngle + min(acos(clamp(horizons.y, -1.0, 1.0)) - normalAngle, 1.5707963);
    visibility += normalLength * 0.25 * (cos(normalAngle) + 2.0 * h0 * sin(normalAngle) - cos(2.0 * h0 - normalAngle)
      + cos(normalAngle) + 2.0 * h1 * sin(normalAngle) - cos(2.0 * h1 - normalAngle));
  }
  return clamp(visibility / 4.0, 0.25, 1.0);
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
    vec3 neighbor = viewPosition(sampleUv, texture(tWorldDepth, sampleUv).r);
    vec3 neighborNormal = surfaceNormal(sampleUv);
    float crease = smoothstep(0.08, 0.55, 1.0 - dot(normal, neighborNormal));
    float convex = smoothstep(0.002, 0.08, -dot(neighbor - position, normal));
    float connected = 1.0 - smoothstep(0.15, 0.65, length(neighbor - position));
    vec3 rounded = normalize(normal + neighborNormal);
    edge = max(edge, crease * convex * connected * pow(max(dot(rounded, normalize(vec3(-0.4, 0.7, 0.6))), 0.0), 8.0));
  }
  return edge * 0.16;
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  outputColor = inputColor;
  float depth = texture(tWorldDepth, uv).r;
  vec3 position = viewPosition(uv, depth);
  vec3 normal = surfaceNormal(uv);
  if (uAmbientOcclusion && depth < 0.999999 && inputColor.a > 0.0) {
    outputColor.rgb *= ambientVisibility(position, normal);
  }
  if (uPlasticEdges && depth < 0.999999) {
    outputColor.rgb += plasticBevel(position, normal) * sqrt(max(inputColor.rgb, vec3(0.0)));
  }
  if (uFilmic) {
    outputColor.rgb = ACESFilmicToneMapping(outputColor.rgb);
  }
}
