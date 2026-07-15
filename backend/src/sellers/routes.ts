import { Router } from 'express';
import { sellersController } from './controller';

export const sellersRouter = Router();

sellersRouter.get('/', sellersController.getAll);
sellersRouter.get('/:id', sellersController.getById);
