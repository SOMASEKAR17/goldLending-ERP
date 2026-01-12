@echo off
set NODE_ENV=development

:: Use a mock database URL for development
set DATABASE_URL=postgres://postgres:postgres@localhost:5432/goldlend

:: Start the application
echo Starting Gold Lending application in development mode...
npx tsx server/index.ts