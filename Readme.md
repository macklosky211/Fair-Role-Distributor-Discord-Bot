# Discord Role Distributor Bot

A Discord bot built with **discord.js** that lets users react to a message to choose preferred roles, then automatically distributes those roles in a fair and weighted way using a custom priority system.

> Note: this bot will work without 6 people, but you'll encounter issues such as roles not being filled with less than 3 people.
> This bot was only designed to work with up to 6 people and will likely break if more than 6 people attempt to use it simultaneously.

---

## Features

- **Reaction-based role preferences**
- **Weighted role distribution**
  - Prioritizes users who have waited longest
  - Balances assignments based on past selections
- **Custom role caps** via command input
- **One-click distribution trigger**
- **Self-cleaning polls** (delete when finished)

---

## How It Works

1. A slash command creates a **poll message**
2. Users react with emojis to indicate role preferences
3. When the trigger emoji is used, the bot:
   - Sorts users using a priority queue (custom linked list)
   - Assigns roles based on:
     - User preferences
     - Time since last selection
     - How often they were selected before
     - Role limits
4. The message is edited to show final role assignments

---

## Roles map

| Emoji | Role     |
|------|----------|
| 🦾   | Tank     |
| 🤡   | Damage   |
| 😍   | Healer   |
| 🤤   | Distribute roles |
| ☑️   | Delete poll |
