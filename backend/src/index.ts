import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import compression from 'compression';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'OffiqSave Backend' });
});

app.listen(PORT, () => {
    console.log(`[Server] OffiqSave Backend is running on http://localhost:${PORT}`);
});
