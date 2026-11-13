const float amount = 0.05;

vec3 grainHash(uvec3 value) {
  value = value * uvec3(1664525u, 1013904223u, 2654435769u) + uvec3(1013904223u, 1664525u, 374761393u);
  value.x += value.y * value.z;
  value.y += value.z * value.x;
  value.z += value.x * value.y;
  value ^= value >> 16u;
  value.x += value.y * value.z;
  value.y += value.z * value.x;
  value.z += value.x * value.y;
  return vec3(value) * (1.0 / 4294967295.0);
}

vec3 blendSoftlight(vec3 base, vec3 blend) {
  return mix(sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend), base - (1.0 - 2.0 * blend) * base * (1.0 - base), step(0.5, blend));
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  vec3 noise = (grainHash(uvec3(gl_FragCoord.xy, uint(mod(uTime, 10000.0) * 24.0))) * 2.0 - 1.0) * 0.6;
  noise.b *= 0.6;
  float grainStrength = amount * (1.0 - smoothstep(0.0, 1.0, luminance(inputColor.rgb)));
  outputColor = vec4(blendSoftlight(max(inputColor.rgb, vec3(0.0)), noise * grainStrength + 0.5), inputColor.a);
}
