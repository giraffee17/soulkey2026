// The Three.js side of the stage: renderer, camera, lights, model loading, picking,
// selection glow, camera flights and Play mode (locked player's view, pluck, bow, string shiver).
// It knows nothing about the DOM around it except its canvas host.
// Rendering happens only when something changes (Week 3: stop work you don't need).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildStandinViolin, partIdOf } from "./violin-standin.js";
import { loadViolinModel, PART_HOSTS } from "./violin-model.js";
import { stringLines, playerView } from "./play-view.js";
import { nearestString } from "./string-hits.js";
import { BowGesture } from "./bow-gesture.js";
import { StringVibration } from "./string-vibration.js";

const OVERVIEW = { target: new THREE.Vector3(0, 0, 0), distance: 125 };
const FLIGHT_MS = 700;
const DRAG_THRESHOLD_PX = 5;
const ROTATE_STEP = THREE.MathUtils.degToRad(10);
const XRAY_PARTS = ["top", "f-holes", "purfling"];
const FRONT = new THREE.Vector3(0, 0, 1);
const STRING_REACH_PX = { mouse: 16, pen: 16, touch: 26 };

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class StageScene {
  constructor(host, { palette, reducedMotion, onPick, onHover, onStatus = () => {}, onPluck = () => {}, onBow = () => {} }) {
    this.host = host;
    this.palette = palette;
    this.reducedMotion = reducedMotion;
    this.onPick = onPick;
    this.onHover = onHover;
    this.onStatus = onStatus;
    this.onPluck = onPluck;
    this.onBow = onBow;
    this.life = new AbortController();
    this.frame = 0;
    this.flight = null;
    this.selected = null;
    this.selectedInside = false;
    this.disposed = false;

    // Play mode state: which strings can sound, where they run, and what is sounding now.
    this.playing = false;
    this.stringIds = [];
    this.lines = null;
    this.playPointer = null;
    this.bows = new Map();
    this.bowGesture = new BowGesture();
    this.vibration = new StringVibration({ enabled: !reducedMotion });

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.append(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 1000);
    this.camera.position.set(0, 0, OVERVIEW.distance);

    this.addLights();
    this.violin = new THREE.Group();
    this.scene.add(this.violin);
    this.parts = new Map();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !reducedMotion;
    this.controls.enablePan = false;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 180;
    this.controls.addEventListener("change", () => this.requestRender(), { signal: this.life.signal });
    this.controls.addEventListener("start", () => { this.flight = null; }, { signal: this.life.signal });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.listen();
    this.resize();
    this.loadModel();
  }

  // One status at a time (Week 6): loading, then ready, or fallback to the stand-in.
  async loadModel() {
    this.onStatus("loading");
    try {
      const model = await loadViolinModel();
      if (this.disposed) return; // the stage was removed while loading: ignore the stale result
      this.setViolin(model);
      this.onStatus("ready");
    } catch (error) {
      if (this.disposed) return;
      console.warn("Violin model failed to load, showing the stand-in.", error);
      this.setViolin(buildStandinViolin(this.palette));
      this.onStatus("fallback");
    }
  }

  setViolin(model) {
    this.vibration.reset();
    this.lines = null;
    this.scene.remove(this.violin);
    disposeTree(this.violin);
    this.violin = model;
    this.scene.add(model);
    this.parts = new Map(model.children.map((child) => [child.userData.partId, child]));
    this.applySelection();
  }

  addLights() {
    const hemisphere = new THREE.HemisphereLight(0xfff1d6, 0x120c08, 0.6);
    const spot = new THREE.SpotLight(0xfff0d0, 3.2, 0, Math.PI / 7, 0.65, 0);
    spot.position.set(0, 90, 70);
    spot.target.position.set(0, 0, 0);
    const rim = new THREE.DirectionalLight(0xc9a54c, 0.8);
    rim.position.set(-40, 20, -60);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(40, -10, 60);
    this.scene.add(hemisphere, spot, spot.target, rim, fill);
  }

  listen() {
    const { signal } = this.life;
    const canvas = this.renderer.domElement;
    let down = null;

    canvas.addEventListener("pointerdown", (event) => {
      down = { x: event.clientX, y: event.clientY };
      if (this.playing) this.startPlayPointer(event);
    }, { signal });
    canvas.addEventListener("pointerup", (event) => {
      if (this.playing) {
        down = null;
        this.endPlayPointer(event);
        return;
      }
      if (!down) return;
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      down = null;
      if (moved < DRAG_THRESHOLD_PX) this.onPick(this.pick(event));
    }, { signal });
    canvas.addEventListener("pointercancel", (event) => {
      down = null;
      this.endPlayPointer(event, { cancelled: true });
    }, { signal });
    canvas.addEventListener("pointermove", (event) => {
      if (this.playing) this.movePlayPointer(event);
      else if (event.pointerType === "mouse" && !down) this.onHover(Boolean(this.pick(event)));
    }, { signal });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.cancelFrame();
      else this.requestRender();
    }, { signal });
  }

  pick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.violin, true).filter((hit) => hit.object.visible && hit.object.material.opacity > 0.5);
    return hits.length ? partIdOf(hits[0].object) : null;
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.host;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.playing) this.jumpToPlayerView();
    this.requestRender();
  }

  // Selection: gold glow on the chosen part, see-through top for inside parts, camera flight.
  select(partId, { isInside = false } = {}) {
    if (partId === this.selected && isInside === this.selectedInside) return;
    this.selected = partId;
    this.selectedInside = isInside;
    this.applySelection();
  }

  // Parts painted on another part (like the f-holes on the top) light up their host.
  shownPart(partId) {
    if (!partId) return null;
    return this.parts.has(partId) ? partId : PART_HOSTS[partId] ?? null;
  }

  applySelection() {
    const partId = this.shownPart(this.selected);
    const isInside = this.selectedInside;
    this.parts.forEach((object, id) => {
      object.traverse((child) => {
        if (!child.isMesh) return;
        const glow = id === partId;
        child.material.emissive.set(glow ? this.palette.highlight : 0x000000);
        child.material.emissiveIntensity = glow ? 0.35 : 0;
        const xray = isInside && XRAY_PARTS.includes(id);
        child.material.transparent = xray;
        child.material.opacity = xray ? 0.18 : 1;
        child.material.depthWrite = !xray;
      });
    });
    this.flyHome();
    this.requestRender();
  }

  // Where the camera belongs now: the player's view in Play, otherwise the selected part or the whole violin.
  flyHome({ front = false } = {}) {
    if (this.playing) {
      const view = this.playerView();
      if (view) this.flyToView(view.target, view.position);
      return;
    }
    const partId = this.shownPart(this.selected);
    this.flyTo(partId ? this.parts.get(partId) : null, front ? FRONT : null);
  }

  flyTo(object, fromDirection = null) {
    const target = new THREE.Vector3();
    let distance = OVERVIEW.distance;
    if (object) {
      const box = new THREE.Box3().setFromObject(object);
      box.getCenter(target);
      const size = box.getSize(new THREE.Vector3()).length();
      distance = THREE.MathUtils.clamp(size * 2.4, 22, 90);
    } else {
      target.copy(OVERVIEW.target);
    }
    const direction = fromDirection?.clone() ?? this.camera.position.clone().sub(this.controls.target).normalize();
    this.flyToView(target, target.clone().add(direction.multiplyScalar(distance)));
  }

  flyToView(target, position) {
    if (this.reducedMotion) {
      this.flight = null;
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
      return;
    }
    this.flight = {
      start: performance.now(),
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      fromPosition: this.camera.position.clone(),
      toPosition: position,
    };
  }

  stepFlight(now) {
    if (!this.flight) return false;
    const { start, fromTarget, toTarget, fromPosition, toPosition } = this.flight;
    const t = Math.min(1, (now - start) / FLIGHT_MS);
    const k = easeInOut(t);
    this.controls.target.lerpVectors(fromTarget, toTarget, k);
    this.camera.position.lerpVectors(fromPosition, toPosition, k);
    if (t === 1) this.flight = null;
    return true;
  }

  // Keyboard: arrows rotate around the target, plus and minus zoom.
  nudge(key) {
    if (this.playing) return false; // the camera is locked in Play
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (key === "ArrowLeft") spherical.theta -= ROTATE_STEP;
    else if (key === "ArrowRight") spherical.theta += ROTATE_STEP;
    else if (key === "ArrowUp") spherical.phi -= ROTATE_STEP;
    else if (key === "ArrowDown") spherical.phi += ROTATE_STEP;
    else if (key === "+" || key === "=") spherical.radius *= 0.9;
    else if (key === "-" || key === "_") spherical.radius *= 1.1;
    else return false;
    spherical.makeSafe();
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, this.controls.minDistance, this.controls.maxDistance);
    this.flight = null;
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    this.requestRender();
    return true;
  }

  requestRender() {
    if (this.frame || document.hidden) return;
    this.frame = requestAnimationFrame((now) => this.render(now));
  }

  cancelFrame() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  render(now) {
    this.frame = 0;
    const flying = this.stepFlight(now);
    const damping = this.controls.update();
    const bowing = Boolean(this.playPointer?.bowing);
    if (bowing) this.bow(this.playPointer.id, this.bowGesture.levelAt(now));
    const shivering = this.vibration.step(now);
    this.renderer.render(this.scene, this.camera);
    if (flying || damping || bowing || shivering) this.requestRender();
  }

  // ---- Play mode ----

  // mode: "explore", "assemble" or "play". Play locks the camera to the player's view.
  setMode(mode) {
    const playing = mode === "play";
    if (playing === this.playing) return;
    this.playing = playing;
    this.controls.enabled = !playing;
    this.onHover(false);
    if (!playing) {
      this.playPointer = null;
      this.stopBows();
      this.vibration.reset();
    }
    this.flyHome({ front: !playing });
    this.requestRender();
  }

  // The part ids of the strings Play can sound, in keyboard order (from the API).
  setStrings(ids) {
    this.stringIds = [...ids];
    this.lines = null;
    if (this.playing) this.flyHome();
  }

  playerView() {
    this.lines ??= stringLines(this.parts, this.stringIds);
    return playerView(this.lines, this.camera.aspect, this.camera.fov);
  }

  jumpToPlayerView() {
    const view = this.playerView();
    if (!view) return;
    this.flight = null;
    this.controls.target.copy(view.target);
    this.camera.position.copy(view.position);
  }

  // The string under the pointer, measured on screen, or null.
  stringAt(event) {
    this.lines ??= stringLines(this.parts, this.stringIds);
    if (!this.lines.length) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const toScreen = (point) => {
      const ndc = point.clone().project(this.camera);
      return { x: ((ndc.x + 1) / 2) * rect.width, y: ((1 - ndc.y) / 2) * rect.height };
    };
    const lines = this.lines.map(({ id, bridge, nut }) => ({ id, a: toScreen(bridge), b: toScreen(nut) }));
    const reach = STRING_REACH_PX[event.pointerType] ?? STRING_REACH_PX.mouse;
    return nearestString({ x: event.clientX - rect.left, y: event.clientY - rect.top }, lines, reach);
  }

  // A press on a string waits: let go without moving to pluck, drag to bow.
  startPlayPointer(event) {
    const id = this.stringAt(event);
    if (!id) return;
    this.playPointer = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, bowing: false };
    try {
      this.renderer.domElement.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail for a pointer that already ended; the press still works.
    }
  }

  movePlayPointer(event) {
    const press = this.playPointer;
    if (!press) {
      if (event.pointerType === "mouse") this.onHover(Boolean(this.stringAt(event)));
      return;
    }
    if (event.pointerId !== press.pointerId) return;
    if (!press.bowing && Math.hypot(event.clientX - press.x, event.clientY - press.y) >= DRAG_THRESHOLD_PX) {
      press.bowing = true;
      this.bowGesture.start(press.x, press.y, event.timeStamp);
    }
    if (press.bowing) {
      this.bowGesture.move(event.clientX, event.clientY, event.timeStamp);
      this.requestRender();
    }
  }

  endPlayPointer(event, { cancelled = false } = {}) {
    const press = this.playPointer;
    if (!press || event.pointerId !== press.pointerId) return;
    this.playPointer = null;
    if (press.bowing) this.bow(press.id, 0);
    else if (!cancelled) this.pluck(press.id);
  }

  pluck(partId) {
    if (!this.playing || !this.stringIds.includes(partId)) return;
    this.vibration.pluck(partId, this.parts.get(partId), performance.now());
    this.onPluck(partId);
    this.requestRender();
  }

  // level 0 to 1 keeps the string bowed; 0 lets it go.
  bow(partId, level) {
    if (level > 0) {
      if (!this.playing || !this.stringIds.includes(partId)) return;
      this.bows.set(partId, level);
    } else if (!this.bows.delete(partId)) {
      return;
    }
    this.vibration.bow(partId, this.parts.get(partId), level);
    this.onBow(partId, Math.max(0, level));
    this.requestRender();
  }

  stopBows() {
    [...this.bows.keys()].forEach((id) => this.bow(id, 0));
  }

  dispose() {
    this.disposed = true;
    this.cancelFrame();
    this.life.abort();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    disposeTree(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function disposeTree(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
  });
}
