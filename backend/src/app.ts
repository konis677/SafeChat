import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import inviteRoutes from './routes/inviteRoutes';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST']
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);

export default app;
