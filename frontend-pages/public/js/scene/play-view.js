// Play mode geometry: where each string's playing length runs (nut to bridge), and the
// locked camera a player would see the strings from (PLAN.md: "In Play, the camera locks
// to a player's view of the strings"). Works for any model whose parts use the plan's ids.
import * as THREE from "three";

const BAND = 0.6; // how far along the string to look for its vertices around the nut and bridge
const FOCUS_ALONG = 0.14; // look at a point this far from the bridge towards the nut
const VIEW_TILT = THREE.MathUtils.degToRad(52); // from straight in front, tilted towards the chinrest
const HALF_WIDTH = 7.5; // half the width of the view, in model units, at the focus point
const DISTANCE_LIMITS = [22, 70];

// Mean position of an object's vertices whose height (y) is near `y`, in world space.
function crossingAt(object, y) {
  const sum = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  let count = 0;
  object.traverse((child) => {
    if (!child.isMesh) return;
    const positions = child.geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(child.matrixWorld);
      if (Math.abs(vertex.y - y) <= BAND) {
        sum.add(vertex);
        count += 1;
      }
    }
  });
  return count ? sum.divideScalar(count) : null;
}

const centerY = (object) => new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).y;

// [{ id, bridge: Vector3, nut: Vector3 }] for each string id the model has.
export function stringLines(parts, stringIds) {
  const bridge = parts.get("bridge");
  const nut = parts.get("nut");
  if (!bridge || !nut) return [];
  // World positions must be fresh (parents included) before measuring, even before the first render.
  parts.forEach((part) => part.updateWorldMatrix(true, true));
  const bridgeY = centerY(bridge);
  const nutY = centerY(nut);
  return stringIds.flatMap((id) => {
    const string = parts.get(id);
    const atBridge = string && crossingAt(string, bridgeY);
    const atNut = string && crossingAt(string, nutY);
    return atBridge && atNut ? [{ id, bridge: atBridge, nut: atNut }] : [];
  });
}

// Camera target and position for the player's view, fitted to the stage's width.
export function playerView(lines, aspect, fov) {
  if (!lines.length) return null;
  const bridge = new THREE.Vector3();
  const nut = new THREE.Vector3();
  lines.forEach((line) => {
    bridge.add(line.bridge);
    nut.add(line.nut);
  });
  bridge.divideScalar(lines.length);
  nut.divideScalar(lines.length);

  const target = bridge.clone().lerp(nut, FOCUS_ALONG);
  const halfFov = THREE.MathUtils.degToRad(fov / 2);
  const distance = THREE.MathUtils.clamp(HALF_WIDTH / (Math.tan(halfFov) * Math.min(aspect, 1.4)), ...DISTANCE_LIMITS);
  // Behind the bridge (towards the chinrest) and above the top, looking up the strings to the scroll.
  const towardScroll = nut.clone().sub(bridge).normalize();
  const direction = new THREE.Vector3(0, 0, 1).multiplyScalar(Math.cos(VIEW_TILT)).addScaledVector(towardScroll, -Math.sin(VIEW_TILT));
  return { target, position: target.clone().addScaledVector(direction.normalize(), distance) };
}
