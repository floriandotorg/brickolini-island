# Brickolini Island

A web-based rewrite of the 1997 game Lego Island.

**Play it here:** [https://floriandotorg.github.io/brickolini-island/](https://floriandotorg.github.io/brickolini-island/)

![CleanShot 2025-05-12 at 10 39 09](https://github.com/user-attachments/assets/f34c904c-8f54-419c-881a-e61b09a2c01e)

This project aims to recreate the charm of LEGO ISLAND in your browser to make it easily accessible. It will only include minor enhancements and will try to be as close to the original as possible.

*Note: This project is currently in the very early stages of development.*

## Contributing
Contributions are welcome! Anyone who wishes to contribute is encouraged to join the project's [Discord](https://discord.gg/jcX3JE9Az3), where most of the communication happens.

Also, please feel free to open an issue or submit a pull request.

## Features

| Feature                | Status        |
|:-----------------------|:-------------:|
| **Read ISO**           | ✅ Done       |
| **Read SI**            | ✅ Done       |
| **Read WDB**           | 🟡 Mostly Done|
| **Decode Smacker**     | ✅ Done       |
| **Decode Flic**        | ✅ Done       |
| **Play Cutscenes**     | ✅ Done       |
| **Render World**       | 🟡            |
| **Music**              | ⬜            |
| **Pedestrians**        | ⬜            |
| **Missions**           |               |
| &nbsp;&nbsp;Pizza      | ⬜            |
| &nbsp;&nbsp;Ambulance  | ⬜            |
| &nbsp;&nbsp;Police     | ⬜            |
| &nbsp;&nbsp;Jetski     | ⬜            |
| &nbsp;&nbsp;Race       | ⬜            |
| **Brickster Storyline**| ⬜            |

⬜ = Not started &nbsp;&nbsp; 🟡 = In progress &nbsp;&nbsp; ✅ = Done

## Running the project

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the development server:
    ```bash
    npm start
    ```
3.  Open your browser to the specified local address (usually `http://localhost:5173`). 

## Development Tools

### Lefthook

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for managing Git hooks to ensure code quality. Lefthook runs linting and type checking before each commit.

To set up Lefthook:

```bash
npm run lefthook:install
```

Once installed, Lefthook will automatically run pre-commit checks to lint and validate your code when you commit changes.
