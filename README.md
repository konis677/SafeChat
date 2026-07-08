# SafeChat

SafeChat is a privacy-focused, self-hosted messaging platform designed exclusively for one-to-one private conversations. It features true end-to-end encryption, an invite-only pairing system, and a modern UI.

## Features

- **True End-to-End Encryption**: Messages are encrypted in the browser using `TweetNaCl.js` (Curve25519, XSalsa20-Poly1305) and can only be decrypted by the recipient. The server only sees ciphertext.
- **Zero-Knowledge Backend**: Private keys never leave your device. They are encrypted locally using a key derived from your password (PBKDF2) before being stored in `localStorage`.
- **Cross-Device Support**: Securely export your encrypted private key and import it on another device to restore access to your messages.
- **Invite-Only Pairing**: Generate a one-time invite code to establish a secure connection with another user.
- **Real-Time Messaging**: Powered by Socket.io with typing indicators.
- **Modern UI**: A responsive, dark-mode-first interface inspired by Signal and Telegram.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, TailwindCSS v3, TweetNaCl.js, Socket.io-client.
- **Backend**: Node.js, Express, TypeScript, Socket.io, MongoDB (Mongoose), bcrypt, jsonwebtoken.
- **Infrastructure**: Docker & Docker Compose.

## Installation & Deployment (Docker)

The easiest way to run SafeChat is using Docker Compose.

1. Clone the repository or navigate to the project directory:
   ```bash
   cd SafeChat
   ```

2. Start the services:
   ```bash
   docker compose up -d
   ```

3. Access the application:
   - Frontend: `http://localhost:80` (or your server's IP)
   - Backend API: `http://localhost:5000`

### Security Note
In a production environment, you **must** serve SafeChat over HTTPS. The Web Crypto API and secure `localStorage` practices require a secure context (HTTPS) to function correctly on modern browsers outside of `localhost`.

## Development Setup

### Backend
1. `cd backend`
2. `npm install`
3. Create a `.env` file with `PORT=5000`, `MONGODB_URI=mongodb://localhost:27017/safechat`, and `JWT_SECRET=your_secret`
4. Start a local MongoDB instance.
5. `npm run dev` (you may need to add a dev script like `tsx watch src/server.ts`)

### Frontend
1. `cd frontend`
2. `npm install`
3. Create a `.env` file with `VITE_BACKEND_URL=http://localhost:5000`
4. `npm run dev`

## Key Management & Security

- **Registration**: When a user registers, a public/private keypair is generated. Only the public key is sent to the server. The private key is encrypted symmetrically using the user's password and stored in `localStorage`.
- **Login**: When logging in on the same device, the password decrypts the private key stored in `localStorage`.
- **New Devices**: If logging in on a new device, the user must select "Import Key" and provide the JSON string they exported during registration to restore their private key. Without this key, they cannot decrypt any messages.

## License
MIT License
# SafeChat
