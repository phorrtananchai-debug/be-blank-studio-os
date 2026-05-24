import { OutputSpec } from './types';

export const outputPresets: Record<string, Partial<OutputSpec>> = {
  'AI Review Small': { aspectRatio: '4:3', orientation: 'landscape', targetWidth: 1280, targetHeight: 960, finalFormat: 'jpg' },
  'Presentation 16:9': { aspectRatio: '16:9', orientation: 'landscape', targetWidth: 1920, targetHeight: 1080, finalFormat: 'jpg' },
  'Presentation 4:3': { aspectRatio: '4:3', orientation: 'landscape', targetWidth: 1600, targetHeight: 1200, finalFormat: 'jpg' },
  'Instagram Square': { aspectRatio: '1:1', orientation: 'square', targetWidth: 1080, targetHeight: 1080, finalFormat: 'jpg' },
  'Instagram Portrait 4:5': { aspectRatio: '4:5', orientation: 'portrait', targetWidth: 1080, targetHeight: 1350, finalFormat: 'jpg' },
  'Instagram Story 9:16': { aspectRatio: '9:16', orientation: 'portrait', targetWidth: 1080, targetHeight: 1920, finalFormat: 'jpg' },
  'Website Hero 3:2': { aspectRatio: '3:2', orientation: 'landscape', targetWidth: 1800, targetHeight: 1200, finalFormat: 'jpg' },
  'Portfolio Landscape 3:2': { aspectRatio: '3:2', orientation: 'landscape', targetWidth: 2400, targetHeight: 1600, finalFormat: 'jpg' },
  'A4 Portrait Draft': { aspectRatio: '210:297', orientation: 'portrait', targetWidth: 1240, targetHeight: 1754, finalFormat: 'png' },
  'A3 Landscape Draft': { aspectRatio: '420:297', orientation: 'landscape', targetWidth: 1754, targetHeight: 1240, finalFormat: 'png' },
};

export const sceneTypePresets = ['Living Room', 'Retail', 'Facade', 'Lobby', 'Cafe', 'Office', 'Residential Exterior'];
export const preserveRulesPresets = ['Strict Geometry Lock', 'Medium Design Lock', 'Creative Concept Pass', 'Facade Preservation'];
export const atmospherePresets = ['Soft morning light', 'Golden hour', 'Cloudy neutral', 'Moody cinematic', 'Evening warm glow'];
export const peoplePresets = ['None', 'Background silhouette', 'Retail queue', 'Candid walking'];
export const propPresets = ['Minimal', 'Balanced', 'Rich styled', 'Editorial sparse'];
export const environmentPresets = ['Urban street', 'Garden context', 'Sky gradient', 'Coastal'];
export const materialPresets = ['Warm Oak', 'White Brick', 'Black Steel', 'Micro-cement', 'Dark Walnut'];

export const smartRecipes = {
  'Interior Fast Render': { outputPreset: 'AI Review Small', preserveRules: 'Medium Design Lock', atmosphere: 'Soft morning light', people: 'min', propFreedom: 'medium' },
  'Client Presentation Interior': { outputPreset: 'Presentation 16:9', preserveRules: 'Strict Geometry Lock', atmosphere: 'Golden hour', people: 'min', propFreedom: 'low' },
  'Retail Design Proposal': { outputPreset: 'Presentation 16:9', preserveRules: 'Medium Design Lock', atmosphere: 'Cloudy neutral', people: 'mid', propFreedom: 'medium' },
  'Karun Facade Evening': { outputPreset: 'Website Hero 3:2', preserveRules: 'Facade Preservation', atmosphere: 'Evening warm glow', people: 'min', propFreedom: 'low' },
  'Social Media Before/After': { outputPreset: 'Instagram Portrait 4:5', preserveRules: 'Medium Design Lock', atmosphere: 'Moody cinematic', people: 'none', propFreedom: 'high' },
  'Concept Mood Exploration': { outputPreset: 'Portfolio Landscape 3:2', preserveRules: 'Creative Concept Pass', atmosphere: 'Moody cinematic', people: 'mid', propFreedom: 'high' },
};
