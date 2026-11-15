# Sum & Sprout

A free, browser-based primary-school maths game with interactive pets. No AI service, API key, API charges, database, or server is required.

## Play

- Choose a topic for a five-question round entirely within that topic. “More fractions”, for example, starts another fraction-only round.
- Choose **Starting grade** (Grades 1–6) on the Play screen or in the player menu. New players can choose it when they are added. Grade changes the size and complexity of the numbers, not access to operations. Grade 3 starts whole-number multiplication and division with facts up to 12. All topics are available at every grade.
- In **Decimals** or **Fractions**, tap **+**, **−**, **×**, or **÷** for a round focused on that operation. **Mix** includes all four within five questions. “More decimals/fractions” keeps the chosen operation. The choice also survives refresh and save export/import.
- Decimal division includes decimal dividends and decimal divisors, such as `1.44 ÷ 0.6 = 2.4`, from Grade 3. Earlier starting grades use decimal dividends with whole-number divisors. All generated decimal division answers terminate exactly; no rounding is needed.
- Difficulty adapts separately for each topic and each decimal/fraction operation. **Three consecutive first-try correct answers** step that skill up one level; **two consecutive missed questions** step it down one level. Levels run from 1 to 8, and can drop below the starting grade. These are practice levels, not grade assessments.
- Only the first valid attempt on each question counts toward difficulty. Repeated guesses on the same question do not repeatedly lower the level; correcting a missed question still earns the displayed credits. “Show answer” counts as one missed question if it has not already been assessed. Invalid input does not count. Hints remain available.
- Counters continue across rounds, refreshes, daily challenges, and save transfers. Each player has separate skill levels. Unrelated skills never push each other up or down.
- Choosing a different starting grade resets skill levels and their answer streaks to that starting point. It does not add or remove solved problems, credits, or scores. An unanswered question refreshes immediately; an answered question keeps its original reward, and the next problem uses the chosen grade. Changing the operation follows the same rule.
- Older saves use the previous grade/total-correct setting once to establish a starting point; after that, recent performance controls difficulty. Already displayed questions and rewards are preserved. New players start at the selected grade (or Level 1 before choosing).
- The next question is generated after the previous one is finished, so a level-up takes effect immediately on the next problem. The displayed question and its reward stay unchanged after refresh.
- Correct answers earn 5, 10, or 20 credits according to difficulty. Wrong, invalid, and revealed answers do not increase correct-answer totals or award credits.
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

Run the automated checks with `npm test` (Node.js). Checks cover all arithmetic topics, fraction quality, adaptive increases/decreases, rewards, saved-game migration, daily variation, player separation, and absence of API code in the published files.

## GitHub Pages

Publish the `main` branch from `/ (root)` in Settings → Pages. `.nojekyll` keeps these static assets unchanged. No build or secret is required.

The game runs entirely in each student’s browser. Student progress and downloaded saves are never committed to this repository.
