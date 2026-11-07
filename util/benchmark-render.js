;(async () => {
  const resource = performance.getEntriesByType('resource').find(resource => resource.name.includes('/src/lib/engine.ts'))
  if (resource == null) {
    throw new Error('Open the game before measuring')
  }
  const { engine } = await import(resource.name)
  if (!engine.hasWorld || engine.paused) {
    throw new Error('Enter a world and resume the game before measuring')
  }
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
    for (const mode of ['baseline', 'batched']) {
      renderer.extensions.has = name => (name === 'WEBGL_multi_draw' && mode === 'baseline' ? false : hasExtension.call(renderer.extensions, name))
      const cpu = []
      const intervals = []
      const calls = []
      let last = 0
      let frames = 0
      await new Promise(resolve => {
        engine._render = () => {
          const start = performance.now()
          renderer.info.reset()
          render.call(engine)
          const elapsed = performance.now() - start
          if (++frames > 120) {
            cpu.push(elapsed)
            if (last !== 0) {
              intervals.push(start - last)
            }
            calls.push(renderer.info.render.calls)
            last = start
          }
          if (cpu.length === 360) {
            resolve()
          }
        }
      })
      results[mode] = { cpuMilliseconds: summarize(cpu), frameMilliseconds: summarize(intervals), drawCalls: summarize(calls), framesOver20ms: intervals.filter(value => value > 20).length }
    }
  } finally {
    engine._render = render
    renderer.extensions.has = hasExtension
    renderer.info.autoReset = autoReset
  }
  return { resolution: [renderer.domElement.width, renderer.domElement.height], devicePixelRatio, multiDraw: renderer.extensions.has('WEBGL_multi_draw'), results }
})()
