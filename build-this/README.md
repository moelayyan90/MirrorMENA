# BUILD THIS

BUILD THIS turns real Reddit problems into ranked, testable product demand while keeping the experience Reddit-native.

## Core loop

1. Any Redditor can use the **BUILD THIS** post menu action to turn a real, non-NSFW post into a build request.
2. Repeated requests are clustered automatically, including titles written in non-Latin scripts, so repeated pain becomes one stronger demand signal instead of duplicate noise.
3. Community members press **I NEED THIS TOO** to add one demand signal and **I CAN TEST** to join the tester pool.
4. Developers press **I'M BUILDING** to claim a request. Up to three builders may work on the same need.
5. Builders attach Reddit-native proof: a Reddit post URL or a `developers.reddit.com` app page showing the solution. The request moves to **TESTING**.
6. Redditors inspect the proof and report **WORKS** or **NEEDS WORK**. Each account is counted once per request.
7. A builder can mark the solution **SHIPPED** after Reddit-native proof exists.
8. Every request has a **REPORT** action. Five independent reports automatically hide the request from the demand feed.

## Why it exists

Reddit already contains high-signal product demand, but it is fragmented across posts and comments. BUILD THIS creates a structured path from problem → demand → builder → Reddit-native proof → community test → shipped solution.

## Safety and scope

- BUILD THIS is not a payment, bounty, investment, brokerage, or transaction marketplace.
- The app blocks requests matching regulated or restricted categories including gambling, crypto/investment trading, medical diagnosis/treatment, political campaigns, alcohol/nicotine/cannabis, and recreational drugs.
- NSFW source posts are rejected.
- The app does not send users to external apps. Builder proof links must use HTTPS on `reddit.com` or a `*.reddit.com` domain such as `developers.reddit.com`.
- Requests can be reported by users and are automatically hidden after five unique reports.

## Data and privacy

- Uses Devvit Redis inside each installation.
- Stores build-request text, public Reddit source/proof URLs, builder usernames for claimed builds, aggregate counts, and hashed Reddit user IDs to prevent duplicate demand, tester, vote, and report actions.
- Does not store private messages, email addresses, comment bodies, passwords, payment data, or authentication credentials.
- No external API, advertising, payment, analytics, fetch domain, or LLM is used in this version.

## Current scope

This version ranks demand within each installed subreddit. Cross-community global aggregation is intentionally not enabled because Devvit Redis is installation-scoped. A future cross-community layer should use a Reddit-approved shared backend or an officially supported cross-installation capability.

## Moderator usage

Installing the app creates a **BUILD THIS** hub automatically. Install-trigger retries reuse the existing hub instead of creating duplicates. If the stored hub no longer exists, the subreddit menu action recreates it.

## Release

Public App Directory approval: `build-this@0.0.4`.
Default playtest subreddit: `r/answer_debt_dev`.
