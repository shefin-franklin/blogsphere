import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION 💥', err);
  process.exit(1);
});

const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () =>
    console.log(`🚀 BlogSphere API running on port ${PORT} [${process.env.NODE_ENV}]`)
  );

  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION 💥', err);
    server.close(() => process.exit(1));
  });
};

start();
