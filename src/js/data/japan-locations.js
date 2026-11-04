// Japan locations database for guide creation autocomplete/validation.
// Prefectures + major cities. Extend `cities` as needed.
window.WTT_LOCATIONS = {
  prefectures: [
    "Aichi", "Akita", "Aomori", "Chiba", "Ehime", "Fukui", "Fukuoka", "Fukushima", "Gifu", "Gunma", "Hiroshima", "Hokkaido", "Hyogo", "Ibaraki", "Ishikawa", "Iwate", "Kagawa", "Kagoshima", "Kanagawa", "Kochi", "Kumamoto", "Kyoto", "Mie", "Miyagi", "Miyazaki", "Nagano", "Nagasaki", "Nara", "Niigata", "Oita", "Okayama", "Okinawa", "Osaka", "Saga", "Saitama", "Shiga", "Shimane", "Shizuoka", "Tochigi", "Tokushima", "Tokyo", "Tottori", "Toyama", "Wakayama", "Yamagata", "Yamaguchi", "Yamanashi"
  ],
  cities: [
    // Hokkaido
    { name: "Sapporo", prefecture: "Hokkaido" },
    { name: "Asahikawa", prefecture: "Hokkaido" },
    { name: "Hakodate", prefecture: "Hokkaido" },
    { name: "Otaru", prefecture: "Hokkaido" },
    { name: "Niseko", prefecture: "Hokkaido" },
    // Miyagi
    { name: "Sendai", prefecture: "Miyagi" },
    // Aomori
    { name: "Aomori", prefecture: "Aomori" },
    // Iwate
    { name: "Morioka", prefecture: "Iwate" },
    // Akita
    { name: "Akita", prefecture: "Akita" },
    // Yamagata
    { name: "Yamagata", prefecture: "Yamagata" },
    // Fukushima
    { name: "Koriyama", prefecture: "Fukushima" },
    { name: "Fukushima", prefecture: "Fukushima" },
    { name: "Aizu-Wakamatsu", prefecture: "Fukushima" },
    // Tokyo
    { name: "Tokyo", prefecture: "Tokyo" },
    // Kanagawa
    { name: "Yokohama", prefecture: "Kanagawa" },
    { name: "Kawasaki", prefecture: "Kanagawa" },
    { name: "Sagamihara", prefecture: "Kanagawa" },
    // Chiba
    { name: "Chiba", prefecture: "Chiba" },
    // Saitama
    { name: "Saitama", prefecture: "Saitama" },
    { name: "Kawaguchi", prefecture: "Saitama" },
    // Tochigi
    { name: "Utsunomiya", prefecture: "Tochigi" },
    // Ibaraki
    { name: "Mito", prefecture: "Ibaraki" },
    { name: "Tsukuba", prefecture: "Ibaraki" },
    // Gunma
    { name: "Maebashi", prefecture: "Gunma" },
    { name: "Takasaki", prefecture: "Gunma" },
    // Aichi
    { name: "Nagoya", prefecture: "Aichi" },
    { name: "Toyota", prefecture: "Aichi" },
    { name: "Okazaki", prefecture: "Aichi" },
    // Shizuoka
    { name: "Shizuoka", prefecture: "Shizuoka" },
    { name: "Hamamatsu", prefecture: "Shizuoka" },
    // Niigata
    { name: "Niigata", prefecture: "Niigata" },
    { name: "Nagaoka", prefecture: "Niigata" },
    // Ishikawa
    { name: "Kanazawa", prefecture: "Ishikawa" },
    // Fukui
    { name: "Fukui", prefecture: "Fukui" },
    // Toyama
    { name: "Toyama", prefecture: "Toyama" },
    // Nagano
    { name: "Nagano", prefecture: "Nagano" },
    { name: "Matsumoto", prefecture: "Nagano" },
    // Yamanashi
    { name: "Kofu", prefecture: "Yamanashi" },
    // Gifu
    { name: "Gifu", prefecture: "Gifu" },
    { name: "Tajimi", prefecture: "Gifu" },
    // Osaka
    { name: "Osaka", prefecture: "Osaka" },
    { name: "Sakai", prefecture: "Osaka" },
    // Hyogo
    { name: "Kobe", prefecture: "Hyogo" },
    { name: "Himeji", prefecture: "Hyogo" },
    { name: "Amagasaki", prefecture: "Hyogo" },
    // Kyoto
    { name: "Kyoto", prefecture: "Kyoto" },
    { name: "Uji", prefecture: "Kyoto" },
    // Nara
    { name: "Nara", prefecture: "Nara" },
    // Wakayama
    { name: "Wakayama", prefecture: "Wakayama" },
    // Shiga
    { name: "Otsu", prefecture: "Shiga" },
    { name: "Hikone", prefecture: "Shiga" },
    // Hiroshima
    { name: "Hiroshima", prefecture: "Hiroshima" },
    { name: "Kure", prefecture: "Hiroshima" },
    { name: "Mihara", prefecture: "Hiroshima" },
    // Okayama
    { name: "Okayama", prefecture: "Okayama" },
    { name: "Kurashiki", prefecture: "Okayama" },
    // Yamaguchi
    { name: "Yamaguchi", prefecture: "Yamaguchi" },
    { name: "Shimonoseki", prefecture: "Yamaguchi" },
    // Shimane
    { name: "Matsue", prefecture: "Shimane" },
    { name: "Izumo", prefecture: "Shimane" },
    // Tottori
    { name: "Tottori", prefecture: "Tottori" },
    // Kagawa
    { name: "Takamatsu", prefecture: "Kagawa" },
    // Ehime
    { name: "Matsuyama", prefecture: "Ehime" },
    // Kochi
    { name: "Kochi", prefecture: "Kochi" },
    // Tokushima
    { name: "Tokushima", prefecture: "Tokushima" },
    // Fukuoka
    { name: "Fukuoka", prefecture: "Fukuoka" },
    { name: "Kitakyushu", prefecture: "Fukuoka" },
    // Kumamoto
    { name: "Kumamoto", prefecture: "Kumamoto" },
    // Nagasaki
    { name: "Nagasaki", prefecture: "Nagasaki" },
    { name: "Sasebo", prefecture: "Nagasaki" },
    // Oita
    { name: "Oita", prefecture: "Oita" },
    // Saga
    { name: "Saga", prefecture: "Saga" },
    { name: "Karagasaki", prefecture: "Saga" },
    // Miyazaki
    { name: "Miyazaki", prefecture: "Miyazaki" },
    // Kagoshima
    { name: "Kagoshima", prefecture: "Kagoshima" },
    // Okinawa
    { name: "Naha", prefecture: "Okinawa" },
    { name: "Okinawa", prefecture: "Okinawa" },
    // Aichi
    { name: "Inuyama", prefecture: "Aichi" },
    // Mie
    { name: "Ise", prefecture: "Mie" },
    { name: "Tsu", prefecture: "Mie" },
    { name: "Kumano", prefecture: "Mie" },
    { name: "Yokkaichi", prefecture: "Mie" },
    // Hiroshima
    { name: "Fukuyama", prefecture: "Hiroshima" },
    { name: "Onomichi", prefecture: "Hiroshima" },
    // Okayama
    { name: "Tsuyama", prefecture: "Okayama" },
    // Tottori
    { name: "Yonago", prefecture: "Tottori" },
    // Yamanashi
    { name: "Fujiyoshida", prefecture: "Yamanashi" },
    // Nagano
    { name: "Karuizawa", prefecture: "Nagano" },
    { name: "Shinano", prefecture: "Nagano" },
    { name: "Iida", prefecture: "Nagano" },
    { name: "Suwa", prefecture: "Nagano" },
    { name: "Ueda", prefecture: "Nagano" },
    // Niigata
    { name: "Joetsu", prefecture: "Niigata" },
    { name: "Sado", prefecture: "Niigata" },
    { name: "Tsubame", prefecture: "Niigata" },
    { name: "Kashiwazaki", prefecture: "Niigata" },
    // Fukushima
    { name: "Aizu", prefecture: "Fukushima" },
    { name: "Iwaki", prefecture: "Fukushima" },
    // Miyagi
    { name: "Ishinomaki", prefecture: "Miyagi" },
    { name: "Shiogama", prefecture: "Miyagi" },
    { name: "Miyagi", prefecture: "Miyagi" },
    { name: "Rifu", prefecture: "Miyagi" },
    // Aomori
    { name: "Hirosaki", prefecture: "Aomori" },
    { name: "Hachinohe", prefecture: "Aomori" },
    { name: "Towada", prefecture: "Aomori" },
    { name: "Kuroishi", prefecture: "Aomori" },
    // Iwate
    { name: "Hanamaki", prefecture: "Iwate" },
    { name: "Kamaishi", prefecture: "Iwate" },
    { name: "Ofunato", prefecture: "Iwate" },
    // Akita
    { name: "Yokote", prefecture: "Akita" },
    { name: "Odate", prefecture: "Akita" },
    { name: "Semboku", prefecture: "Akita" },
    // Yamagata
    { name: "Yonezawa", prefecture: "Yamagata" },
    { name: "Shinjo", prefecture: "Yamagata" },
    { name: "Sakata", prefecture: "Yamagata" },
    { name: "Tsuruoka", prefecture: "Yamagata" },
    { name: "Kaminoyama", prefecture: "Yamagata" },
    // Hokkaido
    { name: "Tomakomai", prefecture: "Hokkaido" },
    { name: "Obihiro", prefecture: "Hokkaido" },
    { name: "Kushiro", prefecture: "Hokkaido" },
    { name: "Furano", prefecture: "Hokkaido" },
    { name: "Shiraoi", prefecture: "Hokkaido" },
    { name: "Muroran", prefecture: "Hokkaido" },
    { name: "Iwamizawa", prefecture: "Hokkaido" },
    { name: "Abashiri", prefecture: "Hokkaido" },
    { name: "Wakkanai", prefecture: "Hokkaido" },
    // Tokyo
    { name: "Hachioji", prefecture: "Tokyo" },
    { name: "Machida", prefecture: "Tokyo" },
    { name: "Chofu", prefecture: "Tokyo" },
    { name: "Fuchu", prefecture: "Tokyo" },
    { name: "Koganei", prefecture: "Tokyo" },
    { name: "Hino", prefecture: "Tokyo" },
    { name: "Tachikawa", prefecture: "Tokyo" },
    { name: "Musashino", prefecture: "Tokyo" },
    { name: "Mitaka", prefecture: "Tokyo" },
    { name: "Ome", prefecture: "Tokyo" },
    { name: "Kunitachi", prefecture: "Tokyo" },
    { name: "Kodaira", prefecture: "Tokyo" },
    { name: "Higashiyamato", prefecture: "Tokyo" },
    { name: "Nishitokyo", prefecture: "Tokyo" },
    { name: "Kokubunji", prefecture: "Tokyo" },
    { name: "Fussa", prefecture: "Tokyo" },
    { name: "Komae", prefecture: "Tokyo" },
    { name: "Inagi", prefecture: "Tokyo" },
    { name: "Tama", prefecture: "Tokyo" },
    { name: "Akishima", prefecture: "Tokyo" },
    { name: "Oshima", prefecture: "Tokyo" },
    { name: "Niijima", prefecture: "Tokyo" },
    { name: "Hachijo", prefecture: "Tokyo" },
    // Aichi
    { name: "Ichinomiya", prefecture: "Aichi" },
    { name: "Seto", prefecture: "Aichi" },
    { name: "Toyokawa", prefecture: "Aichi" },
    { name: "Kasugai", prefecture: "Aichi" },
    { name: "Nishio", prefecture: "Aichi" },
    { name: "Gamagori", prefecture: "Aichi" },
    { name: "Toyohashi", prefecture: "Aichi" },
    // Shizuoka
    { name: "Numazu", prefecture: "Shizuoka" },
    { name: "Fuji", prefecture: "Shizuoka" },
    { name: "Fujinomiya", prefecture: "Shizuoka" },
    { name: "Shimada", prefecture: "Shizuoka" },
    { name: "Kakegawa", prefecture: "Shizuoka" },
    { name: "Fujieda", prefecture: "Shizuoka" },
    { name: "Kikugawa", prefecture: "Shizuoka" },
    { name: "Kosai", prefecture: "Shizuoka" },
    { name: "Izu", prefecture: "Shizuoka" },
    { name: "Atami", prefecture: "Shizuoka" },
    { name: "Itō", prefecture: "Shizuoka" },
    { name: "Shimoda", prefecture: "Shizuoka" },
    { name: "Iwata", prefecture: "Shizuoka" },
    { name: "Yaizu", prefecture: "Shizuoka" },
    // Osaka
    { name: "Higashiosaka", prefecture: "Osaka" },
    { name: "Toyonaka", prefecture: "Osaka" },
    { name: "Suita", prefecture: "Osaka" },
    { name: "Takatsuki", prefecture: "Osaka" },
    { name: "Kishiwada", prefecture: "Osaka" },
    { name: "Izumi", prefecture: "Osaka" },
    { name: "Neyagawa", prefecture: "Osaka" },
    { name: "Kadoma", prefecture: "Osaka" },
    { name: "Moriguchi", prefecture: "Osaka" },
    // Hyogo
    { name: "Nishinomiya", prefecture: "Hyogo" },
    { name: "Akashi", prefecture: "Hyogo" },
    { name: "Kakogawa", prefecture: "Hyogo" },
    { name: "Takarazuka", prefecture: "Hyogo" },
    { name: "Sanda", prefecture: "Hyogo" },
    { name: "Miki", prefecture: "Hyogo" },
    { name: "Takasago", prefecture: "Hyogo" },
    { name: "Nada", prefecture: "Hyogo" },
    { name: "Ashiya", prefecture: "Hyogo" },
    { name: "Awaji", prefecture: "Hyogo" },
    // Kyoto
    { name: "Kameoka", prefecture: "Kyoto" },
    { name: "Maizuru", prefecture: "Kyoto" },
    { name: "Joyo", prefecture: "Kyoto" },
    { name: "Miyazu", prefecture: "Kyoto" },
    { name: "Fukuchiyama", prefecture: "Kyoto" },
    { name: "Nagaokakyo", prefecture: "Kyoto" },
    { name: "Yawata", prefecture: "Kyoto" },
    // Nara
    { name: "Yamatotakada", prefecture: "Nara" },
    { name: "Yamatokoriyama", prefecture: "Nara" },
    { name: "Kashihara", prefecture: "Nara" },
    { name: "Tenri", prefecture: "Nara" },
    { name: "Ikoma", prefecture: "Nara" },
    // Wakayama
    { name: "Tanabe", prefecture: "Wakayama" },
    { name: "Kainan", prefecture: "Wakayama" },
    { name: "Hashimoto", prefecture: "Wakayama" },
    { name: "Shingu", prefecture: "Wakayama" },
    // Shiga
    { name: "Kusatsu", prefecture: "Shiga" },
    { name: "Higashiomi", prefecture: "Shiga" },
    { name: "Maibara", prefecture: "Shiga" },
    // Kagawa
    { name: "Marugame", prefecture: "Kagawa" },
    // Ehime
    { name: "Niihama", prefecture: "Ehime" },
    { name: "Imabari", prefecture: "Ehime" },
    // Yamaguchi
    { name: "Ube", prefecture: "Yamaguchi" },
    { name: "Hagi", prefecture: "Yamaguchi" },
    // Shimane
    { name: "Hamada", prefecture: "Shimane" },
    // Tottori
    { name: "Kurayoshi", prefecture: "Tottori" },
    // Fukuoka
    { name: "Kurume", prefecture: "Fukuoka" },
    { name: "Omuta", prefecture: "Fukuoka" },
    { name: "Iizuka", prefecture: "Fukuoka" },
    { name: "Tagawa", prefecture: "Fukuoka" },
    { name: "Yanagawa", prefecture: "Fukuoka" },
    { name: "Asakura", prefecture: "Fukuoka" },
    { name: "Nogata", prefecture: "Fukuoka" },
    // Kumamoto
    { name: "Yatsushiro", prefecture: "Kumamoto" },
    { name: "Hitoyoshi", prefecture: "Kumamoto" },
    // Nagasaki
    { name: "Isahaya", prefecture: "Nagasaki" },
    { name: "Shimabara", prefecture: "Nagasaki" },
    // Oita
    { name: "Beppu", prefecture: "Oita" },
    { name: "Nakatsu", prefecture: "Oita" },
    // Saga
    { name: "Kashima", prefecture: "Saga" },
    { name: "Tosu", prefecture: "Saga" },
    // Miyazaki
    { name: "Miyakonojo", prefecture: "Miyazaki" },
    { name: "Nobeoka", prefecture: "Miyazaki" },
    // Kagoshima
    { name: "Kanoya", prefecture: "Kagoshima" },
    { name: "Makurazaki", prefecture: "Kagoshima" },
    // Okinawa
    { name: "Ginowan", prefecture: "Okinawa" },
    { name: "Uruma", prefecture: "Okinawa" },
    { name: "Nago", prefecture: "Okinawa" },
    { name: "Itoman", prefecture: "Okinawa" },
    { name: "Miyakojima", prefecture: "Okinawa" },
    { name: "Ishigaki", prefecture: "Okinawa" },
  ]
};
