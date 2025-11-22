# Secure Chat - End-to-End Encrypted Messaging

A secure, peer-to-peer chat application with end-to-end encryption. Share your public key with anyone to establish a secure connection and chat privately.

## Features

- 🔐 **End-to-End Encryption**: Messages are encrypted with RSA-2048 and AES-256
- 🔑 **Shareable Public Keys**: Share your key via QR code, link, or copy/paste
- 🚀 **Easy Key Exchange**: Connect with anyone by sharing public keys
- 💬 **Real-time Messaging**: Secure messaging with encrypted communication
- 🎨 **Modern UI**: Beautiful, responsive interface with dark mode support

## Getting Started

### Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### How It Works

1. **Generate Keys**: Each user generates an RSA key pair automatically
2. **Share Public Key**: Share your public key via QR code, link, or copy/paste
3. **Connect**: The other user inputs your public key (or opens your shareable link)
4. **Establish Connection**: AES key is exchanged securely using RSA encryption
5. **Chat Securely**: All messages are encrypted with AES-256 before sending

## Deployment

Yes, you can deploy this and chat with anyone! See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Deploy - that's it!

Your app will be live and you can share the URL with anyone to chat securely.

## Security

- **RSA-2048**: For key exchange and AES key encryption
- **AES-256-GCM**: For message encryption
- **Client-Side Encryption**: Keys never leave the client (except public keys)
- **No Server Access**: The server cannot read your messages

## Current Limitations

⚠️ **In-Memory Storage**: 
- Data is lost on server restart
- Works best with a single server instance
- For production, consider adding a database (see DEPLOYMENT.md)

## Technology Stack

- **Next.js 16**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Web Crypto API**: Encryption
- **React QR Code**: QR code generation

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [End-to-End Encryption](https://en.wikipedia.org/wiki/End-to-end_encryption)
