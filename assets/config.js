/*
 * Career site settings.
 *
 * API_URL: the Apps Script web app URL (Deploy → Manage deployments → Web app URL, ends in /exec).
 * Until it's set (or if it's unreachable), the page shows FALLBACK_ROLES and points people to email instead.
 */
window.DV_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwe0GPFV3Wwv9kqYkM7hJwFhY3Iv7JD6cu8bB6VknBC7bFc8_bpUKQZq0gsCsOQudgcpA/exec',
  CAREER_EMAIL: 'career@dvsocial.com',
  FALLBACK_ROLES: [
    {
      id: 'R-VE-FT', title: 'Creative Video Editor', level: 'Full time', team: 'Content Studio', location: 'Hyderabad',
      track: 'job', workMode: 'Onsite', duration: 'Permanent', openings: 1, exp: '1–3 years',
      blurb: 'Reels, shorts, cutdowns. Retention you can measure.',
      skills: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'AI video tools', 'Sound design'],
      about: "You'll cut short-form that has to earn its first three seconds. Half client campaigns, half our own network — where the numbers get silly and you get to be much braver.",
      resp: ['Edit a minimum of five short-form videos a day across brands and our own pages', 'Add motion, subtitles and sound that fit the joke', 'Use AI video tools where they speed up the edit without cheapening it', 'Read retention data and change the next edit because of it', 'Work with the designer and writer, not after them'],
      looking: ['A portfolio of social-first work you made or meaningfully contributed to', 'Confident in Premiere Pro, After Effects and DaVinci Resolve', 'Hands-on with AI video tools, and the judgement to know when not to use them', 'Speed without dropping craft. Same-day turnarounds are normal here', 'A feel for humour and timing across Hindi and English internet culture']
    },
    {
      id: 'R-VE-IN', title: 'Creative Video Editor Intern', level: 'Internship', team: 'Content Studio', location: 'Hyderabad',
      track: 'intern', workMode: 'Onsite', duration: '6-month internship', openings: 1, exp: 'Fresher / final year',
      blurb: 'Learn short-form on real brands, not on a course you never finish.',
      skills: ['Premiere Pro', 'CapCut'],
      about: "A paid six-month internship for editors who already make things at home. You'll cut real reels with a senior editor reviewing every export, and a full-time seat is on the table if the work holds up.",
      resp: ['Assist on reel edits, cutdowns and subtitle passes', 'Build a swipe file of formats worth stealing', 'Own your own reels by month two', 'Hit delivery slots — punctuality is non-negotiable here'],
      looking: ['Work you can show, even if it\'s personal or college projects', 'Working knowledge of the core tools for the role', 'Curiosity about trends, memes and what makes people share', 'Availability for a six-month, full-time internship on-site in Hyderabad']
    }
  ]
};
