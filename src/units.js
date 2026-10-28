/**
 * Unit catalogue: every category and its units as plain, frozen data.
 *
 * A linear unit carries `factor`: how many base units one unit is, written from
 * the defining value (1 in = 0.0254 m and 1 lb = 0.45359237 kg exactly).
 * Affine units (temperature) and inverse units (L/100 km) carry a
 * `toBase` / `fromBase` pair instead.
 *
 * Parsing hints:
 * - the symbol and both names always match, ignoring case and diacritics;
 * - `aliases` match the same way ("feet", "sq ft", "su bardagi");
 * - `exactAliases` only match with the exact case ("Mb" is a megabit, "MB" a megabyte);
 * - `caseSensitive` keeps the symbol itself case-exact ("mW" is not "MW").
 * Regular plurals ("miles", "inches") are handled by the lookup, not listed here.
 */

// Exact defining constants.
const INCH = 0.0254; // m, international inch (1959)
const FOOT = 0.3048; // m
const YARD = 0.9144; // m
const MILE = 1609.344; // m
const NAUTICAL_MILE = 1852; // m
const POUND = 0.45359237; // kg, international avoirdupois pound
const STANDARD_GRAVITY = 9.80665; // m/s²
const POUND_FORCE = POUND * STANDARD_GRAVITY; // N
const US_GALLON = 3.785411784; // L, 231 in³
const UK_GALLON = 4.54609; // L, imperial gallon
const CALORIE = 4.184; // J, thermochemical calorie
const BTU = 1055.05585262; // J, International Table BTU
const MMHG = 133.322387415; // Pa, conventional millimetre of mercury
const ABSOLUTE_ZERO_C = 273.15; // K at 0 °C
const RANKINE_AT_ZERO_C = 491.67; // °R at 0 °C

// Units shared by the volume and cooking categories (both use litres as base).
const MILLILITRE = {
  id: 'ml',
  symbol: 'mL',
  name: { en: 'Millilitre', tr: 'Mililitre' },
  factor: 1e-3,
  aliases: ['cc', 'cm³', 'cm^3', 'milliliter'],
};
const LITRE = {
  id: 'l',
  symbol: 'L',
  name: { en: 'Litre', tr: 'Litre' },
  factor: 1,
  aliases: ['lt', 'ltr', 'liter'],
};
const US_FLUID_OUNCE = {
  id: 'floz_us',
  symbol: 'fl oz (US)',
  name: { en: 'Fluid ounce (US)', tr: 'Sıvı ons (ABD)' },
  factor: US_GALLON / 128,
  aliases: ['fl oz', 'floz', 'fluid ounce', 'us fl oz', 'sıvı ons'],
};
const US_PINT = {
  id: 'pt_us',
  symbol: 'pt (US)',
  name: { en: 'Pint (US)', tr: 'Pint (ABD)' },
  factor: US_GALLON / 8,
  aliases: ['pt', 'pint', 'us pt', 'us pint'],
};
const US_QUART = {
  id: 'qt_us',
  symbol: 'qt (US)',
  name: { en: 'Quart (US)', tr: 'Quart (ABD)' },
  factor: US_GALLON / 4,
  aliases: ['qt', 'quart', 'us qt', 'us quart'],
};

const LENGTH = [
  { id: 'nm', symbol: 'nm', name: { en: 'Nanometre', tr: 'Nanometre' }, factor: 1e-9, aliases: ['nanometer'] },
  { id: 'um', symbol: 'µm', name: { en: 'Micrometre', tr: 'Mikrometre' }, factor: 1e-6, aliases: ['um', 'micrometer', 'micron', 'mikron'] },
  { id: 'mm', symbol: 'mm', name: { en: 'Millimetre', tr: 'Milimetre' }, factor: 1e-3, aliases: ['millimeter'] },
  { id: 'cm', symbol: 'cm', name: { en: 'Centimetre', tr: 'Santimetre' }, factor: 1e-2, aliases: ['centimeter', 'santim'] },
  { id: 'm', symbol: 'm', name: { en: 'Metre', tr: 'Metre' }, factor: 1, aliases: ['meter'] },
  { id: 'km', symbol: 'km', name: { en: 'Kilometre', tr: 'Kilometre' }, factor: 1e3, aliases: ['kilometer'] },
  { id: 'in', symbol: 'in', name: { en: 'Inch', tr: 'İnç' }, factor: INCH, aliases: ['"', '″', '”', "''"] },
  { id: 'ft', symbol: 'ft', name: { en: 'Foot', tr: 'Fit' }, factor: FOOT, aliases: ['feet', "'", '′', '’'] },
  { id: 'yd', symbol: 'yd', name: { en: 'Yard', tr: 'Yarda' }, factor: YARD },
  { id: 'mi', symbol: 'mi', name: { en: 'Mile', tr: 'Mil' }, factor: MILE },
  { id: 'nmi', symbol: 'nmi', name: { en: 'Nautical mile', tr: 'Deniz mili' }, factor: NAUTICAL_MILE, exactAliases: ['NM'] },
];

const AREA = [
  { id: 'mm2', symbol: 'mm²', name: { en: 'Square millimetre', tr: 'Milimetrekare' }, factor: 1e-6, aliases: ['mm^2', 'sq mm', 'square millimeter'] },
  { id: 'cm2', symbol: 'cm²', name: { en: 'Square centimetre', tr: 'Santimetrekare' }, factor: 1e-4, aliases: ['cm^2', 'sq cm', 'square centimeter'] },
  { id: 'm2', symbol: 'm²', name: { en: 'Square metre', tr: 'Metrekare' }, factor: 1, aliases: ['m^2', 'sq m', 'sqm', 'square meter'] },
  { id: 'daa', symbol: 'daa', name: { en: 'Decare (dönüm)', tr: 'Dekar (dönüm)' }, factor: 1e3, aliases: ['decare', 'dekar', 'dönüm', 'dunam', 'dunum'] },
  { id: 'ha', symbol: 'ha', name: { en: 'Hectare', tr: 'Hektar' }, factor: 1e4 },
  { id: 'km2', symbol: 'km²', name: { en: 'Square kilometre', tr: 'Kilometrekare' }, factor: 1e6, aliases: ['km^2', 'sq km', 'square kilometer'] },
  // Squares of the exact inch, foot, yard and mile.
  { id: 'in2', symbol: 'in²', name: { en: 'Square inch', tr: 'İnç kare' }, factor: 0.00064516, aliases: ['in^2', 'sq in'] },
  { id: 'ft2', symbol: 'ft²', name: { en: 'Square foot', tr: 'Fit kare' }, factor: 0.09290304, aliases: ['ft^2', 'sq ft', 'sqft', 'square feet'] },
  { id: 'yd2', symbol: 'yd²', name: { en: 'Square yard', tr: 'Yarda kare' }, factor: 0.83612736, aliases: ['yd^2', 'sq yd'] },
  { id: 'ac', symbol: 'ac', name: { en: 'Acre', tr: 'Akre' }, factor: 4046.8564224 }, // 43 560 ft²
  { id: 'mi2', symbol: 'mi²', name: { en: 'Square mile', tr: 'Mil kare' }, factor: 2589988.110336, aliases: ['mi^2', 'sq mi'] },
];

const VOLUME = [
  MILLILITRE,
  LITRE,
  { id: 'm3', symbol: 'm³', name: { en: 'Cubic metre', tr: 'Metreküp' }, factor: 1e3, aliases: ['m^3', 'cu m', 'cubic meter'] },
  // Cubes of the exact inch and foot, in litres.
  { id: 'in3', symbol: 'in³', name: { en: 'Cubic inch', tr: 'İnç küp' }, factor: 0.016387064, aliases: ['in^3', 'cu in'] },
  { id: 'ft3', symbol: 'ft³', name: { en: 'Cubic foot', tr: 'Fit küp' }, factor: 28.316846592, aliases: ['ft^3', 'cu ft', 'cubic feet'] },
  { id: 'gal_us', symbol: 'gal (US)', name: { en: 'Gallon (US)', tr: 'Galon (ABD)' }, factor: US_GALLON, aliases: ['gal', 'gallon', 'galon', 'us gal', 'us gallon', 'gal us'] },
  US_QUART,
  US_PINT,
  US_FLUID_OUNCE,
  { id: 'gal_uk', symbol: 'gal (UK)', name: { en: 'Gallon (UK)', tr: 'Galon (İng.)' }, factor: UK_GALLON, aliases: ['imp gal', 'uk gal', 'gal uk', 'imperial gallon', 'uk gallon'] },
  { id: 'pt_uk', symbol: 'pt (UK)', name: { en: 'Pint (UK)', tr: 'Pint (İng.)' }, factor: UK_GALLON / 8, aliases: ['imp pt', 'uk pt', 'imperial pint', 'uk pint'] },
  { id: 'floz_uk', symbol: 'fl oz (UK)', name: { en: 'Fluid ounce (UK)', tr: 'Sıvı ons (İng.)' }, factor: UK_GALLON / 160, aliases: ['imp fl oz', 'uk fl oz', 'imperial fluid ounce'] },
  { id: 'bbl', symbol: 'bbl', name: { en: 'Barrel (oil)', tr: 'Varil (petrol)' }, factor: 42 * US_GALLON, aliases: ['barrel', 'oil barrel', 'varil'] },
];

const MASS = [
  { id: 'ug', symbol: 'µg', name: { en: 'Microgram', tr: 'Mikrogram' }, factor: 1e-9, aliases: ['ug', 'mcg'] },
  { id: 'mg', symbol: 'mg', name: { en: 'Milligram', tr: 'Miligram' }, factor: 1e-6 },
  { id: 'g', symbol: 'g', name: { en: 'Gram', tr: 'Gram' }, factor: 1e-3, aliases: ['gr', 'gramme'] },
  { id: 'kg', symbol: 'kg', name: { en: 'Kilogram', tr: 'Kilogram' }, factor: 1, aliases: ['kilo', 'kgs'] },
  { id: 't', symbol: 't', name: { en: 'Tonne', tr: 'Ton' }, factor: 1e3, aliases: ['metric ton'] },
  { id: 'ct', symbol: 'ct', name: { en: 'Carat', tr: 'Karat' }, factor: 2e-4 },
  { id: 'oz', symbol: 'oz', name: { en: 'Ounce', tr: 'Ons' }, factor: POUND / 16 },
  { id: 'lb', symbol: 'lb', name: { en: 'Pound', tr: 'Libre' }, factor: POUND, aliases: ['lbs'] },
  { id: 'st', symbol: 'st', name: { en: 'Stone', tr: 'Stone' }, factor: 14 * POUND },
  { id: 'ozt', symbol: 'oz t', name: { en: 'Troy ounce', tr: 'Troy ons' }, factor: 0.0311034768, aliases: ['ozt', 'troy oz'] },
  { id: 'ton_us', symbol: 'ton (US)', name: { en: 'Short ton (US)', tr: 'Kısa ton (ABD)' }, factor: 2000 * POUND, aliases: ['short ton', 'us ton'] },
  { id: 'ton_uk', symbol: 'ton (UK)', name: { en: 'Long ton (UK)', tr: 'Uzun ton (İng.)' }, factor: 2240 * POUND, aliases: ['long ton', 'uk ton'] },
];

// Base: degree Celsius, so the everyday Celsius/Fahrenheit/Kelvin values stay exact.
const TEMPERATURE = [
  {
    id: 'C',
    symbol: '°C',
    name: { en: 'Celsius', tr: 'Santigrat' },
    factor: 1,
    aliases: ['c', 'centigrade', 'degc', 'deg c', 'degree celsius', 'degrees celsius'],
  },
  {
    id: 'F',
    symbol: '°F',
    name: { en: 'Fahrenheit', tr: 'Fahrenhayt' },
    toBase: (f) => ((f - 32) * 5) / 9,
    fromBase: (c) => (c * 9) / 5 + 32,
    aliases: ['f', 'degf', 'deg f', 'degree fahrenheit', 'degrees fahrenheit'],
  },
  {
    id: 'K',
    symbol: 'K',
    name: { en: 'Kelvin', tr: 'Kelvin' },
    toBase: (k) => k - ABSOLUTE_ZERO_C,
    fromBase: (c) => c + ABSOLUTE_ZERO_C,
  },
  {
    id: 'R',
    symbol: '°R',
    name: { en: 'Rankine', tr: 'Rankine' },
    toBase: (r) => ((r - RANKINE_AT_ZERO_C) * 5) / 9,
    fromBase: (c) => ((c + ABSOLUTE_ZERO_C) * 9) / 5,
    aliases: ['r', 'degr', 'deg r', 'degree rankine', 'degrees rankine'],
  },
];

const SPEED = [
  { id: 'm_s', symbol: 'm/s', name: { en: 'Metres per second', tr: 'Metre/saniye' }, factor: 1, aliases: ['mps', 'm/sec', 'meters per second'] },
  { id: 'km_h', symbol: 'km/h', name: { en: 'Kilometres per hour', tr: 'Kilometre/saat' }, factor: 1000 / 3600, aliases: ['kmh', 'kph', 'kmph', 'km/hr', 'km/sa', 'kilometers per hour'] },
  { id: 'mph', symbol: 'mph', name: { en: 'Miles per hour', tr: 'Mil/saat' }, factor: MILE / 3600, aliases: ['mi/h', 'mi/hr', 'mil/sa'] },
  { id: 'kn', symbol: 'kn', name: { en: 'Knot', tr: 'Knot (deniz mili/saat)' }, factor: NAUTICAL_MILE / 3600, aliases: ['kt', 'kts', 'knot', 'deniz mili/saat'] },
  { id: 'ft_s', symbol: 'ft/s', name: { en: 'Feet per second', tr: 'Fit/saniye' }, factor: FOOT, aliases: ['fps', 'ft/sec'] },
];

// Month and year are Gregorian averages: 365.2425 days per year, a twelfth of that per month.
const TIME = [
  { id: 'ns', symbol: 'ns', name: { en: 'Nanosecond', tr: 'Nanosaniye' }, factor: 1e-9 },
  { id: 'us', symbol: 'µs', name: { en: 'Microsecond', tr: 'Mikrosaniye' }, factor: 1e-6, aliases: ['us'] },
  { id: 'ms', symbol: 'ms', name: { en: 'Millisecond', tr: 'Milisaniye' }, factor: 1e-3 },
  { id: 's', symbol: 's', name: { en: 'Second', tr: 'Saniye' }, factor: 1, aliases: ['sec', 'sn'] },
  { id: 'min', symbol: 'min', name: { en: 'Minute', tr: 'Dakika' }, factor: 60, aliases: ['dk', 'dak'] },
  { id: 'h', symbol: 'h', name: { en: 'Hour', tr: 'Saat' }, factor: 3600, aliases: ['hr', 'sa'] },
  { id: 'd', symbol: 'd', name: { en: 'Day', tr: 'Gün' }, factor: 86400 },
  { id: 'wk', symbol: 'wk', name: { en: 'Week', tr: 'Hafta' }, factor: 604800 },
  { id: 'mo', symbol: 'mo', name: { en: 'Month (avg.)', tr: 'Ay (ort.)' }, factor: 2629746, aliases: ['month', 'ay'] },
  { id: 'yr', symbol: 'yr', name: { en: 'Year (avg.)', tr: 'Yıl (ort.)' }, factor: 31556952, aliases: ['y', 'year', 'yıl', 'sene'] },
];

// Base: byte. SI prefixes are powers of 1000, IEC prefixes (Ki, Mi, ...) powers of 1024.
const DATA = [
  { id: 'bit', symbol: 'bit', name: { en: 'Bit', tr: 'Bit' }, factor: 1 / 8, exactAliases: ['b'] },
  { id: 'kbit', symbol: 'kbit', name: { en: 'Kilobit', tr: 'Kilobit' }, factor: 1e3 / 8, exactAliases: ['kb', 'Kb'] },
  { id: 'Mbit', symbol: 'Mbit', name: { en: 'Megabit', tr: 'Megabit' }, factor: 1e6 / 8, exactAliases: ['Mb'] },
  { id: 'Gbit', symbol: 'Gbit', name: { en: 'Gigabit', tr: 'Gigabit' }, factor: 1e9 / 8, exactAliases: ['Gb'] },
  { id: 'Tbit', symbol: 'Tbit', name: { en: 'Terabit', tr: 'Terabit' }, factor: 1e12 / 8, exactAliases: ['Tb'] },
  { id: 'Kibit', symbol: 'Kibit', name: { en: 'Kibibit', tr: 'Kibibit' }, factor: 2 ** 10 / 8, exactAliases: ['Kib'] },
  { id: 'Mibit', symbol: 'Mibit', name: { en: 'Mebibit', tr: 'Mebibit' }, factor: 2 ** 20 / 8, exactAliases: ['Mib'] },
  { id: 'Gibit', symbol: 'Gibit', name: { en: 'Gibibit', tr: 'Gibibit' }, factor: 2 ** 30 / 8, exactAliases: ['Gib'] },
  { id: 'B', symbol: 'B', name: { en: 'Byte', tr: 'Bayt' }, factor: 1, aliases: ['octet'] },
  { id: 'kB', symbol: 'kB', name: { en: 'Kilobyte', tr: 'Kilobayt' }, factor: 1e3 },
  { id: 'MB', symbol: 'MB', name: { en: 'Megabyte', tr: 'Megabayt' }, factor: 1e6 },
  { id: 'GB', symbol: 'GB', name: { en: 'Gigabyte', tr: 'Gigabayt' }, factor: 1e9 },
  { id: 'TB', symbol: 'TB', name: { en: 'Terabyte', tr: 'Terabayt' }, factor: 1e12 },
  { id: 'PB', symbol: 'PB', name: { en: 'Petabyte', tr: 'Petabayt' }, factor: 1e15 },
  { id: 'KiB', symbol: 'KiB', name: { en: 'Kibibyte', tr: 'Kibibayt' }, factor: 2 ** 10 },
  { id: 'MiB', symbol: 'MiB', name: { en: 'Mebibyte', tr: 'Mebibayt' }, factor: 2 ** 20 },
  { id: 'GiB', symbol: 'GiB', name: { en: 'Gibibyte', tr: 'Gibibayt' }, factor: 2 ** 30 },
  { id: 'TiB', symbol: 'TiB', name: { en: 'Tebibyte', tr: 'Tebibayt' }, factor: 2 ** 40 },
  { id: 'PiB', symbol: 'PiB', name: { en: 'Pebibyte', tr: 'Pebibayt' }, factor: 2 ** 50 },
];

const PRESSURE = [
  { id: 'Pa', symbol: 'Pa', name: { en: 'Pascal', tr: 'Paskal' }, factor: 1 },
  { id: 'hPa', symbol: 'hPa', name: { en: 'Hectopascal', tr: 'Hektopaskal' }, factor: 100 },
  { id: 'kPa', symbol: 'kPa', name: { en: 'Kilopascal', tr: 'Kilopaskal' }, factor: 1e3 },
  { id: 'MPa', symbol: 'MPa', name: { en: 'Megapascal', tr: 'Megapaskal' }, factor: 1e6 },
  { id: 'bar', symbol: 'bar', name: { en: 'Bar', tr: 'Bar' }, factor: 1e5 },
  { id: 'mbar', symbol: 'mbar', name: { en: 'Millibar', tr: 'Milibar' }, factor: 100, aliases: ['mb'] },
  { id: 'atm', symbol: 'atm', name: { en: 'Standard atmosphere', tr: 'Standart atmosfer' }, factor: 101325, aliases: ['atmosphere', 'atmosfer'] },
  { id: 'at', symbol: 'kgf/cm²', name: { en: 'Technical atmosphere', tr: 'Teknik atmosfer' }, factor: 98066.5, aliases: ['at', 'kg/cm²', 'kg/cm^2'] },
  { id: 'psi', symbol: 'psi', name: { en: 'Pound per square inch', tr: 'Psi' }, factor: POUND_FORCE / 0.00064516, aliases: ['lbf/in²', 'lb/in²', 'pounds per square inch'] },
  { id: 'mmHg', symbol: 'mmHg', name: { en: 'Millimetre of mercury', tr: 'Milimetre cıva' }, factor: MMHG, aliases: ['mm hg'] },
  { id: 'torr', symbol: 'Torr', name: { en: 'Torr', tr: 'Torr' }, factor: 101325 / 760 },
  { id: 'inHg', symbol: 'inHg', name: { en: 'Inch of mercury', tr: 'İnç cıva' }, factor: 25.4 * MMHG, aliases: ['in hg'] },
];

const ENERGY = [
  { id: 'J', symbol: 'J', name: { en: 'Joule', tr: 'Jul' }, factor: 1 },
  { id: 'kJ', symbol: 'kJ', name: { en: 'Kilojoule', tr: 'Kilojul' }, factor: 1e3 },
  { id: 'MJ', symbol: 'MJ', name: { en: 'Megajoule', tr: 'Megajul' }, factor: 1e6 },
  { id: 'cal', symbol: 'cal', name: { en: 'Calorie', tr: 'Kalori' }, factor: CALORIE },
  { id: 'kcal', symbol: 'kcal', name: { en: 'Kilocalorie', tr: 'Kilokalori' }, factor: 1000 * CALORIE, exactAliases: ['Cal'] },
  { id: 'Wh', symbol: 'Wh', name: { en: 'Watt-hour', tr: 'Watt-saat' }, factor: 3600, aliases: ['watt hour'] },
  { id: 'kWh', symbol: 'kWh', name: { en: 'Kilowatt-hour', tr: 'Kilowatt-saat' }, factor: 3.6e6, aliases: ['kilowatt hour'] },
  { id: 'eV', symbol: 'eV', name: { en: 'Electronvolt', tr: 'Elektronvolt' }, factor: 1.602176634e-19, aliases: ['electron volt'] },
  { id: 'BTU', symbol: 'BTU', name: { en: 'British thermal unit', tr: 'BTU' }, factor: BTU },
  { id: 'ft_lbf', symbol: 'ft·lbf', name: { en: 'Foot-pound', tr: 'Fit-libre' }, factor: FOOT * POUND_FORCE, aliases: ['ft-lbf', 'ft lbf', 'ftlbf', 'ft·lb', 'ft-lb', 'ft lb', 'foot pound'] },
];

const POWER = [
  { id: 'mW', symbol: 'mW', name: { en: 'Milliwatt', tr: 'Miliwatt' }, factor: 1e-3, caseSensitive: true },
  { id: 'W', symbol: 'W', name: { en: 'Watt', tr: 'Watt' }, factor: 1, aliases: ['vat'] },
  { id: 'kW', symbol: 'kW', name: { en: 'Kilowatt', tr: 'Kilowatt' }, factor: 1e3, aliases: ['kilovat'] },
  { id: 'MW', symbol: 'MW', name: { en: 'Megawatt', tr: 'Megawatt' }, factor: 1e6 },
  { id: 'hp', symbol: 'hp', name: { en: 'Horsepower (mechanical)', tr: 'Beygir gücü (mekanik)' }, factor: 550 * FOOT * POUND_FORCE, aliases: ['horsepower', 'bhp', 'beygir gücü'] },
  { id: 'PS', symbol: 'PS', name: { en: 'Metric horsepower', tr: 'Metrik beygir gücü' }, factor: 75 * STANDARD_GRAVITY, aliases: ['cv', 'metric hp'] },
  { id: 'btu_h', symbol: 'BTU/h', name: { en: 'BTU per hour', tr: 'BTU/saat' }, factor: BTU / 3600, aliases: ['btu/hr', 'btuh'] },
  { id: 'kcal_h', symbol: 'kcal/h', name: { en: 'Kilocalories per hour', tr: 'Kilokalori/saat' }, factor: (1000 * CALORIE) / 3600, aliases: ['kcal/hr'] },
];

// Base: degree.
const ANGLE = [
  { id: 'deg', symbol: '°', name: { en: 'Degree', tr: 'Derece' }, factor: 1, aliases: ['deg'] },
  { id: 'rad', symbol: 'rad', name: { en: 'Radian', tr: 'Radyan' }, factor: 180 / Math.PI },
  { id: 'grad', symbol: 'grad', name: { en: 'Gradian', tr: 'Grad' }, factor: 0.9, aliases: ['gon'] },
  { id: 'arcmin', symbol: '′', name: { en: 'Arcminute', tr: 'Açı dakikası' }, factor: 1 / 60, aliases: ["'", '’', 'arcmin', 'minute of arc'] },
  { id: 'arcsec', symbol: '″', name: { en: 'Arcsecond', tr: 'Açı saniyesi' }, factor: 1 / 3600, aliases: ['"', '”', "''", 'arcsec', 'second of arc'] },
  { id: 'turn', symbol: 'rev', name: { en: 'Turn', tr: 'Tur' }, factor: 360, aliases: ['revolution', 'devir'] },
  { id: 'mrad', symbol: 'mrad', name: { en: 'Milliradian', tr: 'Miliradyan' }, factor: 0.18 / Math.PI },
];

// Base: kilometres per litre. L/100 km is its inverse, hence the function pair.
const FUEL = [
  {
    id: 'l_100km',
    symbol: 'L/100 km',
    name: { en: 'Litres per 100 km', tr: 'Litre/100 km' },
    toBase: (litres) => 100 / litres,
    fromBase: (kmPerLitre) => 100 / kmPerLitre,
    aliases: ['l/100km', 'lt/100km', 'lt/100 km', 'liters per 100 km'],
  },
  { id: 'km_l', symbol: 'km/L', name: { en: 'Kilometres per litre', tr: 'Kilometre/litre' }, factor: 1, aliases: ['kmpl', 'km/lt', 'kilometers per liter'] },
  { id: 'mpg_us', symbol: 'mpg (US)', name: { en: 'Miles per gallon (US)', tr: 'Mil/galon (ABD)' }, factor: MILE / 1000 / US_GALLON, aliases: ['mpg', 'us mpg', 'mpg us'] },
  { id: 'mpg_uk', symbol: 'mpg (UK)', name: { en: 'Miles per gallon (UK)', tr: 'Mil/galon (İng.)' }, factor: MILE / 1000 / UK_GALLON, aliases: ['uk mpg', 'mpg uk', 'imperial mpg', 'mpg imp'] },
];

// Base: litre. US customary measures plus the Turkish kitchen glasses (by convention).
const COOKING = [
  MILLILITRE,
  LITRE,
  { id: 'tsp', symbol: 'tsp', name: { en: 'Teaspoon (US)', tr: 'Çay kaşığı (ABD)' }, factor: US_GALLON / 768, aliases: ['teaspoon', 'çay kaşığı'] },
  { id: 'tbsp', symbol: 'tbsp', name: { en: 'Tablespoon (US)', tr: 'Yemek kaşığı (ABD)' }, factor: US_GALLON / 256, aliases: ['tablespoon', 'tbs', 'tbl', 'yemek kaşığı'], exactAliases: ['T'] },
  US_FLUID_OUNCE,
  { id: 'cup', symbol: 'cup', name: { en: 'Cup (US)', tr: 'Cup (ABD)' }, factor: US_GALLON / 16, aliases: ['us cup'] },
  US_PINT,
  US_QUART,
  { id: 'tea_glass', symbol: 'çay bardağı', name: { en: 'Turkish tea glass', tr: 'Çay bardağı' }, factor: 0.1, aliases: ['tea glass'] },
  { id: 'water_glass', symbol: 'su bardağı', name: { en: 'Turkish water glass', tr: 'Su bardağı' }, factor: 0.2, aliases: ['water glass', 'bardak'] },
];

/**
 * Builds a frozen category record.
 * @param {string} id
 * @param {{en: string, tr: string}} name
 * @param {[string, string]} defaults default "from" and "to" unit ids
 * @param {object[]} units
 * @param {boolean} [additive=true] whether "5 ft 3 in"-style sums make sense
 */
function defineCategory(id, name, defaults, units, additive = true) {
  const base = units.find((unit) => unit.factor === 1).id;
  return Object.freeze({
    id,
    name: Object.freeze(name),
    base,
    defaults: Object.freeze(defaults),
    additive,
    units: Object.freeze(units.map(freezeUnit)),
  });
}

function freezeUnit(unit) {
  Object.freeze(unit.name);
  Object.freeze(unit.aliases);
  Object.freeze(unit.exactAliases);
  return Object.freeze(unit);
}

/** Every category, in display order. Earlier categories win ambiguous parses. */
export const CATEGORIES = Object.freeze([
  defineCategory('length', { en: 'Length', tr: 'Uzunluk' }, ['m', 'ft'], LENGTH),
  defineCategory('area', { en: 'Area', tr: 'Alan' }, ['m2', 'ft2'], AREA),
  defineCategory('volume', { en: 'Volume', tr: 'Hacim' }, ['l', 'gal_us'], VOLUME),
  defineCategory('mass', { en: 'Mass', tr: 'Kütle' }, ['kg', 'lb'], MASS),
  defineCategory('temperature', { en: 'Temperature', tr: 'Sıcaklık' }, ['C', 'F'], TEMPERATURE, false),
  defineCategory('speed', { en: 'Speed', tr: 'Hız' }, ['km_h', 'mph'], SPEED),
  defineCategory('time', { en: 'Time', tr: 'Zaman' }, ['h', 'min'], TIME),
  defineCategory('data', { en: 'Data', tr: 'Veri' }, ['GB', 'GiB'], DATA),
  defineCategory('pressure', { en: 'Pressure', tr: 'Basınç' }, ['bar', 'psi'], PRESSURE),
  defineCategory('energy', { en: 'Energy', tr: 'Enerji' }, ['kcal', 'kJ'], ENERGY),
  defineCategory('power', { en: 'Power', tr: 'Güç' }, ['kW', 'hp'], POWER),
  defineCategory('angle', { en: 'Angle', tr: 'Açı' }, ['deg', 'rad'], ANGLE),
  defineCategory('fuel', { en: 'Fuel economy', tr: 'Yakıt tüketimi' }, ['l_100km', 'mpg_us'], FUEL, false),
  defineCategory('cooking', { en: 'Cooking', tr: 'Mutfak' }, ['cup', 'ml'], COOKING),
]);

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

/**
 * Looks up a category.
 * @param {string} id
 * @returns {object|undefined}
 */
export function getCategory(id) {
  return CATEGORY_BY_ID.get(id);
}

/**
 * Looks up a unit inside a category.
 * @param {string} categoryId
 * @param {string} unitId
 * @returns {object|undefined}
 */
export function getUnit(categoryId, unitId) {
  return CATEGORY_BY_ID.get(categoryId)?.units.find((unit) => unit.id === unitId);
}
