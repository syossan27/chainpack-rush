import '@fontsource/m-plus-rounded-1c/500.css';
import '@fontsource/m-plus-rounded-1c/800.css';
// Traditional Chinese and Korean (subset files are only downloaded when their characters are drawn)
import '@fontsource/noto-sans-tc/500.css';
import '@fontsource/noto-sans-tc/800.css';
import '@fontsource/noto-sans-kr/500.css';
import '@fontsource/noto-sans-kr/800.css';
import Phaser from 'phaser';
import { setAudioSuspended, unlockAudio } from './audio/sfx';
import { initLifecycle, onAppStateChange } from './platform/lifecycle';
import { BaseScene } from './scenes/BaseScene';
import { BootScene } from './scenes/BootScene';
import { DummyScene } from './scenes/DummyScene';
import { LoadoutScene } from './scenes/LoadoutScene';
import { ResultScene } from './scenes/ResultScene';
import { BuildPickScene } from './scenes/BuildPickScene';
import { RunScene } from './scenes/RunScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { COLORS, H, W } from './ui/theme';

// Phaser reuses a scene's previous start data when it is started without any: after
// start('Loadout', { challenge: true }), a plain start('Loadout') opened the challenge loadout again
// (and start('Base') could reopen an old page). Always pass an object so each start gets only its own data.
// Phaser 3.90's NineSlice WebGL renderer: when the vertex buffer fills partway through a nine-slice, it
// flushes and then writes the rest one float off (the offset restarts at 0 instead of -1), so the rest
// of the slices come out broken (a button showed only a corner: 「閉じる」 on the storage page's item
// card). Flush first when the nine-slice would not fit, so it is never split
type NineSliceRender = (
  renderer: Phaser.Renderer.WebGL.WebGLRenderer,
  src: Phaser.GameObjects.NineSlice,
  camera: Phaser.Cameras.Scene2D.Camera,
  parentMatrix?: Phaser.GameObjects.Components.TransformMatrix,
) => void;
const nineSliceProto = Phaser.GameObjects.NineSlice.prototype as unknown as {
  renderWebGL?: NineSliceRender;
};
const nineSliceRender = nineSliceProto.renderWebGL;
if (nineSliceRender)
  nineSliceProto.renderWebGL = function (this: unknown, renderer, src, camera, parentMatrix) {
    const pipeline = renderer.pipelines.set(src.pipeline, src);
    if (pipeline.vertexAvailable() < src.vertices.length) pipeline.flush();
    nineSliceRender.call(this, renderer, src, camera, parentMatrix);
  };

const sceneStart = Phaser.Scenes.ScenePlugin.prototype.start;
Phaser.Scenes.ScenePlugin.prototype.start = function (
  this: Phaser.Scenes.ScenePlugin,
  key?: string | Phaser.Scene,
  data?: object,
) {
  return sceneStart.call(this, key, data ?? {});
};

initLifecycle();
// バックグラウンドでは音を止める（ランは RunScene 側で自動ポーズ）
onAppStateChange((active) => setAudioSuspended(!active));
window.addEventListener('pointerdown', unlockAudio, { passive: true });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bg,
  pixelArt: true, // 最近傍補間
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade' },
  fps: { target: 60 },
  input: { activePointers: 2 },
  scene: [
    BootScene,
    BaseScene,
    StageSelectScene,
    LoadoutScene,
    DummyScene,
    RunScene,
    ResultScene,
    BuildPickScene,
  ],
});

// デバッグ用（ブラウザのコンソールから参照できるように）
(window as unknown as { __game?: Phaser.Game }).__game = game;
