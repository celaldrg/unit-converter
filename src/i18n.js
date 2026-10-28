/**
 * Interface strings in English and Turkish. Unit and category names live with
 * the unit data in units.js. Placeholders look like {token}.
 */

export const LANGUAGES = Object.freeze(['en', 'tr']);

export const STRINGS = Object.freeze({
  en: Object.freeze({
    appTitle: 'Unit Converter',
    tagline: 'Precise conversions across 14 categories, typed or picked.',
    langToggle: 'TR',
    langToggleLabel: 'Switch to Turkish',
    reset: 'Reset',
    categories: 'Categories',
    from: 'From',
    to: 'To',
    amount: 'Amount',
    unit: 'Unit',
    swap: 'Swap units',
    negate: 'Change sign (+/−)',
    queryLabel: 'Type a conversion',
    queryPlaceholder: 'e.g. 5 ft 3 in to cm',
    queryHint: 'Try “72 F in C”, “1.5 GiB to MB” or “2 cups to ml”.',
    convert: 'Convert',
    tableTitle: 'All units',
    tableShow: 'Show',
    tableHide: 'Hide',
    useAsTarget: 'Convert to {unit}',
    favorites: 'Favorites',
    favoriteAdd: 'Add pair to favorites',
    favoriteRemove: 'Remove pair from favorites',
    favoritesEmpty: 'Star a unit pair to keep it here.',
    recents: 'Recent',
    recentsClear: 'Clear',
    recentsEmpty: 'Your conversions will show up here.',
    copy: 'Copy',
    copyValue: 'Copy {value}',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    footerSource: 'Source on GitHub',
    kbdQuery: 'type a conversion',
    kbdSwap: 'swap units',
    kbdFavorite: 'star the pair',
    kbdTable: 'show or hide the table',
    kbdCategory: 'previous or next category',
    'error.EMPTY': 'Type something like “5 ft to cm”.',
    'error.BAD_NUMBER': 'That number doesn’t look right.',
    'error.MISSING_UNIT': 'Add a unit after the number.',
    'error.UNKNOWN_UNIT': 'Unknown unit “{token}”.',
    'error.MISSING_TARGET': 'Add the unit to convert to.',
    'error.INCOMPATIBLE_UNITS': 'Those units measure different things.',
    'error.BAD_COMPOUND': 'These units can’t be added together.',
    'error.TRAILING_INPUT': 'Didn’t understand “{token}”.',
  }),
  tr: Object.freeze({
    appTitle: 'Birim Çevirici',
    tagline: '14 kategoride hassas çevirme; yazarak ya da seçerek.',
    langToggle: 'EN',
    langToggleLabel: 'İngilizceye geç',
    reset: 'Sıfırla',
    categories: 'Kategoriler',
    from: 'Kaynak',
    to: 'Hedef',
    amount: 'Miktar',
    unit: 'Birim',
    swap: 'Birimlerin yerini değiştir',
    negate: 'İşareti değiştir (+/−)',
    queryLabel: 'Çevirmeyi yazın',
    queryPlaceholder: 'ör. 2,5 kg kaç lb',
    queryHint: '“72 F kaç C”, “1,5 GiB kaç MB” ya da “2 su bardağı kaç ml” deneyin.',
    convert: 'Çevir',
    tableTitle: 'Tüm birimler',
    tableShow: 'Göster',
    tableHide: 'Gizle',
    useAsTarget: '{unit} birimine çevir',
    favorites: 'Favoriler',
    favoriteAdd: 'Çifti favorilere ekle',
    favoriteRemove: 'Çifti favorilerden çıkar',
    favoritesEmpty: 'Bir birim çiftini yıldızlayın, burada dursun.',
    recents: 'Son çevirmeler',
    recentsClear: 'Temizle',
    recentsEmpty: 'Çevirmeleriniz burada görünecek.',
    copy: 'Kopyala',
    copyValue: '{value} kopyala',
    copied: 'Kopyalandı',
    copyFailed: 'Kopyalanamadı',
    footerSource: 'Kaynak kodu GitHub’da',
    kbdQuery: 'çevirme yaz',
    kbdSwap: 'birimlerin yerini değiştir',
    kbdFavorite: 'çifti yıldızla',
    kbdTable: 'tabloyu aç ya da kapat',
    kbdCategory: 'önceki ya da sonraki kategori',
    'error.EMPTY': '“5 ft kaç cm” gibi bir şey yazın.',
    'error.BAD_NUMBER': 'Bu sayı geçerli görünmüyor.',
    'error.MISSING_UNIT': 'Sayıdan sonra bir birim ekleyin.',
    'error.UNKNOWN_UNIT': 'Bilinmeyen birim: “{token}”.',
    'error.MISSING_TARGET': 'Hangi birime çevrileceğini ekleyin.',
    'error.INCOMPATIBLE_UNITS': 'Bu birimler farklı büyüklükleri ölçüyor.',
    'error.BAD_COMPOUND': 'Bu birimler toplanamaz.',
    'error.TRAILING_INPUT': '“{token}” anlaşılamadı.',
  }),
});

/**
 * Returns the string for `key` in `lang`, falling back to English and then to
 * the key itself, with {placeholders} filled from `params`.
 * @param {'en'|'tr'} lang
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(lang, key, params = {}) {
  const template = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}

/**
 * The language the toggle switches to.
 * @param {'en'|'tr'} lang
 * @returns {'en'|'tr'}
 */
export function nextLanguage(lang) {
  return lang === 'tr' ? 'en' : 'tr';
}
