# Friends and duels

## Friends
1. Open **Table → Friends** and tap **Invite code**. You get a code like `ABCD-2345`. It works once and for 7 days.
2. Your friend opens the same screen, taps **Add friend** and types the code. You are friends straight away (the code is the consent).
3. Tap a friend to see their **public profile**: XP, streak, league and career stage, records, minigame bests and your duel record against each other.
4. **Remove** a friend from the same sheet. It removes the friendship for both of you.

What a friend can see is a fixed list of numbers. They can **never** see your cards, settings, sync address or access code (see `docs/SECURITY.md`).

## Duels (turn-based)
Games: Sprint, Dash, Plural, Gap and Scramble. (Doppelpass and Kommentator stay single player.) Since 2.5.0 there is no live mode: you play your 9 questions and send the challenge, your friend plays whenever they open the app within 24 hours. The score is goals (the number of right answers, 0 to 9) and the result looks like a football score. The opponent's score stays hidden until you have both finished.

Fairness: both players get the same 9 questions. The server keeps the right answers and counts the time itself, so a changed app cannot cheat. Time only breaks ties in points.

## Friends tab, streaks and study groups (2.5.0)
* Friends have their own tab. Everyone is in every table and ranking; there is no longer a setting to hide.
* **Friend streak:** days in a row on which both of you practised.
* **Study groups:** up to 8 friends. Start a round (a minigame, 9 questions, 24 hours); everyone plays when they like; the group table gives 3 points for a win, 1 for a draw, and a missed round is a loss. Each group has its own streak: every member practising on the same day.
* **Notifications:** the phone checks `/v1/alerts` about every 15 to 30 minutes (Android decides) for friend requests, match requests, results and group news, plus a local evening reminder before your streak ends and an alert for new app versions. You can switch each off in Settings.

Limits (to stay inside the free Cloudflare plan): 30 friends, 8 open challenges, 40 challenges a day, 20 code tries a day, 5 groups per person, 8 people per group.
