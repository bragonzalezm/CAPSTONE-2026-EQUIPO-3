import { Router } from 'express';
import * as c from '../controllers/especialidad.controller.js';
const router=Router();
router.get('/',c.listarEspecialidades);
router.get('/:id',c.buscarEspecialidadPorId);
export default router;
