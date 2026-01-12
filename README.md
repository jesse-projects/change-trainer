# Change Trainer

A retro receipt-themed web app for practicing cash register skills. Built to help my 17-year-old son (and other teens) learn to make change before their first retail job.

**Live Demo:** [apps.jesseprojects.com/changetrainer](https://apps.jesseprojects.com/changetrainer/)

## Features

### Two Training Modes

**Mode 1: Calculate Change**
- Mental math practice with a numeric keypad
- Type the correct change amount
- Instant feedback on answers

**Mode 2: Count Change**
- Hands-on practice counting bills and coins
- Tap denominations to build the correct change
- Visual representation of currency selection

### Progress Tracking

- **XP System**: Earn points for correct answers
- **Streak Tracking**: Build and maintain answer streaks
- **User Accounts**: Optional PocketBase backend for cross-device progress sync
- **Local Storage**: Works without an account - progress saved in browser

### Customization

- **Penny Toggle**: Practice with or without pennies
- **Sound Effects**: Optional audio feedback
- **Responsive Design**: Mobile-first, works great on desktop too

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: [PocketBase](https://pocketbase.io/) (optional - for user accounts)
- **Fonts**: VT323 (retro receipt aesthetic), Courier Prime
- **Analytics**: Self-hosted Umami (privacy-focused)
- **Hosting**: Self-hosted on VPS with Caddy reverse proxy

## Design Philosophy

Built with a retro cash register receipt aesthetic:
- VT323 monospace font for authentic receipt printer feel
- Perforation lines and dashed borders
- Cream paper background with subtle texture
- Green register accents for positive feedback
- Mobile-first responsive design

## Getting Started

### Without Backend (Local Only)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/change-trainer.git
cd change-trainer
```

2. Serve the files with any static server:
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve

# PHP
php -S localhost:8000
```

3. Open `http://localhost:8000` in your browser

Progress will be saved to browser localStorage only.

### With PocketBase Backend

1. Install [PocketBase](https://pocketbase.io/docs/)

2. Create the required collections (see [PocketBase Setup](#pocketbase-setup) below)

3. Update `app.js` with your PocketBase URL:
```javascript
const pb = new PocketBase('http://your-pocketbase-url');
```

4. Deploy and enjoy cross-device progress sync!

## PocketBase Setup

Create two collections in PocketBase:

### `users` Collection (Auth)
- Type: Auth collection
- Fields: username, email, password (built-in)

### `user_stats` Collection
- Type: Base collection
- Fields:
  - `user` (relation to users, required)
  - `total_xp` (number, default 0)
  - `current_streak` (number, default 0)
  - `best_streak` (number, default 0)
  - `problems_solved` (number, default 0)
  - `mode1_correct` (number, default 0)
  - `mode2_correct` (number, default 0)
  - `sound_off` (bool, default false)
  - `penny_off` (bool, default false)
  - `hide_top_total` (bool, default false)
  - `hide_bottom_total` (bool, default false)
  - `mode_2` (bool, default false)

## Project Structure

```
changetrainer/
├── index.html               # Main HTML structure
├── styles.css               # Receipt-themed styling
├── app.js                   # Game logic and PocketBase integration
├── sounds.js                # Sound effect management
├── sounds/                  # Sound effect files (MP3)
│   ├── key-tap.mp3
│   ├── coin-tap.mp3
│   ├── bill-tap.mp3
│   ├── success.mp3
│   ├── error.mp3
│   └── ui-tap.mp3
├── privacy.html             # Privacy policy (for user accounts)
├── mode-switcher-design.html  # Design exploration file
└── README.md
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Uses CSS Grid, Flexbox, and modern ES6+ features

## Privacy

- No third-party tracking or advertising
- Self-hosted analytics (Umami)
- User data encrypted and stored securely
- See [privacy.html](https://apps.jesseprojects.com/changetrainer/privacy.html) for full policy

## Development

This was built as a weekend project to solve a real problem. The code prioritizes:
- **Simplicity** over abstraction
- **Vanilla JS** over frameworks
- **Immediate functionality** over perfection
- **Mobile-first** responsive design

### Sound Files

Sound effects are not included in this repo. Download cash register sounds from [ZapSplat](https://www.zapsplat.com/) or similar and place in the `sounds/` folder.

## Deployment

### Quick Deploy to VPS

```bash
# SCP to server
scp -r ./* user@your-server:/var/www/apps/changetrainer/

# Or use rsync
rsync -avz --exclude 'node_modules' --exclude '.git' ./ user@your-server:/var/www/apps/changetrainer/
```

### Caddy Configuration

```caddy
apps.jesseprojects.com {
    root * /var/www/apps
    file_server

    handle /changetrainer/* {
        root * /var/www/apps/changetrainer
        try_files {path} {path}/ /changetrainer/index.html
    }
}
```

## Contributing

Found a bug or have a feature request? Open an issue or submit a PR!

Potential improvements:
- Add difficulty levels (larger bills, more complex change)
- Timed mode for speed practice
- Leaderboard for competitive practice
- More detailed statistics and progress charts
- PWA support for offline use

## License

MIT License - see LICENSE file for details

## Author

**Jesse** - Solutions Architect & Developer
- Website: [jesseprojects.com](https://apps.jesseprojects.com)
- Email: jesse@jesseprojects.com

## Acknowledgments

- Inspired by the need for practical life skills training
- Built with love for my son and other teens entering the workforce
- Receipt aesthetic inspired by vintage cash registers
- Sound effects from ZapSplat

---

**Need a custom solution built?** I create focused, practical tools to solve workflow problems. [Get in touch](mailto:jesse@jesseprojects.com).
