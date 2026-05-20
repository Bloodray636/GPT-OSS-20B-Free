import { logger } from '../lib/logger.js';

export const errorHandler = (err, req, res, next) => {
    logger.error(
        `Unhandled error: ${err.message}`, 
        { stack: err.stack, url: req.url }
    );
    
    res.status(500).json({ error: 'Internal server error' });
};