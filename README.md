# CertifyHub

CertifyHub is a streamlined certificate hosting platform for grassroots organizers (teachers, non-profit leaders, community builders). Users can generate, host, and share verifiable certificates in bulk, supporting digital proof of participation and achievement.

## Project Structure

```
certify-hub/
├── src/
│   ├── app/         # Next.js app directory (routing, layouts, pages)
│   ├── components/  # Reusable React components (e.g., certificate preview, forms)
│   ├── lib/         # Utility libraries (e.g., supabase client, helpers)
│   └── styles/      # Global and module CSS files
├── public/          # Static assets (certificate templates, favicon, images)
├── .env.local       # Environment variables (should not be committed)
├── README.md        # Project documentation
├── package.json     # Project dependencies and scripts
└── ...              # Other Next.js related files
```

## Directory Descriptions
- **src/app/**: Next.js routing, layouts, and main pages.
- **src/components/**: Reusable UI components.
- **src/lib/**: Utility functions and API clients.
- **src/styles/**: Global and modular styles.
- **public/**: Static files accessible via URL.

## Getting Started
1. Install dependencies: `npm install`
2. Configure environment variables: copy `.env.local.example` to `.env.local` and fill in Supabase info
3. Start development server: `npm run dev`

---

For detailed documentation or feature guides, refer to code comments or contact the maintainer.