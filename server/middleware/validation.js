import { z } from 'zod';

export const validate = (schema, location = 'body') => {
  return (req, res, next) => {
    try {
      let data;

      if (location === 'body') {
        data = req.body;
      } else if (location === 'query') {
        data = req.query;
      } else if (location === 'params') {
        data = req.params;
      } else {
        throw new Error('Invalid validation location');
      } 

      const validated = schema.parse(data);

      // Заменяем данные на валидированные 
      if (location === 'body') {
        req.body = validated;
      } else if (location === 'query') {
        req.query = validated;
      } else if (location === 'params') {
        req.params = validated;
      }

      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues || err.errors;
        const details = issues.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));

        return res.status(400).json({ 
            error: 'Ошибка валидации', 
            details: details 
        });
      }
      
      next(err);
    }
  };
};