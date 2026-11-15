# Sum & Sprout

A free, browser-based primary-school maths game with interactive pets. No AI service, API key, API charges, database, or server is required.

## Play

- Choose a topic for a five-question round entirely within that topic. “More fractions”, for example, starts another fraction-only round.
- Choose **Starting grade** (Grades 1–6) on the Play screen or in the player menu. New players can choose it when they are added. Grade changes the size and complexity of the numbers, not access to operations. Grade 3 starts whole-number multiplication and division with facts up to 12. All topics are available at every grade.
- In **Decimals** or **Fractions**, tap **+**, **−**, **×**, or **÷** for a round focused on that operation. **Mix** includes all four within five questions. “More decimals/fractions” keeps the chosen operation. The choice also survives refresh and save export/import.
- Decimal division includes decimal dividends and decimal divisors, such as `1.44 ÷ 0.6 = 2.4`, from Grade 3. Earlier starting grades use decimal dividends with whole-number divisors. All generated decimal division answers terminate exactly; no rounding is needed.
- For a selected grade, total correct answers unlock **Start** at 0–9, **Stretch** at 10–29, and **Challenge** at 30 or more. Grade 6 also has these further challenge steps. These are broad practice bands, not a formal curriculum or grade assessment.
- Choosing a grade does not add solved problems, credits, or scores. An unanswered question refreshes immediately; an answered question keeps its original reward, and the next problem uses the chosen grade. Changing the operation follows the same rule.
- Existing players who have not chosen a grade keep the previous Easy/Medium/Hard progression until they choose one. Grade settings are per player and are included in save exports.
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

Run the automated checks with `npm test` (Node.js). Checks cover all arithmetic topics, fraction quality, adaptive thresholds, rewards, saved-game migration, daily variation, player separation, and absence of API code in the published files.

## GitHub Pages

Publish the `main` branch from `/ (root)` in Settings → Pages. `.nojekyll` keeps these static assets unchanged. No build or secret is required.

The game runs entirely in each student’s browser. Student progress and downloaded saves are never committed to this repository.
