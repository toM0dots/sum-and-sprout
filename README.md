# Sum & Sprout

A browser-based primary-school maths game with interactive pets. Maths generation is free and uses no AI service or OpenAI API key. The game stays on GitHub Pages; the optional classroom dashboard uses the existing Sites host for teacher sign-in, shared storage, and automatic progress syncing.

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

## Teacher dashboard and live classes

Open https://sum-and-sprout-math-pets.tom0dota.chatgpt.site/teacher.html and **Sign in with ChatGPT**. Create a class, then copy its student link or share the 10-character class code. Students choose a nickname and join from the game. Students do not need ChatGPT accounts. Each teacher can see only classes created under their own signed-in account. Joining can be closed while existing students keep syncing.

- The dashboard refreshes every 20 seconds and has student/topic filters, a practice-only view, per-student details, and a CSV download.
- Levels match each adaptive skill. Decimals and fractions show a level range and individual operation details.
- Accuracy counts one first valid answer per question; showing an answer counts as a miss. Retries cannot inflate accuracy. Historical topic accuracy cannot be reconstructed and is shown as no data until new questions are answered.
- Suggestions use recent results (last ten answers per skill): at least five answers and under 70% accuracy. A weak decimal/fraction operation is flagged even if that topic's overall accuracy is strong. These are practice suggestions, not formal grades.
- Only a student's nickname, skill levels, and question outcomes are shared after joining. Pets and purchases remain on the device. The class code permits joining, not reading classmates' data.
- Offline play queues progress until the connection returns. Answer IDs make retries idempotent, including after restoring a save. Student save files include the private class connection so transfers keep syncing to the same student; keep those files private.
- A student should continue with their saved game on a new device. Joining again as a different profile creates another roster entry; existing nicknames are protected from accidental reuse.

The shared backend uses the Sites-managed D1 binding `DB`, platform-owned teacher identity, server-side class ownership checks, hashed student connection tokens, and an append-only answer ledger. No student data or connection tokens are committed to GitHub or included in site archives.

## Move progress to another device

Open the player menu (the name at the top), choose **Save a copy**, and keep the downloaded JSON file. On the other device or game link, open the player menu and choose **Load a save**, then select that file. The import adds a new player and keeps all existing players unchanged; duplicate names receive a number. Each file holds one player’s credits, pets, clothes, food, scores, daily history, and current question.

Game progress is saved automatically in this browser; transferring pets and purchases is manual. Joined classroom results sync automatically to the teacher dashboard. Keep a recent copy before clearing browser data or changing devices. Use a nickname.

## Run and check

Serve this folder with any static web server for the student game. Teacher sign-in and classroom syncing use the deployed Sites backend; local static hosting alone does not provide a classroom API.

Run `npm test` with Node.js 24 or newer. Tests exercise the Worker against local in-memory SQLite, including class ownership, syncing, retries, and accuracy. `worker/`, `db/`, and `drizzle/` contain the backend source and migrations for review; GitHub Pages does not execute them.

## GitHub Pages and classroom hosting

Publish the `main` branch from `/ (root)` in Settings → Pages. `.nojekyll` preserves static files. The student game remains at https://tom0dots.github.io/sum-and-sprout/.

The teacher dashboard and shared database run at https://sum-and-sprout-math-pets.tom0dota.chatgpt.site/teacher.html. The GitHub dashboard entry point opens that authenticated host. No OpenAI API or key is used. Backend source lives in the separate Sites checkout and is published through the Sites workflow.

Never commit local environment files, classroom connection tokens, student records, or preview databases. The shared database is not part of this repository.
