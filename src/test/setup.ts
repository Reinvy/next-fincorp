import "dotenv/config";

// Pure unit tests import modules that instantiate Prisma at module load. They never
// query the database, so a placeholder URL is enough when .env is absent in CI.
process.env.DATABASE_URL ??= "postgresql://fincorp:fincorp@127.0.0.1:5433/fincorp?schema=public";
