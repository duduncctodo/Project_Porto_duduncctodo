// Shared per-frame scene fade. Hides the group entirely near weight 0
// (three.js skips invisible subtrees), otherwise scales every material's
// opacity and every light's intensity by weight. Base values are captured
// from the first call, so JSX opacity/intensity props are the single source
// of truth. Scenes that animate a material's opacity themselves must write
// it AFTER calling fadeGroup and multiply by weight on their own.
export function fadeGroup(group, weight) {
  group.visible = weight > 0.001
  if (!group.visible) return
  group.traverse((obj) => {
    if (obj.isLight) {
      if (obj.userData.baseIntensity === undefined) obj.userData.baseIntensity = obj.intensity
      obj.intensity = obj.userData.baseIntensity * weight
      return
    }
    const mat = obj.material
    if (!mat || typeof mat.opacity !== 'number') return
    if (mat.userData.baseOpacity === undefined) {
      mat.userData.baseOpacity = mat.opacity
      mat.transparent = true
    }
    mat.opacity = mat.userData.baseOpacity * weight
  })
}
