// Worth The Trip — Creator Data
// Each creator (including "WTT" itself) is a plain object.
// Framework for future influencer onboarding.

const WTT_CREATORS = {
  wtt: {
    id: 'wtt',
    name: 'Worth The Trip',
    handle: '@WorthTheTripJapan',
    role: 'Official WTT Guide',
    ja: {
      role: 'WTT公式ガイド',
      bio: '実体験から生まれた日本の旅程をキュレーション。インスピレーションをくれるクリエイターと共に。'
    },
    avatar: 'public/Branding/WTT Logo 3 Circle.png',
    bio: 'Curated Japan travel itineraries, built from real experiences and the creators who inspire us.',
    city: 'Tokyo',
    platforms: ['youtube', 'instagram'],
    followers: '128K',
    youtubeUrl: 'https://www.youtube.com/@WorthTheTripJapan',
    instagramUrl: 'https://instagram.com/worththetrippjapan', // placeholder — will update
    verified: true
  },
  'yuki-eats': {
    id: 'yuki-eats',
    name: 'Yuki Eats',
    handle: '@yukieats',
    role: 'Food YouTuber',
    ja: {
      role: 'グルメYouTuber',
      bio: '大阪を拠点に、行列グルメから深夜ラーメンまで食べ歩く。年間300軒以上を実食レビュー。'
    },
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    bio: 'Osaka-based food hunter — 300+ spots a year, from queue-worthy ramen to midnight yatai.',
    city: 'Osaka',
    platforms: ['youtube', 'instagram'],
    followers: '486K',
    youtubeUrl: 'https://www.youtube.com/@WorthTheTripJapan',
    instagramUrl: 'https://instagram.com/worththetrippjapan',
    verified: true
  },
  'ken-hikes': {
    id: 'ken-hikes',
    name: 'Ken Hikes',
    handle: '@kenhikes',
    role: 'Hiking Streamer',
    ja: {
      role: '登山ストリーマー',
      bio: '日本百名山を踏破中の登山ストリーマー。富士山の夜間登山配信が人気。装備選びも丁寧に解説。'
    },
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80',
    bio: 'Climbing all 100 famous mountains of Japan, live. Fuji night-climb streams and honest gear guides.',
    city: 'Mt Fuji',
    platforms: ['youtube', 'twitch'],
    followers: '124K',
    youtubeUrl: 'https://www.youtube.com/@WorthTheTripJapan',
    twitchUrl: 'https://twitch.tv/',
    verified: true
  },
  'hana-stays': {
    id: 'hana-stays',
    name: 'Hana Stays',
    handle: '@hanastays',
    role: 'Luxury Travel Creator',
    ja: {
      role: 'ラグジュアリー旅クリエイター',
      bio: '高級旅館と温泉を巡る旅クリエイター。貸切風呂と懐石の本音レビューが人気。'
    },
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
    bio: 'Ryokan and onsen hunter — honest reviews of private baths, kaiseki, and slow luxury escapes.',
    city: 'Hakone',
    platforms: ['instagram', 'tiktok'],
    followers: '892K',
    instagramUrl: 'https://instagram.com/worththetrippjapan',
    tiktokUrl: 'https://tiktok.com/',
    verified: true
  }
};

// Future influencer structure (not yet used, for reference):
// {
//   id: 'some-influencer',
//   name: 'Influencer Name',
//   handle: '@youtubehandle',
//   role: 'Featured Creator',
//   avatar: '...',
//   bio: 'Short bio — what makes their guides worth following.',
//   youtubeUrl: 'https://youtube.com/...',
//   instagramUrl: 'https://instagram.com/...',
//   verified: false
// }
