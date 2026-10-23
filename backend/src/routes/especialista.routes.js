import { Router } from 'express';
import * as c from '../controllers/especialista.controller.js';
const router=Router();
router.get('/',c.listar);
router.get('/:id/horarios',c.horarios);
export default router;
