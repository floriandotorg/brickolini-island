uniform float uTransitionTicks;
uniform int uTransitionType;
uniform sampler2D uColumnOrder;
uniform sampler2D uRowShifts;

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  outputColor = inputColor;
  if (uTransitionTicks <= 0.0) {
    return;
  }
  vec2 uv = gl_FragCoord.xy / texSize;
  vec2 pixel = floor(vec2(uv.x, 1.0 - uv.y) * vec2(640.0, 480.0));
  if (uTransitionType == 0 || uTransitionType == 1) {
    float blockSize = uTransitionType == 0 ? 10.0 : 1.0;
    vec2 grid = vec2(640.0, 480.0) / blockSize;
    vec2 block = floor(pixel / blockSize);
    float shift = texture(uRowShifts, vec2((block.y + 0.5) / grid.y, 0.5)).r;
    float col = mod(block.x - shift + grid.x, grid.x);
    float order = texture(uColumnOrder, vec2((col + 0.5) / grid.x, 0.5)).r;
    float perTick = uTransitionType == 0 ? 4.0 : 16.0;
    if (order < perTick * uTransitionTicks) {
      vec2 samplePixel = block * blockSize + 0.5;
      outputColor = uTransitionType == 0 ? texture(tDiffuse, vec2(samplePixel.x / 640.0, 1.0 - samplePixel.y / 480.0)) : vec4(0.0, 0.0, 0.0, 1.0);
    }
  } else if (uTransitionType == 4 || (uTransitionType == 2 && pixel.y < 2.0 * uTransitionTicks) || (uTransitionType == 3 && (pixel.y < uTransitionTicks || pixel.y >= 480.0 - uTransitionTicks || pixel.x < uTransitionTicks || pixel.x >= 640.0 - uTransitionTicks))) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
}
