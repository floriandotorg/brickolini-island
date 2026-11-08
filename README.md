# Brickolini Island

A web-based rewrite of the 1997 game Lego Island.

**Play it here:** [https://floriandotorg.github.io/brickolini-island/](https://floriandotorg.github.io/brickolini-island/)

![CleanShot 2025-05-12 at 10 39 09](https://github.com/user-attachments/assets/f34c904c-8f54-419c-881a-e61b09a2c01e)

This project aims to recreate the charm of LEGO ISLAND in your browser to make it easily accessible. It will only include minor enhancements and will try to be as close to the original as possible.

_Note: This project is currently in the very early stages of development._

## Phone controls

Tap **Play now** to start and enable sound. Portrait and landscape layouts are supported. Phones use the Original graphics preset on first launch; graphics can be changed in Settings.

- Drag the thumbstick to walk, reverse, steer vehicles, or fly. Hold **Turbo** with another finger to accelerate faster.
- Tap objects and dashboard buttons to interact. Drag on the scene to use the original drag controls, including vehicle assembly.
- Use **Skip / Action**, **Back**, **Pause**, and **Settings** in the top toolbar.
- In the registration book, enter your name with the touch keyboard and tap the checkmark in the book. In landscape, use the book's own letter buttons.

The game requires a browser with WebGL 2. Fullscreen is available in Settings when supported by the browser.

## Contributing

Contributions are welcome! Anyone who wishes to contribute is encouraged to join the project's [Discord](https://discord.gg/jcX3JE9Az3), where most of the communication happens.

Also, please feel free to open an issue or submit a pull request.

## Features

| Feature                 |     Status     |
| :---------------------- | :------------: |
| **Read ISO**            |    ✅ Done     |
| **Read SI**             |    ✅ Done     |
| **Read WDB**            | 🟡 Mostly Done |
| **Decode Smacker**      |    ✅ Done     |
| **Decode Flic**         |    ✅ Done     |
| **Play Cutscenes**      |    ✅ Done     |
| **Render World**        |       🟡       |
| **Music**               |       ⬜       |
| **Pedestrians**         |       ⬜       |
| **Missions**            |                |
| &nbsp;&nbsp;Pizza       |       ⬜       |
| &nbsp;&nbsp;Ambulance   |       ⬜       |
| &nbsp;&nbsp;Police      |       ⬜       |
| &nbsp;&nbsp;Jetski      |       ⬜       |
| &nbsp;&nbsp;Race        |       ⬜       |
| **Brickster Storyline** |       ⬜       |

⬜ = Not started &nbsp;&nbsp; 🟡 = In progress &nbsp;&nbsp; ✅ = Done

## Installation

### Prerequisites

Before running this project, you need to extract the game assets from your LEGO Island ISO file:

1. Clone the [lego-island-asset-ripper](https://github.com/floriandotorg/lego-island-asset-ripper) repository:

   ```bash
   git clone https://github.com/floriandotorg/lego-island-asset-ripper.git
   cd lego-island-asset-ripper
   ```

2. Checkout the `hd` branch:

   ```bash
   git checkout hd
   ```

3. Extract the assets from your ISO file:

   ```bash
   python extract.py <ISO_FILE>
   ```

   Replace `<ISO_FILE>` with the path to your LEGO Island ISO file. Full extract takes around 5-10 minutes.

   Example:

   ```bash
   python extract.py lego_island.iso
   ```

4. Copy the `extract` folder to this project's `public` directory and rename it to `org`:

   ```bash
   cp -r extract /path/to/brickolini/public/org
   ```

### Running the Project

1.  Install dependencies:

    ```bash
    npm install
    ```
2.  Run the development server:

    ```bash
    npm start
    ```
3.  Open your browser to the specified local address (usually `http://localhost:5174`).

## Development Tools

### Lefthook

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for managing Git hooks to ensure code quality. Lefthook runs linting and type checking before each commit.

To set up Lefthook:

```bash
npm run lefthook:install
```

Once installed, Lefthook will automatically run pre-commit checks to lint and validate your code when you commit changes.
