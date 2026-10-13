# Friends and duels

## Friends
1. Open **Table → Friends** and tap **Invite code**. You get a code like `ABCD-2345`. It works once and for 7 days.
2. Your friend opens the same screen, taps **Add friend** and types the code. You are friends straight away (the code is the consent).
3. Tap a friend to see their **public profile**: XP, streak, league and career stage, records, minigame bests and your duel record against each other.
4. **Remove** a friend from the same sheet. It removes the friendship for both of you.

What a friend can see is a fixed list of numbers. They can **never** see your cards, settings, sync address or access code (see `docs/SECURITY.md`).

## Duels (multiplayer minigames)
Games: Sprint, Dash, Plural, Gap and Scramble. (Doppelpass and Kommentator stay single player.)

| Mode | How it works |
|---|---|
| **Live** | Both of you are online. The friend has 2 minutes to accept, then a 4 second countdown starts and you answer the same 10 questions at the same time. The app asks the server about every 1.5 seconds how the other player is doing. |
| **Turn-based** | You play your 10 questions and send the challenge. Your friend plays whenever they open the app, within 24 hours. The result shows when both have played. |

Fairness: both players get the same 10 questions. The server keeps the right answers and counts the time itself, so a changed app cannot cheat. Faster right answers give more points. In turn-based games the opponent's score stays hidden until you have both finished.

Limits (to stay inside the free Cloudflare plan): 30 friends, 8 open challenges, 40 challenges a day, 20 code tries a day.
Live mode is "near live" over normal HTTPS requests. There are no WebSockets and no extra Cloudflare products.
