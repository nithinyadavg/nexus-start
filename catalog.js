/*
 * Everything Nexus can put on the page. The setup picks from this; fork the repo and add your own.
 * Each site: id, name, url, icon (a logo in icons.js; leave it out to show the name), color (the light on focus).
 * Popular picks follow Similarweb's most-visited sites (Aug 2026), leaving out what doesn't belong on a start page.
 */
window.CATALOG = {
  categories: [
    { id: 'ai', title: 'AI', motif: 'nodes', sites: [
      { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'openai', color: '#10A37F' },
      { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: 'claude', color: '#D97757' },
      { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'google-gemini', color: '#8E75FF' },
      { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', icon: 'perplexity', color: '#20B8CD' },
      { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com', icon: 'microsoft-copilot', color: '#3B82F6' }
    ]},
    { id: 'watch', title: 'Watch', motif: 'ribbons', sites: [
      { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', icon: 'youtube', color: '#FF0033' },
      { id: 'netflix', name: 'Netflix', url: 'https://www.netflix.com', icon: 'netflix', color: '#E50914' },
      { id: 'prime', name: 'Prime Video', url: 'https://www.primevideo.com', icon: 'prime-video', color: '#1A98FF' },
      { id: 'disney', name: 'Disney+', url: 'https://www.disneyplus.com', icon: 'disney-plus', color: '#2F6BFF' },
      { id: 'appletv', name: 'Apple TV', url: 'https://tv.apple.com', icon: 'apple-tv', color: '#D8DCE6' },
      { id: 'max', name: 'Max', url: 'https://www.max.com', icon: 'max', color: '#2E5BFF' },
      { id: 'twitch', name: 'Twitch', url: 'https://www.twitch.tv', icon: 'twitch', color: '#9146FF' },
      { id: 'imdb', name: 'IMDb', url: 'https://www.imdb.com', icon: 'imdb', color: '#F5C518' },
      { id: 'hotstar', name: 'JioHotstar', url: 'https://www.hotstar.com', color: '#1F80E0' }
    ]},
    { id: 'listen', title: 'Listen', motif: 'waves', sites: [
      { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com', icon: 'spotify', color: '#1ED760' },
      { id: 'applemusic', name: 'Apple Music', url: 'https://music.apple.com', icon: 'apple-music', color: '#FA2D48' },
      { id: 'ytmusic', name: 'YouTube Music', url: 'https://music.youtube.com', icon: 'youtube-music', color: '#FF0033' },
      { id: 'soundcloud', name: 'SoundCloud', url: 'https://soundcloud.com', icon: 'soundcloud', color: '#FF5500' },
      { id: 'podcasts', name: 'Podcasts', url: 'https://podcasts.apple.com', icon: 'apple-podcasts', color: '#A052DE' },
      { id: 'audible', name: 'Audible', url: 'https://www.audible.com', icon: 'audible', color: '#F8991C' }
    ]},
    { id: 'social', title: 'Social', motif: 'pulse', sites: [
      { id: 'whatsapp', name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: 'whatsapp', color: '#25D366' },
      { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com', icon: 'instagram', color: '#E1306C' },
      { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com', icon: 'facebook', color: '#1877F2' },
      { id: 'x', name: 'X', url: 'https://x.com', icon: 'x', color: '#E8E8EE' },
      { id: 'reddit', name: 'Reddit', url: 'https://www.reddit.com', icon: 'reddit', color: '#FF4500' },
      { id: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/feed/', icon: 'linkedin', color: '#0A66C2' },
      { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com', icon: 'tiktok', color: '#FE2C55' },
      { id: 'pinterest', name: 'Pinterest', url: 'https://www.pinterest.com', icon: 'pinterest', color: '#E60023' },
      { id: 'threads', name: 'Threads', url: 'https://www.threads.net', icon: 'threads', color: '#E8E8EE' },
      { id: 'discord', name: 'Discord', url: 'https://discord.com/app', icon: 'discord', color: '#5865F2' },
      { id: 'telegram', name: 'Telegram', url: 'https://web.telegram.org', icon: 'telegram', color: '#26A5E4' }
    ]},
    { id: 'work', title: 'Work', motif: 'grid', sites: [
      { id: 'notion', name: 'Notion', url: 'https://www.notion.so', icon: 'notion', color: '#E8E8EE' },
      { id: 'slack', name: 'Slack', url: 'https://app.slack.com', icon: 'slack', color: '#E01E5A' },
      { id: 'zoom', name: 'Zoom', url: 'https://zoom.us', icon: 'zoom', color: '#2D8CFF' },
      { id: 'canva', name: 'Canva', url: 'https://www.canva.com', icon: 'canva', color: '#00C4CC' },
      { id: 'figma', name: 'Figma', url: 'https://www.figma.com', icon: 'figma', color: '#A259FF' },
      { id: 'trello', name: 'Trello', url: 'https://trello.com', icon: 'trello', color: '#0079BF' }
    ]},
    { id: 'build', title: 'Build', motif: 'nodes', sites: [
      { id: 'github', name: 'GitHub', url: 'https://github.com', icon: 'github', color: '#C9D1D9' },
      { id: 'gitlab', name: 'GitLab', url: 'https://gitlab.com', icon: 'gitlab', color: '#FC6D26' },
      { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'stack-overflow', color: '#F58025' },
      { id: 'aws', name: 'AWS Console', url: 'https://console.aws.amazon.com', icon: 'aws', color: '#FF9900' },
      { id: 'vercel', name: 'Vercel', url: 'https://vercel.com/dashboard', icon: 'vercel', color: '#E8E8EE' },
      { id: 'netlify', name: 'Netlify', url: 'https://app.netlify.com', icon: 'netlify', color: '#32E6E2' },
      { id: 'cloudflare', name: 'Cloudflare', url: 'https://dash.cloudflare.com', icon: 'cloudflare', color: '#F38020' },
      { id: 'docker', name: 'Docker Hub', url: 'https://hub.docker.com', icon: 'docker', color: '#2496ED' }
    ]},
    { id: 'learn', title: 'Learn & Read', motif: 'arc', sites: [
      { id: 'wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'wikipedia', color: '#E8E8EE' },
      { id: 'coursera', name: 'Coursera', url: 'https://www.coursera.org', icon: 'coursera', color: '#0056D2' },
      { id: 'khan', name: 'Khan Academy', url: 'https://www.khanacademy.org', icon: 'khan-academy', color: '#14BF96' },
      { id: 'duolingo', name: 'Duolingo', url: 'https://www.duolingo.com', icon: 'duolingo', color: '#58CC02' },
      { id: 'medium', name: 'Medium', url: 'https://medium.com', icon: 'medium', color: '#E8E8EE' },
      { id: 'scholar', name: 'Google Scholar', url: 'https://scholar.google.com', icon: 'google-scholar', color: '#4285F4' },
      { id: 'arxiv', name: 'arXiv', url: 'https://arxiv.org', icon: 'arxiv', color: '#B31B1B' }
    ]},
    { id: 'news', title: 'News', motif: 'spotlight', sites: [
      { id: 'gnews', name: 'Google News', url: 'https://news.google.com', icon: 'google-news', color: '#4285F4' },
      { id: 'bbc', name: 'BBC News', url: 'https://www.bbc.co.uk/news', icon: 'bbc-news', color: '#BB1919' },
      { id: 'guardian', name: 'The Guardian', url: 'https://www.theguardian.com', icon: 'the-guardian', color: '#052962' },
      { id: 'reuters', name: 'Reuters', url: 'https://www.reuters.com', icon: 'reuters', color: '#FF8000' }
    ]},
    { id: 'everyday', title: 'Shop & Travel', motif: 'shimmer', sites: [
      { id: 'amazon', name: 'Amazon', url: 'https://www.amazon.com', icon: 'amazon', color: '#FF9900' },
      { id: 'ebay', name: 'eBay', url: 'https://www.ebay.com', icon: 'ebay', color: '#0064D2' },
      { id: 'maps', name: 'Maps', url: 'https://maps.google.com', icon: 'google-maps', color: '#34A853' },
      { id: 'booking', name: 'Booking.com', url: 'https://www.booking.com', icon: 'bookingdotcom', color: '#2E7CF6' },
      { id: 'airbnb', name: 'Airbnb', url: 'https://www.airbnb.com', icon: 'airbnb', color: '#FF5A5F' },
      { id: 'uber', name: 'Uber', url: 'https://m.uber.com', icon: 'uber', color: '#E8E8EE' },
      { id: 'paypal', name: 'PayPal', url: 'https://www.paypal.com', icon: 'paypal', color: '#009CDE' }
    ]},
    { id: 'cyber', title: 'Cyber', motif: 'pulse', sites: [
      { id: 'htb', name: 'Hack The Box', url: 'https://app.hackthebox.com', icon: 'hack-the-box', color: '#9FEF00' },
      { id: 'thm', name: 'TryHackMe', url: 'https://tryhackme.com', icon: 'tryhackme', color: '#C11111' },
      { id: 'portswigger', name: 'PortSwigger Academy', url: 'https://portswigger.net/web-security', icon: 'portswigger', color: '#FF6633' },
      { id: 'owasp', name: 'OWASP', url: 'https://owasp.org', icon: 'owasp', color: '#E8E8EE' },
      { id: 'virustotal', name: 'VirusTotal', url: 'https://www.virustotal.com', icon: 'virustotal', color: '#394EFF' },
      { id: 'hackerone', name: 'HackerOne', url: 'https://hackerone.com', icon: 'hackerone', color: '#D8DCE6' }
    ]}
  ],

  // One tile that opens a whole family of apps, like the app grid in Google's corner.
  suites: [
    { id: 'google', name: 'Google', icon: 'google', color: '#4285F4', apps: [
      { name: 'Gmail', url: 'https://mail.google.com', icon: 'gmail' },
      { name: 'Drive', url: 'https://drive.google.com', icon: 'google-drive' },
      { name: 'Docs', url: 'https://docs.google.com/document/', icon: 'google-docs' },
      { name: 'Sheets', url: 'https://docs.google.com/spreadsheets/', icon: 'google-sheets' },
      { name: 'Slides', url: 'https://docs.google.com/presentation/', icon: 'google-slides' },
      { name: 'Calendar', url: 'https://calendar.google.com', icon: 'google-calendar' },
      { name: 'Meet', url: 'https://meet.google.com', icon: 'google-meet' },
      { name: 'Photos', url: 'https://photos.google.com', icon: 'google-photos' },
      { name: 'Keep', url: 'https://keep.google.com', icon: 'google-keep' },
      { name: 'Translate', url: 'https://translate.google.com', icon: 'google-translate' },
      { name: 'Maps', url: 'https://maps.google.com', icon: 'google-maps' },
      { name: 'YouTube', url: 'https://www.youtube.com', icon: 'youtube' }
    ]},
    { id: 'microsoft', name: 'Microsoft 365', icon: 'microsoft', color: '#00A4EF', apps: [
      { name: 'Outlook', url: 'https://outlook.office.com/mail/', icon: 'microsoft-outlook' },
      { name: 'Teams', url: 'https://teams.microsoft.com', icon: 'microsoft-teams' },
      { name: 'OneDrive', url: 'https://onedrive.live.com', icon: 'microsoft-onedrive' },
      { name: 'Word', url: 'https://www.office.com/launch/word', icon: 'microsoft-word' },
      { name: 'Excel', url: 'https://www.office.com/launch/excel', icon: 'microsoft-excel' },
      { name: 'PowerPoint', url: 'https://www.office.com/launch/powerpoint', icon: 'microsoft-powerpoint' },
      { name: 'OneNote', url: 'https://www.onenote.com/notebooks', icon: 'microsoft-onenote' },
      { name: 'Copilot', url: 'https://copilot.microsoft.com', icon: 'microsoft-copilot' },
      { name: 'Bing', url: 'https://www.bing.com', icon: 'microsoft-bing' }
    ]},
    { id: 'apple', name: 'iCloud', icon: 'icloud', color: '#3693F3', apps: [
      { name: 'Mail', url: 'https://www.icloud.com/mail', glyph: 'mail', tint: '#3B9BFF' },
      { name: 'Photos', url: 'https://www.icloud.com/photos', glyph: 'image', tint: '#FFB340' },
      { name: 'iCloud Drive', url: 'https://www.icloud.com/iclouddrive', glyph: 'folder-open', tint: '#4FA8FF' },
      { name: 'Notes', url: 'https://www.icloud.com/notes', glyph: 'notebook-pen', tint: '#FFD60A' },
      { name: 'Pages', url: 'https://www.icloud.com/pages', glyph: 'file-text', tint: '#FF9F0A' },
      { name: 'Numbers', url: 'https://www.icloud.com/numbers', glyph: 'sheet', tint: '#30D158' },
      { name: 'Keynote', url: 'https://www.icloud.com/keynote', glyph: 'presentation', tint: '#0A84FF' },
      { name: 'Find My', url: 'https://www.icloud.com/find', glyph: 'map-pin', tint: '#32D74B' },
      { name: 'Apple Music', url: 'https://music.apple.com', icon: 'apple-music' },
      { name: 'Apple TV', url: 'https://tv.apple.com', icon: 'apple-tv' }
    ]}
  ],

  engines: [
    { id: 'google', name: 'Google', icon: 'google', url: 'https://www.google.com/search?q=' },
    { id: 'duckduckgo', name: 'DuckDuckGo', icon: 'duckduckgo', url: 'https://duckduckgo.com/?q=' },
    { id: 'bing', name: 'Bing', icon: 'microsoft-bing', url: 'https://www.bing.com/search?q=' },
    { id: 'brave', name: 'Brave Search', icon: 'brave', url: 'https://search.brave.com/search?q=' },
    { id: 'ecosia', name: 'Ecosia', icon: 'ecosia', url: 'https://www.ecosia.org/search?q=' },
    { id: 'startpage', name: 'Startpage', icon: 'startpage', url: 'https://www.startpage.com/do/search?q=' }
  ],

  bangs: {
    '!yt': 'https://www.youtube.com/results?search_query=',
    '!gh': 'https://github.com/search?q=',
    '!w': 'https://en.wikipedia.org/w/index.php?search=',
    '!m': 'https://www.google.com/maps/search/',
    '!s': 'https://scholar.google.com/scholar?q=',
    '!a': 'https://www.amazon.com/s?k=',
    '!r': 'https://www.reddit.com/search/?q=',
    '!c': 'https://claude.ai/new?q=',
    '!g': 'https://chatgpt.com/?q='
  },

  // "Use the popular picks" in the setup, and what a skipped setup starts with.
  popular: ['youtube', 'netflix', 'spotify', 'chatgpt', 'claude', 'gemini', 'whatsapp', 'instagram', 'reddit', 'x',
    'linkedin', 'wikipedia', 'amazon', 'maps', 'github'],
  popularSuites: ['google', 'microsoft']
};
