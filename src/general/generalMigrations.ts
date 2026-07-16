import { GeneralProductionState, Scene, SpaceType } from '../types';
import { createAtmosphereRecipe } from './atmosphereRecipe';
import { createSceneContract } from './sceneContract';
import { createGeneralQcRecord } from './generalQc';

export function createGeneralProductionState(projectId: string, scene: Pick<Scene, 'id' | 'type' | 'renderPassBuilder'>, spaceType: SpaceType = 'other'): GeneralProductionState {
  const analysis = scene.renderPassBuilder?.referenceDirection?.appliedAnalysis;
  return { schemaVersion: 'visual-local-general-production-v1', spaceType, customSpaceTypeLabel: '', sceneContract: createSceneContract(projectId, scene.id, spaceType), atmosphereRecipe: createAtmosphereRecipe(analysis), materialRecipes: [], borrowMaps: [], conflicts: [], generationIntent: 'develop', designFreedom: 'strict', visualDirectionVersions: [], activeVisualDirectionVersionId: undefined, generalQc: createGeneralQcRecord(analysis?.analysisSource || 'not_analyzed') };
}

export function normalizeGeneralProductionState(projectId: string, scene: Pick<Scene, 'id' | 'type' | 'renderPassBuilder' | 'spaceType' | 'customSpaceTypeLabel'>, input?: Partial<GeneralProductionState>): GeneralProductionState {
  const spaceType = input?.spaceType || scene.spaceType || 'other'; const defaults = createGeneralProductionState(projectId, scene, spaceType);
  return { ...defaults, ...(input || {}), spaceType, customSpaceTypeLabel: input?.customSpaceTypeLabel || scene.customSpaceTypeLabel || '', sceneContract: { ...defaults.sceneContract, ...(input?.sceneContract || {}), materialZones: input?.sceneContract?.materialZones || defaults.sceneContract.materialZones, cameraContract: { ...defaults.sceneContract.cameraContract, ...(input?.sceneContract?.cameraContract || {}) } }, atmosphereRecipe: { ...defaults.atmosphereRecipe, ...(input?.atmosphereRecipe || {}) }, borrowMaps: input?.borrowMaps || defaults.borrowMaps, conflicts: input?.conflicts || defaults.conflicts, visualDirectionVersions: input?.visualDirectionVersions || [] };
}
