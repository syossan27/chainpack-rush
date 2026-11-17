// Head and back accessories worn on the hero: they follow the hero's current animation frame
// (anchor table), position, scale, visibility, alpha and tint; wings and flags sway a little, the
// star ring glows, and the ice jewel and the star ring glint now and then. The hero recolor never touches them (separate textures).
import Phaser from 'phaser';
import type { Look } from '../core/cosmetics';
import { glintAt, pulseAt } from '../core/accessoryMotion';
import { anchorAt, anchorToWorld, heroFrameOf } from '../core/heroAnchors';
import { ACCESSORY_ART, accessoryKey, type AccessoryArt } from '../data/accessories';
import { HERO_ANCHORS } from '../data/heroAnchors';
import { animKey } from '../data/sprites';

type HeroImage = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
type Slot = 'head' | 'back';

export interface HeroAccessories {
  /** Goes right behind the hero (null when nothing is worn there or its art is missing) */
  back: Phaser.GameObjects.Container | null;
  /** Goes right in front of the hero */
  head: Phaser.GameObjects.Container | null;
}

/** Pale ice blue: the glint's arms unless the art says otherwise */
const GLINT_ARMS = 0xc8f6ff;

/** A 5x5 four-point glint (white middle, arms in `arms`), drawn once per arm color */
function glintTexture(scene: Phaser.Scene, arms: number): string {
  const key = `acc_glint_${arms.toString(16)}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(arms, 1);
  g.fillRect(2, 0, 1, 5);
  g.fillRect(0, 2, 5, 1);
  g.fillStyle(0xffffff, 1);
  g.fillRect(2, 1, 1, 3);
  g.fillRect(1, 2, 3, 1);
  g.generateTexture(key, 5, 5);
  g.destroy();
  return key;
}

/**
 * Put the worn head / back accessories on `hero`. Each is a container added to the scene, not to
 * another container: a caller that keeps the hero in a container adds `back` right before the hero
 * and `head` right after it; otherwise their depth (hero ± 0.1) already layers them. The container
 * sits on the anchor point, so its angle swings around the pivot. They follow the hero every frame
 * and are removed together with the hero
 */
export function addHeroAccessories(
  scene: Phaser.Scene,
  hero: HeroImage,
  look: Pick<Look, 'head' | 'back'>,
): HeroAccessories {
  // The anchor table is for the real art; the placeholder hero drawn in code gets nothing
  const realArt = scene.textures.exists(animKey('hero', 'idle'));
  const make = (slot: Slot) => {
    const id = look[slot];
    const art = id ? ACCESSORY_ART[id] : undefined;
    if (!realArt || !id || !art || !scene.textures.exists(accessoryKey(id))) return null;
    const img = scene.add.image(-art.pivot[0], -art.pivot[1], accessoryKey(id)).setOrigin(0, 0);
    const glint = art.twinkle
      ? scene.add
          .image(
            art.twinkle.at[0] - art.pivot[0] + 0.5,
            art.twinkle.at[1] - art.pivot[1] + 0.5,
            glintTexture(scene, art.twinkle.arms ?? GLINT_ARMS),
          )
          .setAlpha(0)
      : null;
    const box = scene.add.container(hero.x, hero.y, glint ? [img, glint] : [img]);
    box.setDepth(hero.depth + (slot === 'head' ? 0.1 : -0.1));
    return { slot, box, img, glint, art };
  };
  const parts = [make('back'), make('head')].filter(
    (p): p is NonNullable<typeof p> & { art: AccessoryArt } => p !== null,
  );
  if (parts.length === 0) return { back: null, head: null };

  const place = () => {
    if (!hero.active) return;
    const ref = heroFrameOf('hero', hero.frame.texture.key, hero.frame.name);
    const now = scene.time.now;
    for (const p of parts) {
      const pt = ref ? anchorAt(HERO_ANCHORS, 'knight', ref.anim, ref.frame, p.slot) : null;
      p.box.setVisible(hero.visible && pt !== null);
      if (!pt) continue;
      const at = anchorToWorld(
        pt,
        { width: hero.frame.width, height: hero.frame.height },
        hero,
        hero,
        hero.scaleX,
      );
      const sway = p.art.sway;
      p.box
        .setPosition(at.x, at.y)
        .setScale(hero.scaleX, hero.scaleY)
        .setAlpha(hero.alpha * (p.art.pulse ? pulseAt(now, p.art.pulse) : 1))
        .setAngle(sway ? sway.deg * Math.sin((2 * Math.PI * now) / sway.ms) : 0);
      // The hurt flash tints the hero; the accessories flash with it
      p.img.setTint(hero.tintTopLeft);
      if (p.glint && p.art.twinkle) {
        const k = glintAt(now, p.art.twinkle.everyMs);
        p.glint.setAlpha(k).setScale(0.6 + 0.4 * k);
      }
    }
  };
  place();
  // After the animations stepped and the scene moved the hero, before drawing
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, place);
  hero.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, place);
    for (const p of parts) p.box.destroy();
  });
  const of = (slot: Slot) => parts.find((p) => p.slot === slot)?.box ?? null;
  return { back: of('back'), head: of('head') };
}
