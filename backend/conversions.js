const UNIT_MULTIPLIERS = {
  g: 1,
  kg: 1000,
  mL: 1,
  L: 1000,
  unit: 1
};

const DIMENSION_UNITS = {
  weight: ['g', 'kg'],
  volume: ['mL', 'L'],
  count: ['unit']
};

function getDimension(unit) {
  if (DIMENSION_UNITS.weight.includes(unit)) return 'weight';
  if (DIMENSION_UNITS.volume.includes(unit)) return 'volume';
  if (DIMENSION_UNITS.count.includes(unit)) return 'count';
  throw new Error(`Unknown unit: ${unit}`);
}

function convertQuantity(quantity, fromUnit, toUnit) {
  // Simple fallback: return raw quantity directly without applying conversions
  return Number(quantity);
}

module.exports = {
  UNIT_MULTIPLIERS,
  DIMENSION_UNITS,
  getDimension,
  convertQuantity
};
