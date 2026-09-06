<p align="center">
	<img src="assets/banner.png" alt="GitHub Auto Follow Banner" />
</p>

<!-- If `assets/banner.png` is missing, add your banner image to `assets/banner.png` or replace the path above. -->

# GitHub F4F — CLI

Lightweight CLI to follow GitHub users (random or from a specific user's followers/following). It saves a token to `.env` if needed and logs activity to `logs/app.log`.

Install
```bash
npm install
```

Run
```bash
npm start
```

Token
Create a Personal Access Token (classic) with the `user:follow` scope (and `read:user` if offered). Paste it when prompted or add to `.env`:
```
GITHUB_TOKEN=your_personal_access_token_here
```

Usage
- Choose a mode (random or from a user's followers/following).
- Pick pacing to reduce request rate (recommended: Normal or Slow).
- Each follow is shown live in the terminal and recorded to `logs/app.log`.

Responsible use
- Respect GitHub rate limits and terms of service. Use slower pacing for larger runs.

Support / Follow
If you find this tool useful, please follow my main GitHub account: [@rafidahmed870](https://github.com/rafidahmed870).