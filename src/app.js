const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { serve } = require('inngest/express');

const env = require('./config/env');
const { inngest } = require('./config/inngest');
const healthRoutes = require('./routes/healthRoutes');
const imageRoutes = require('./routes/imageRoutes');
const inngestFunctions = require('./jobs');
const jobRoutes = require('./routes/jobRoutes');
const matchingRoutes = require('./routes/matchingRoutes');
const postRoutes = require('./routes/postRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const usageRoutes = require('./routes/usageRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/', (req, res) => {
  res.redirect('/health');
});

app.use('/health', healthRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts/:id', matchingRoutes);
app.use('/api/suggestions', reviewRoutes);
app.use('/api/usage', usageRoutes);
app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions: inngestFunctions
  })
);

app.use(notFound);
app.use(errorHandler);

module.exports = app;