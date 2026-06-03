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
  const fromDim = getDimension(fromUnit);
  const toDim = getDimension(toUnit);
  
  if (fromDim !== toDim) {
    throw new Error(`Cannot convert between different dimensions: ${fromDim} and ${toDim}`);
  }
  
  // Convert from fromUnit to absolute base unit (g, mL, unit)
  const baseValue = Number(quantity) * UNIT_MULTIPLIERS[fromUnit];
  // Convert from absolute base unit to toUnit
  return baseValue / UNIT_MULTIPLIERS[toUnit];
}

module.exports = {
  UNIT_MULTIPLIERS,
  DIMENSION_UNITS,
  getDimension,
  convertQuantity
};
