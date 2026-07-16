import { GeneralReferenceDirection, ProviderCapabilitySummary } from '../types';

export function providerCapabilitySummary(input: { providerId: string; providerLabel: string; model: string; references: GeneralReferenceDirection[]; baseImageSent: boolean; editableResultSent: boolean; mode: string }): ProviderCapabilitySummary {
  const isGoogle = input.providerId === 'google_lite_image' || input.providerId === 'google_pro_image';
  const included = input.references.filter((reference) => reference.included);
  const sent = isGoogle ? included.slice(0, 6) : [];
  return { providerId: input.providerId, providerLabel: input.providerLabel, model: input.model, supportsVision: isGoogle, supportsMultipleReferences: isGoogle ? 'limited' : input.providerId === 'mock_local' ? 'no' : 'limited', effectiveReferenceCount: isGoogle ? 6 : 0, baseImageSent: input.baseImageSent, editableResultSent: input.editableResultSent, referenceImagesSent: sent.map((ref) => ref.name), textOnlyReferences: input.providerId === 'mock_local' ? included.map((ref) => ref.name) : [], omittedReferences: included.slice(sent.length).map((ref) => ({ name: ref.name, reason: isGoogle ? 'Provider-effective reference limit reached.' : 'Selected provider is not connected for image/reference input.' })), seedSupport: false, maskRegionSupport: false, mode: input.mode };
}
