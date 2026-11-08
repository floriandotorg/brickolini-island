import * as THREE from 'three'

export const captureProbe = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.CubeCamera): void => {
  const sky: THREE.Object3D[] = []
  scene.traverse(object => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial && object.material.name === 'SkyShader' && object.visible) {
      sky.push(object)
      object.visible = false
    }
  })
  const background = scene.background
  const target = renderer.getRenderTarget()
  const xr = renderer.xr.enabled
  const shadows = renderer.shadowMap.autoUpdate
  scene.background = (scene.fog?.color.clone() ?? new THREE.Color(0x9bbacc)).multiplyScalar(0.4)
  renderer.xr.enabled = false
  renderer.shadowMap.autoUpdate = false
  try {
    camera.update(renderer, scene)
  } finally {
    scene.background = background
    renderer.xr.enabled = xr
    renderer.shadowMap.autoUpdate = shadows
    renderer.setRenderTarget(target)
    for (const object of sky) {
      object.visible = true
    }
  }
}
