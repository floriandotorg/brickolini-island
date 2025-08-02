const int radius = 4;

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  float maxA = 0.0;
  float minA = 1.0;
  float sum = 0.0;
  float totalWeight = 0.0;

  for (int dx = -radius; dx <= radius; dx++) {
    for (int dy = -radius; dy <= radius; dy++) {
      float sampleA = texture(tDiffuse, uv + vec2(dx, dy) * texelSize).a;
      maxA = max(maxA, sampleA);
      minA = min(minA, sampleA);
      float weight = 1.0;
      sum += sampleA * weight;
      totalWeight += weight;
    }
  }

  float contrast = maxA - minA;

  if (contrast < 0.1) {
    outputColor = inputColor;
    return;
  }

  outputColor = vec4(inputColor.rgb, sum / totalWeight);
}
