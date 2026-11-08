export const compileFragmentShader = (template: string, effects: readonly { fragmentShader: string }[], compositeAfter?: number): string =>
  template
    .replace('/// EFFECTS', effects.map((effect, n) => effect.fragmentShader.replace('void mainImage', `void main${n + 1}`)).join('\n'))
    .replace('/// PIPELINE', effects.map((_, n) => `${n === compositeAfter ? 'inputColor.rgb *= inputColor.a;\n' : ''}main${n + 1}(inputColor, outputColor);\ninputColor = outputColor;`).join('\n'))
