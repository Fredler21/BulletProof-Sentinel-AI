# Bulletproof Sentinel

<p align="left">
  <img alt="Cybersecurity" src="https://img.shields.io/badge/Cybersecurity-FF1E1E?style=for-the-badge&logo=hackthebox&logoColor=white" />
  <img alt="Honeypot" src="https://img.shields.io/badge/Honeypot-FFB000?style=for-the-badge&logo=cachet&logoColor=black" />
  <img alt="Privacy" src="https://img.shields.io/badge/Privacy-2D2D2D?style=for-the-badge&logo=protonmail&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-4CAF50?style=for-the-badge" />
</p>

A modern cyber defense platform that detects, deceives, and documents attackers in real time.

Stack: **Next.js 15 (App Router), TypeScript, Tailwind CSS, Firebase Auth, Firestore, Vercel.**

## Introducing Bulletproof Sentinel

I am proud to introduce **Bulletproof Sentinel**, a project I designed and built from the ground up. It is a modern security platform that catches attackers in the act, records what they do, and helps the operator respond fast.

### Why I built it myself

Most security tools you can download today have one big problem. Attackers already know how they work. Public honeypots, default firewall rules, and well known scanners all leave small clues that experienced hackers learn to spot in seconds. Once they recognize the tool, they simply walk around it.

I built Bulletproof Sentinel to fix that. Because the code, the decoys, and the detection logic are all custom, attackers cannot rely on the usual tricks to bypass it.

### What it does

* Catches attackers using realistic decoys that look like real production systems.
* Records every interaction, including IP address, browser fingerprint, location, and timing.
* Generates real time alerts and ranks them by severity so the operator focuses on what matters.
* Uses AI to explain incidents in plain language and suggest the right defensive action.
* Provides a live operations console so defenders can watch attacks unfold the moment they begin.

### Who it is for

Security engineers, SOC analysts, indie developers protecting their own apps, and small teams that need strong detection without paying for a heavy enterprise platform.

This is more than a portfolio project. It is a working defensive tool built on a simple idea: the best security tools are the ones attackers have not seen before.

## Screenshots

<p align="center">
  <img src="Live%20Console.png" alt="Live Console" width="100%" />
  <br/><em>Live Console: real time stream of security events.</em>
</p>

**About this view:** The Live Console is the operator’s main screen. Every login attempt, every probe, and every honeypot hit shows up the moment it happens. Each row tells you who is knocking, where they are coming from, what they are trying to reach, and how serious it looks. It is the fastest way to spot an attack while it is still in progress.

---

<p align="center">
  <img src="Honeypot.png" alt="Honeypot Dashboard" width="100%" />
  <br/><em>Honeypot Dashboard: deployed traps and attacker activity.</em>
</p>

**About this view:** The Honeypot Dashboard is the control room for all the decoys. It shows which traps are active, how many times each one has been triggered, and who interacted with them. Anyone who lands here is doing something they should not be doing, so this view gives a very clean signal of real malicious intent.

---

<p align="center">
  <img src="Fake%20Admin%20Panel.png" alt="Fake Admin Panel" width="100%" />
  <br/><em>Fake Admin Panel: a decoy login built to attract attackers.</em>
</p>

**About this view:** This is one of the deployed decoys. It looks like a normal admin login page, but no one can ever sign in. Every attempt is captured, the attacker’s details are recorded, and a high severity alert is created right away. It is a safe and effective way to learn who is targeting the system and how.

---

<p align="center">
  <img src="Fake%20Word-Press%20page.png" alt="Fake WordPress Page" width="100%" />
  <br/><em>Fake WordPress Login: a trap designed to catch automated scanners.</em>
</p>

**About this view:** This decoy looks exactly like a normal WordPress login page. Automated bots scan the internet for these every day, so any visitor here is almost certainly a scanner or an attacker. The trap quietly logs the attempt, fingerprints the visitor, and sends the data to the alert center for review.

## Summary of what is built

The platform currently includes:

* Secure user authentication with session cookies.
* A protected security dashboard with stats, recent events, and active alerts.
* A full event logging system that records every meaningful action.
* A custom honeypot engine with several realistic decoys.
* An alert center where high and critical events can be reviewed and acknowledged.
* AI assisted analysis that helps explain incidents and recommend next steps.
* A live operations console for real time monitoring.

## Status

The platform is actively being developed. New detection features, response actions, and integrations are added on a regular basis.

## Contact

For questions, collaboration, or a demo, reach out through GitHub or LinkedIn.

## License

This project is released under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.
