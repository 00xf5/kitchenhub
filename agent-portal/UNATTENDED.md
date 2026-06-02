KitchenHub Agent — Unattended Mode

Purpose
-------
This document explains how unattended mode works and how to intentionally quit or uninstall the agent when unattended protection is enabled.

How unattended mode works
------------------------
- The agent registers itself to `openAtLogin` (Windows startup) using Electron's `app.setLoginItemSettings`.
- The app hides on close and keeps a tray icon running so that the Supabase presence channel and WebRTC signaling remain available.
- By default the agent prevents quitting to ensure remote access remains available.

Allowing a quit (safe/uninstall)
--------------------------------
To intentionally quit the agent (for maintenance or uninstall), choose one of the following:

1) Create an empty file named `allow_quit` in the agent user data folder.
   - Location (Windows): `%APPDATA%\<YourApp>` — programmatically available as `app.getPath('userData')`.
   - Creating this file enables the tray "Quit" action and allows the app to exit.

2) Set an environment variable before starting the app (useful for testing):

   - `KH_ALLOW_QUIT=1` — app will allow quit operations while this environment variable is present.

3) Use the uninstaller created by the installer (recommended for end users).

Notes for administrators
------------------------
- For enterprise-managed environments, prefer deploying the app as a Windows service or via your device management tools for stronger unattended guarantees.
- The `allow_quit` file mechanism is intentionally simple: it prevents accidental cessation of the background process. Treat it as an administrative control.

Security considerations
----------------------
- Only administrators should create the `allow_quit` file or run the uninstaller.
- Rotate any service credentials and monitor presence channels for unexpected disconnects.

If you want, I can implement a managed uninstall helper that creates the `allow_quit` file automatically before running the uninstaller.