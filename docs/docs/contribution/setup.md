# Development Setup Guide

## Installation

## Caddy Setup

### Caddy Prerequisites

- Caddy Server (v2.0 or higher)
- cURL (for testing)

1. Go to the project folder
```
cd packages/caddy/
```
2. Start caddy
```
make watch
```

## Backend Setup
1. Go to the project folder
```
cd packages/platform/api/
```
3. Install packages
```
pnpm install
```
4. Set up your .env file
   
5. Create prisma client if required
```
pnpm prisma generate
```
6. Start your backend on port ```3000```
```
pnpm run start:dev
```

If you are getting unauthorized on frontend, try enabling cors while developing locally in ```packages/platform/api/src/main.ts``` 
```
app.enableCors({
    origin: '*',
})
  ```

## Frontend Setup
Start your frontend on port ```3001```

Follow https://veil.apidocumentation.com/guide/getting-started for detailed guide