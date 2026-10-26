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
    followers: '',
    youtubeUrl: 'https://www.youtube.com/@WorthTheTripJapan',
    instagramUrl: 'https://instagram.com/worththetrippjapan', // placeholder — will update
    verified: true
  },
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
