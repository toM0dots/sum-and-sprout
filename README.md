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
- Players have separate pets, credits, and progress on this browser/device. Original saves remain available as Player 1. Free-play profiles are device-local; students with a pet login also have a private online save.
- Feed, stroke, dress, drag, or play ball with the pet. Pets wander on their own; hunger grows over time and feeding or play improves happiness.

## Teacher dashboard and live classes

Open https://sum-and-sprout-math-pets.tom0dota.chatgpt.site/teacher.html and **Sign in with ChatGPT**. Create a class, then copy its student link or share the 10-character class code. Students choose a nickname and join from the game. Students do not need ChatGPT accounts. Each teacher can see only classes created under their own signed-in account. Joining can be closed while existing students keep syncing.

- The dashboard refreshes every 20 seconds and has student/topic filters, a practice-only view, per-student details, and a CSV download.
- Levels match each adaptive skill. Decimals and fractions show a level range and individual operation details.
- Accuracy counts one first valid answer per question; showing an answer counts as a miss. Retries cannot inflate accuracy. Historical topic accuracy cannot be reconstructed and is shown as no data until new questions are answered.
- Suggestions use recent results (last ten answers per skill): at least five answers and under 70% accuracy. A weak decimal/fraction operation is flagged even if that topic's overall accuracy is strong. These are practice suggestions, not formal grades.
- The teacher sees each student's nickname, skill levels, and question outcomes. Pet logins separately keep a private full game save online. The class code permits joining, not reading classmates' data.
- Offline play queues progress until the connection returns. Answer IDs make retries idempotent, including after restoring a save. Student save files include the private class connection so transfers keep syncing to the same student; keep those files private.
- On a new device, students choose Student sign in with their existing nickname and private pet code. Joining again as a new student creates another roster entry; existing nicknames are protected from accidental reuse.

The shared backend uses the Sites-managed D1 binding `DB`, platform-owned teacher identity, server-side class ownership checks, hashed student connection tokens, and an append-only answer ledger. No student data or connection tokens are committed to GitHub or included in site archives.

## Move progress to another device

Open the player menu (the name at the top), choose **Save a copy**, and keep the downloaded JSON file. On the other device or game link, open the player menu and choose **Load a save**, then select that file. The import adds a new player and keeps all existing players unchanged; duplicate names receive a number. Each file holds one player’s credits, pets, clothes, food, scores, daily history, and current question.

Game progress is saved automatically in this browser. Students with a pet login also save online and can sign in on another device; save files remain an optional backup or transfer method. Wait for ✓ Saved online before switching devices. Use a nickname.

## Run and check

Node.js 24 or newer is needed for the local classroom preview and database tests. Serve this repository root for a static game preview. Classroom and student-login requests use the published Sites backend when served on a public host. The canonical Sites checkout also includes a local database preview; it is not part of this Pages-only distribution.

Run `npm test`. The checks cover generated arithmetic, adaptation, portable saves, classroom ownership, first-try measurement, offline retry deduplication, CORS restrictions, and practice suggestions.

Database schema lives in `db/schema.cjs`; `npm run db:generate` creates immutable Drizzle migrations. Install the pinned development dependencies before generating a new migration. Preview applies only migrations missing from its local database. Sites applies hosted migrations during publication.

## Publication

The existing Sites project serves the game and classroom API through an ESM Worker built from its separate canonical checkout. This Pages repository includes the backend source and migrations for review and tests; GitHub Pages serves only static files. Publish through the Sites source workflow, retaining the same project and public audience. The teacher report API requires authenticated class ownership despite the public game.

GitHub Pages contains the static student game and a dashboard entry point that opens the authenticated Sites dashboard. Both origins share the same classroom backend. Never copy `.dev.vars`, environment files, `.preview/`, or student records into an archive or repository.

## Student pet logins

Students join their class with a nickname, then receive a private **pet code**. On another device they choose **Student sign in** and enter the class code, nickname and pet code. No student email or ChatGPT account is needed. The existing ChatGPT teacher sign-in is unchanged.

A full game save travels with the login: pets, hunger/happiness, food, clothes, credits, grade, adaptive skill levels, statistics, daily seed, daily history and the current question. The student should wait for **✓ Saved online** before switching devices. Local free play and save-file export/import remain available.

- An existing class member chooses **Save pet online** to keep their current local progress. New members get a login card during joining.
- The teacher opens a student in the dashboard and chooses **Reset pet code** if a code is lost. Resetting preserves the last online save and invalidates all previous sessions and enrollment tokens. Unsynced work on an old device must be recovered separately.
- **Sign out on this device** removes that student's local profile, session and recovery copy after their online save completes. Students should sign out on shared devices.
- Pet codes are generated from 16 random base-32 characters (80 bits), shown once, and stored server-side only as SHA-256 hashes. They are not low-entropy, user-chosen passwords. Do not share a student's code publicly.
- Each login receives a 256-bit bearer session, hashed in D1, expiring after 30 days. Student sessions can read/write only that student's game and answer events. Teacher recovery checks class ownership and same-origin requests. Login attempts have a shared database-backed rate limit.
- Cloud saves use optimistic revisions and stable mutation IDs. A failed acknowledgement can be retried without duplicating the save. An older device cannot silently overwrite a newer revision. The student chooses between the two versions, with a local recovery copy retained; offline progress is not automatically merged.
- Teacher accuracy is still based on the deduplicated first-attempt event ledger, not on client credit totals or the game snapshot. Full saves and credentials never appear in the teacher's report or public assets.

The appended `0001_early_ink.sql` migration adds student accounts, sessions and login-rate counters. Existing classes and students are retained. The Worker build packages the same save validator used by the browser; no API key or third-party identity provider is required.
