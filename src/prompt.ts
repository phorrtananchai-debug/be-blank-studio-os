import { Scene } from './types';

export function generateLocalPrompt(scene: Scene): string {
  const by = (c: string) => scene.slots.filter((s) => s.category === c);
  const slotLine = (s: any, extra = '') => {
    const imageOnly = !s.descriptionThai?.trim() && (s.referenceImages?.length || 0) > 0
      ? ' Use the attached image reference as approximate visual guidance and allow moderate creative interpretation.'
      : '';
    return `${s.code} ${s.name}: ${s.descriptionThai || '(no Thai description)'}${extra}${imageOnly}`;
  };
  return [
    '1. Objective',
    `Render architectural visualization for "${scene.name}" with faithful geometry and camera.`,
    '',
    '2. Preserve Rules',
    `STRICT: ${scene.preserveRules || 'Medium Design Lock'}. Preserve geometry, camera perspective, architectural form, furniture layout, and mapped placement.`,
    '',
    '3. Scene / Design Language',
    scene.type,
    '',
    '4. Material Mapping',
    ...by('materials').map((s) => slotLine(s, ` | applyTo: ${s.applyTo || '-'} | finish: ${s.finish || '-'} | texture: ${s.texture || '-'}`)),
    '',
    '5. Prop Guidance',
    ...by('props').map((s) => slotLine(s, ` | freedom: ${s.creativeFreedom || 'medium'}`)),
    '',
    '6. Lighting Direction',
    ...by('lighting').map((s) => slotLine(s, ` | direction: ${s.direction || '-'} | quality: ${s.quality || '-'} | intensity: ${s.intensity || '-'}`)),
    '',
    '7. People Guidance',
    `Level: ${scene.people.level}, Motion blur: ${scene.people.motionBlur}, Behavior: ${scene.people.behavior.join(', ')}`,
    `Thai intent: ${scene.people.descriptionThai || '-'}`,
    '',
    '8. Environment / BG',
    ...by('environment').map((s) => slotLine(s)),
    '',
    '9. Atmosphere / Photography',
    scene.atmosphere,
    '',
    '10. Output Size / Crop',
    `${scene.outputSpec.outputPreset} | use ${scene.outputSpec.targetWidth}x${scene.outputSpec.targetHeight} | aspect ${scene.outputSpec.aspectRatio} | crop: ${scene.outputSpec.cropBehavior} | safe area: ${scene.outputSpec.safeAreaPercentage}% | format: ${scene.outputSpec.finalFormat}`,
    '',
    '11. Negative Constraints',
    'Do not alter primary geometry, camera perspective, or mapped material zones. Avoid extra unrealistic objects, text artifacts, bad anatomy, low-quality textures.',
  ]
    .join('\n')
    .trim();
}
