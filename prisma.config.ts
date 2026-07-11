import dotenv from 'dotenv';

dotenv.config();

export default {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: 'tsx prisma/seed.ts',
  },
};