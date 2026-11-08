;(async () => {
  const resources = [
    ...new Set(
      performance
        .getEntriesByType('resource')
        .filter(resource => resource.name.includes('/src/lib/engine.ts'))
        .map(resource => resource.name),
    ),
  ]
  if (resources.length !== 1) {
    throw new Error('Restart the development server and reload the game before measuring')
  }
  const { engine } = await import(resources[0])
  if (!engine.hasWorld || engine.paused) {
    throw new Error('Enter a world and resume the game before measuring')
  }
  const options = window.renderBenchmarkOptions ?? {}
  const frameCount = options.frameCount ?? 360
  const warmup = options.warmup ?? 120
  const modes = options.modes ?? ['baseline', 'batched']
  const camera = engine.currentWorld.camera
  const quaternion = camera.quaternion.clone()
  const composition = engine._composer._directCompositionEnabled
  const renderer = engine.renderer
  const render = engine._render
  const hasExtension = renderer.extensions.has
  const autoReset = renderer.info.autoReset
  const summarize = values => {
    values.sort((a, b) => a - b)
    return { median: values[Math.floor(values.length * 0.5)], p95: values[Math.floor(values.length * 0.95)], p99: values[Math.floor(values.length * 0.99)], max: values.at(-1) }
  }
  const results = {}
  try {
    renderer.info.autoReset = false
    for (const mode of modes) {
      engine._composer._directCompositionEnabled = mode !== 'separate' && composition
      renderer.extensions.has = name => (name === 'WEBGL_multi_draw' && mode === 'baseline' ? false : hasExtension.call(renderer.extensions, name))
      const cpu = []
      const intervals = []
      const calls = []
      let last = 0
      let n = 0
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Benchmark exceeded 60 seconds')), 60000)
        engine._render = () => {
          if (options.motion) {
            camera.quaternion.copy(quaternion)
            camera.rotateY((n < warmup ? n / Math.max(1, warmup) : (n - warmup) / frameCount) * Math.PI * 2)
          }
          const start = performance.now()
          renderer.info.reset()
          render.call(engine)
          const elapsed = performance.now() - start
          if (++n > warmup) {
            cpu.push(elapsed)
            if (last !== 0) {
              intervals.push(start - last)
            }
            calls.push(renderer.info.render.calls)
            last = start
          }
          if (cpu.length === frameCount) {
            clearTimeout(timeout)
            resolve()
          }
        }
      })
      results[mode] = { cpuMilliseconds: summarize(cpu), frameMilliseconds: summarize(intervals), drawCalls: summarize(calls), framesOver20ms: intervals.filter(value => value > 20).length }
    }
  } finally {
    camera.quaternion.copy(quaternion)
    engine._composer._directCompositionEnabled = composition
    engine._render = render
    renderer.extensions.has = hasExtension
    renderer.info.autoReset = autoReset
  }
  const report = {
    context: renderer.getContext().getContextAttributes(),
    clearAlpha: renderer.getClearAlpha(),
    preset: localStorage.getItem('settings.graphics.preset'),
    world: engine.currentWorld.name,
    motion: options.motion === true,
    frameCount,
    warmup,
    resolution: [renderer.domElement.width, renderer.domElement.height],
    devicePixelRatio,
    multiDraw: renderer.extensions.has('WEBGL_multi_draw'),
    results,
  }
  window.renderBenchmarkResult = report
  return report
})()
