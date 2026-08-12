# BUILD THIS

BUILD THIS turns real Reddit problems into ranked, testable product demand.

## Core loop

1. Any Redditor can use the **BUILD THIS** post menu action to turn a real post into a build request.
2. Similar requests are clustered automatically using lightweight title similarity, so repeated pain becomes one stronger demand signal instead of duplicate noise.
3. Community members press **I NEED THIS TOO** to add verified demand and **I CAN TEST** to join the beta pool.
4. Developers press **I'M BUILDING** to claim a request. Up to three builders may work on the same need.
5. Builders attach a public prototype URL. The request moves to **TESTING**.
6. Redditors test the prototype and report **WORKS** or **NEEDS WORK**.
7. A builder can mark the solution **SHIPPED** after a prototype exists.

## Why it exists

Reddit already contains high-signal product demand, but it is fragmented across posts and comments. BUILD THIS creates a structured path from problem → demand → builder → prototype → community test → shipped solution.

## Data and privacy

- Uses Devvit Redis inside each installation.
- Stores build-request text, public source URLs, builder usernames for claimed builds, and hashed Reddit user IDs to prevent duplicate demand/test actions.
- Does not store private messages, email addresses, comment bodies, passwords, payment data, or authentication credentials.
- No external API, advertising, payment, analytics, or LLM is used in this version.

## Current scope

This launch version ranks demand within each installed subreddit. Cross-community global aggregation is intentionally not enabled in v1 because Devvit Redis is installation-scoped; a future global layer should use a Reddit-approved shared backend or an officially supported cross-installation capability.

## Moderator usage

Installing the app creates a **BUILD THIS** hub post automatically. Moderators can create another hub from the subreddit menu if needed.

## Testing target

Default playtest subreddit: `r/answer_debt_dev`.
