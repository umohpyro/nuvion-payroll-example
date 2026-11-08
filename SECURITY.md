# Security

This is a sandbox example, not a production system. It only talks to `https://api.nuvion.dev`, refuses any other host, and never moves real money.

## How it handles your keys

- You bring your own Nuvion **sandbox** API key. Never use a live key from the production dashboard.
- The key is sealed with AES-256-GCM in an `httpOnly`, `SameSite=Lax` cookie that expires after eight hours. It is never sent to the browser's JavaScript and never logged.
- Nothing about your Nuvion account is stored on the server or shared between visitors. Disconnect on the Settings page clears the cookie.
- If you deploy your own copy, set `SESSION_SECRET` to a long random value and keep it private. Changing it signs everyone out.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting: open the **Security** tab of this repository and choose **Report a vulnerability**. Do not open a public issue for a security problem.

## Known limits of the example

- Rate limits count in each server instance's memory. Use a shared store such as Upstash before real traffic.
- There are no user accounts. The visitor's own API key is the credential.
- Contractor bank details are stored in Nuvion, not in this app. Use fictional test data only.
