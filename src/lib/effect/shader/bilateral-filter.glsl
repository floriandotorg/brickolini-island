const float sigma_s = 2.0;
const float sigma_r = 0.2;
const int radius = 4;

float gaussian(float x, float sigma) {
  return 0.39894 * exp(-0.5 * (x * x) / (sigma * sigma)) / sigma;
}

float gaussian(vec3 x, float sigma) {
  return 0.39894 * exp(-0.5 * dot(x, x) / (sigma * sigma)) / sigma;
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  float totalWeight = 0.0;
  vec3 filteredColor = vec3(0.0);

  for (int n = -radius; n <= radius; ++n) {
    for (int m = -radius; m <= radius; ++m) {
      vec2 offset = vec2(n, m);
      vec2 sampleUV = uv + offset * texelSize;
      vec3 sampleColor = texture(tDiffuse, sampleUV).rgb;
      float spatialWeight = gaussian(length(offset), sigma_s);
      float rangeWeight = gaussian(inputColor.rgb - sampleColor, sigma_r);
      float weight = spatialWeight * rangeWeight;
      filteredColor += sampleColor * weight;
      totalWeight += weight;
    }
  }

  outputColor = vec4(filteredColor / totalWeight, inputColor.a);
}
