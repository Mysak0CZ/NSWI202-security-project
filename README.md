# Encrypted notes

This is a proof of concept of an application containing E2E encrypted data and allowing for login with Passkeys using the PRF extension.

# Limitations

Note, that there are several limitations that make this application a working proof of concept instead of a viable solution:
- The server does not persistently save data - all data about accounts is kept in memory
- There are some missing basic account actions, such as:
  - Changing your password
  - Deleting the account
- There is some missing Passkeys actions, such as:
  - Ability to remove a passkey
  - Reporting valid passkeys to client so client auto-removes invalid ones
- The Client UI sucks

# Testing the simplest way

There is currently no official server deployment.
There is, however, a client deployed at https://mysak0cz.github.io/NSWI202-security-project/ trying to access server at `http://127.0.0.1:8084`.

You can test this client by running local server on docker:
- Clone the repository
- Run `docker compose up` in the root of the repository
- Open the [GitHub Pages deployment](https://mysak0cz.github.io/NSWI202-security-project/)
- Play around with the app!

# Building and development

The application requires the following environment for development:
- Node.js v22+
- Corepack enabled

To start developing first install dependencies using:
```
pnpm install
```

Then you can start both client and server through VSCode lunch profile "Server + Client (Chrome)".
Note, that the Firefox profile works, but mainstream Firefox currently does not support the PRF extension required to use Passkeys.
