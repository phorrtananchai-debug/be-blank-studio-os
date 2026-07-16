import { SpaceType } from '../types';

export const spaceTypeOptions: Array<{ value: SpaceType; label: string }> = [
  { value: 'residential_exterior', label: 'Residential Exterior' }, { value: 'living_room', label: 'Living Room' },
  { value: 'dining_room', label: 'Dining Room' }, { value: 'kitchen', label: 'Kitchen' }, { value: 'bedroom', label: 'Bedroom' },
  { value: 'bathroom', label: 'Bathroom' }, { value: 'home_office', label: 'Home Office' }, { value: 'walk_in_closet', label: 'Walk-in Closet' },
  { value: 'garage_carport', label: 'Garage / Carport' }, { value: 'garden_landscape', label: 'Garden / Landscape' },
  { value: 'pool_terrace', label: 'Pool / Terrace' }, { value: 'courtyard', label: 'Courtyard' },
  { value: 'facade_detail', label: 'Facade Detail' }, { value: 'multi_purpose_room', label: 'Multi-purpose Room' }, { value: 'other', label: 'Other / Unclassified' },
];

export const spaceTypeLabel = (value: SpaceType) => spaceTypeOptions.find((item) => item.value === value)?.label || 'Other / Unclassified';
