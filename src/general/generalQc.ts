import { GeneralQcRecord } from '../types';

const status = <T extends string>(keys: readonly T[]) => Object.fromEntries(keys.map((key) => [key, 'unchecked'])) as Record<T, 'pass' | 'warning' | 'fail' | 'unchecked'>;
export function createGeneralQcRecord(analysisMode: GeneralQcRecord['analysisMode'] = 'not_analyzed'): GeneralQcRecord {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), analysisMode, preservation: status(['camera', 'crop', 'geometry', 'openings', 'furniture', 'fixtures', 'materialZones', 'signage', 'circulation'] as const), direction: status(['atmosphere', 'lighting', 'timeOfDay', 'materials', 'landscape', 'photography', 'forbiddenCopying'] as const), artifacts: status(['warpedGeometry', 'duplicatedObjects', 'distortedFurniture', 'brokenReflections', 'inconsistentShadows', 'incorrectScale', 'textDistortion', 'impossibleGlazing', 'peopleArtifacts', 'vegetationArtifacts'] as const), comments: [] };
}
