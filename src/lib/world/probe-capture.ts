import * as THREE from 'three'

const allFaces = [0, 1, 2, 3, 4, 5]

export const captureProbe = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.CubeCamera, faces: readonly number[] = allFaces): void => {
  const sky = scene.children.filter(object => object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial && object.material.name === 'SkyShader' && object.visible)
  for (const object of sky) {
    object.visible = false
  }
  const background = scene.background
  const target = renderer.getRenderTarget()
  const face = renderer.getActiveCubeFace()
  const level = renderer.getActiveMipmapLevel()
  const xr = renderer.xr.enabled
  const shadows = renderer.shadowMap.autoUpdate
  const texture = camera.renderTarget.texture
  const mipmaps = texture.mipmapsAutoUpdate
  scene.background = (scene.fog?.color.clone() ?? new THREE.Color(0x9bbacc)).multiplyScalar(0.4)
  renderer.xr.enabled = false
  renderer.shadowMap.autoUpdate = false
  try {
    if (camera.coordinateSystem !== renderer.coordinateSystem) {
      camera.coordinateSystem = renderer.coordinateSystem
      camera.updateCoordinateSystem()
    }
    camera.updateMatrixWorld()
    for (const index of faces) {
      texture.mipmapsAutoUpdate = mipmaps && index === 5
      renderer.setRenderTarget(camera.renderTarget, index, camera.activeMipmapLevel)
      const view = camera.children[index]
      if (!(view instanceof THREE.Camera)) {
        throw new Error('Cube camera face is missing')
      }
      renderer.render(scene, view)
    }
  } finally {
    texture.mipmapsAutoUpdate = mipmaps
    scene.background = background
    renderer.xr.enabled = xr
    renderer.shadowMap.autoUpdate = shadows
    renderer.setRenderTarget(target, face, level)
    for (const object of sky) {
      object.visible = true
    }
  }
}
