# Sum & Sprout

A free, browser-based primary-school maths game with interactive pets. No AI service, API key, API charges, database, or server is required.

## Play

- Choose a topic for a five-question round entirely within that topic. “More fractions”, for example, starts another fraction-only round.
- Difficulty follows each player's total correct answers across all topics: Easy at 0–9, Medium at 10–29, and Hard at 30 or more.
- The next question is generated after the previous one is finished, so a level-up takes effect immediately on the next problem. The displayed question and its reward stay unchanged after refresh.
- Correct answers earn 5, 10, or 20 credits for Easy, Medium, or Hard. Wrong, invalid, and revealed answers do not increase correct-answer totals or award credits.
- Today's challenge gives ten mixed questions, covering all ten topics. Questions differ for each player and local calendar day. Saved challenges resume with the same shown questions and adapt future questions to the student's progress.
- Players have separate pets, credits, and progress on this browser/device. Original saves remain available as Player 1. Profiles are device-local, not school accounts or cross-device sync.
- Feed, stroke, dress, drag, or play ball with the pet. Pets wander on their own; hunger grows over time and feeding or play improves happiness.

## Move progress to another device

Open the player menu (the name at the top), choose **Save a copy**, and keep the downloaded JSON file. On the other device or game link, open the player menu and choose **Load a save**, then select that file. The import adds a new player and keeps all existing players unchanged; duplicate names receive a number. Each file holds one player’s credits, pets, clothes, food, scores, daily history, and current question.

Progress is saved automatically in this browser. Transfers are manual, not cloud sync. Keep a recent copy before clearing browser data or changing devices. Use a nickname.

## Run

Serve this folder using any static web server. For example:

```
python3 -m http.server 5187 --bind 127.0.0.1 --directory .
```

Then open http://127.0.0.1:5187/. No installation or build step is needed.

Run the automated checks with `npm test` (Node.js). Checks cover all arithmetic topics, fraction quality, adaptive thresholds, rewards, saved-game migration, daily variation, player separation, and absence of API code in the published files.

## GitHub Pages

Publish the `main` branch from `/ (root)` in Settings → Pages. `.nojekyll` keeps these static assets unchanged. No build or secret is required.

The game runs entirely in each student’s browser. Student progress and downloaded saves are never committed to this repository.
